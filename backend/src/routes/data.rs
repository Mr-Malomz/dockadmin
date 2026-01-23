use axum::{
    Json, Router,
    extract::{Path, Query},
    routing::{delete, get, post, put},
};
use serde_json::{Value, json};
use sqlx::{Column, Row};

use crate::{
    auth::AuthSession,
    models::{ApiResponse, DbType, PaginationParams},
    sql_utils::{is_valid_identifier, quote_identifier},
    state::SessionStore,
};

pub fn routes(session_store: SessionStore) -> Router {
    Router::new()
        .route("/{name}", get(read_rows))
        .route("/{name}", post(insert_row))
        .route("/{name}/{id}", put(update_row))
        .route("/{name}/{id}", delete(delete_row))
        .with_state(session_store)
}

/// GET /api/table/{name}?page=&limit=&sort=&order= - Read rows (paginated)
async fn read_rows(
    AuthSession(session): AuthSession,
    Path(name): Path<String>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<Value>> {
    if !is_valid_identifier(&name) {
        return Json(ApiResponse::error("Invalid table name"));
    }

    let pool = session.pool;
    let db_type = session.db_type.clone();

    let table_quoted = quote_identifier(&name, &db_type);
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.page.unwrap_or(50).min(100);
    let offset = (page - 1) * limit;

    let order_clause = match &params.sort {
        Some(sort_col) if is_valid_identifier(sort_col) => {
            let dir = params.order.as_deref().unwrap_or("ASC");
            let dir = if dir.eq_ignore_ascii_case("DESC") {
                "DESC"
            } else {
                "ASC"
            };
            format!("ORDER BY {} {}", quote_identifier(sort_col, &db_type), dir)
        }
        _ => String::new(),
    };

    // For MySQL and PostgreSQL, we need to cast columns to avoid type issues with Any driver
    let sql = if matches!(db_type, DbType::Mysql) {
        // First get column names
        let db_name = session.database.clone();
        let cols_sql = format!(
            "SELECT CAST(COLUMN_NAME AS CHAR) as col_name FROM information_schema.columns WHERE table_schema = '{}' AND table_name = '{}' ORDER BY ordinal_position",
            db_name.replace("'", "''"),
            name.replace("'", "''")
        );
        let col_rows = sqlx::query(&cols_sql).fetch_all(&pool).await;

        match col_rows {
            Ok(rows) => {
                let column_casts: Vec<String> = rows
                    .iter()
                    .filter_map(|row| {
                        row.try_get::<String, _>("col_name")
                            .ok()
                            .or_else(|| {
                                row.try_get::<Vec<u8>, _>("col_name")
                                    .ok()
                                    .map(|b| String::from_utf8_lossy(&b).to_string())
                            })
                            .map(|col| format!("CAST(`{}` AS CHAR) as `{}`", col, col))
                    })
                    .collect();

                if column_casts.is_empty() {
                    format!(
                        "SELECT * FROM {} {} LIMIT {} OFFSET {}",
                        table_quoted, order_clause, limit, offset
                    )
                } else {
                    format!(
                        "SELECT {} FROM {} {} LIMIT {} OFFSET {}",
                        column_casts.join(", "),
                        table_quoted,
                        order_clause,
                        limit,
                        offset
                    )
                }
            }
            Err(_) => format!(
                "SELECT * FROM {} {} LIMIT {} OFFSET {}",
                table_quoted, order_clause, limit, offset
            ),
        }
    } else if matches!(db_type, DbType::Postgres) {
        // PostgreSQL: cast all columns to text to avoid Any driver type issues
        let cols_sql = format!(
            "SELECT column_name::text as col_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '{}' ORDER BY ordinal_position",
            name.replace("'", "''")
        );
        let col_rows = sqlx::query(&cols_sql).fetch_all(&pool).await;

        match col_rows {
            Ok(rows) => {
                let column_casts: Vec<String> = rows
                    .iter()
                    .filter_map(|row| {
                        row.try_get::<String, _>("col_name")
                            .ok()
                            .map(|col| format!("\"{}\"::text as \"{}\"", col, col))
                    })
                    .collect();

                if column_casts.is_empty() {
                    format!(
                        "SELECT * FROM {} {} LIMIT {} OFFSET {}",
                        table_quoted, order_clause, limit, offset
                    )
                } else {
                    format!(
                        "SELECT {} FROM {} {} LIMIT {} OFFSET {}",
                        column_casts.join(", "),
                        table_quoted,
                        order_clause,
                        limit,
                        offset
                    )
                }
            }
            Err(_) => format!(
                "SELECT * FROM {} {} LIMIT {} OFFSET {}",
                table_quoted, order_clause, limit, offset
            ),
        }
    } else {
        format!(
            "SELECT * FROM {} {} LIMIT {} OFFSET {}",
            table_quoted, order_clause, limit, offset
        )
    };

    match sqlx::query(&sql).fetch_all(&pool).await {
        Ok(rows) => {
            let data: Vec<Value> = rows
                .iter()
                .map(|row| {
                    let mut obj = serde_json::Map::new();
                    for (i, col) in row.columns().iter().enumerate() {
                        let value: Value = row
                            .try_get_raw(i)
                            .ok()
                            .and_then(|_| {
                                // Try common types first
                                if let Ok(s) = row.try_get::<String, _>(i) {
                                    return Some(json!(s));
                                }
                                if let Ok(n) = row.try_get::<i64, _>(i) {
                                    return Some(json!(n));
                                }
                                if let Ok(f) = row.try_get::<f64, _>(i) {
                                    return Some(json!(f));
                                }
                                if let Ok(b) = row.try_get::<bool, _>(i) {
                                    return Some(json!(b));
                                }
                                // For MySQL DATETIME/BLOB types, try bytes and convert to string
                                if let Ok(bytes) = row.try_get::<Vec<u8>, _>(i) {
                                    let s = String::from_utf8_lossy(&bytes).to_string();
                                    return Some(json!(s));
                                }
                                None
                            })
                            .unwrap_or(Value::Null);
                        obj.insert(col.name().to_string(), value);
                    }
                    Value::Object(obj)
                })
                .collect();
            Json(ApiResponse::success(json!({
                "rows": data,
                "page": page,
                "limit": limit
            })))
        }
        Err(e) => Json(ApiResponse::error(e.to_string())),
    }
}

/// POST /api/table/{name} - Insert new row
async fn insert_row(
    AuthSession(session): AuthSession,
    Path(name): Path<String>,
    Json(payload): Json<Value>,
) -> Json<ApiResponse<Value>> {
    if !is_valid_identifier(&name) {
        return Json(ApiResponse::error("Invalid table name"));
    }

    let pool = session.pool;
    let db_type = session.db_type;

    let obj = match payload.as_object() {
        Some(o) => o,
        None => return Json(ApiResponse::error("Request body must be a JSON object")),
    };
    if obj.is_empty() {
        return Json(ApiResponse::error("No data provided"));
    }

    let mut columns = Vec::new();
    let mut sql_values = Vec::new();

    for (col, val) in obj.iter() {
        if !is_valid_identifier(col) {
            return Json(ApiResponse::error(&format!("Invalid column name: {}", col)));
        }
        columns.push(quote_identifier(col, &db_type));

        // Format value as SQL literal
        let sql_val = match val {
            Value::Null => "NULL".to_string(),
            Value::Bool(b) => {
                if *b {
                    "TRUE".to_string()
                } else {
                    "FALSE".to_string()
                }
            }
            Value::Number(n) => n.to_string(),
            Value::String(s) => {
                // Escape single quotes for SQL
                let escaped = s.replace('\'', "''");
                format!("'{}'", escaped)
            }
            _ => {
                let s = val.to_string();
                let escaped = s.replace('\'', "''");
                format!("'{}'", escaped)
            }
        };
        sql_values.push(sql_val);
    }

    let table_quoted = quote_identifier(&name, &db_type);
    let sql = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        table_quoted,
        columns.join(", "),
        sql_values.join(", ")
    );

    println!("DEBUG: insert_row SQL: {}", sql);

    match sqlx::query(&sql).execute(&pool).await {
        Ok(result) => Json(ApiResponse::success(json!({
            "message": "Row inserted successfully",
            "rows_affected": result.rows_affected()
        }))),
        Err(e) => {
            println!("DEBUG: insert_row error: {}", e);
            Json(ApiResponse::error(e.to_string()))
        }
    }
}

/// Helper to get primary key column name
async fn get_primary_key(
    pool: &sqlx::Pool<sqlx::Any>,
    db_type: &DbType,
    table_name: &str,
    db_name: &str,
) -> Result<String, String> {
    match db_type {
        DbType::Postgres => {
            let sql = "
                SELECT ku.column_name::text
                FROM information_schema.key_column_usage ku
                JOIN information_schema.table_constraints tc 
                    ON ku.constraint_name = tc.constraint_name 
                    AND ku.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND tc.table_schema = 'public' 
                    AND tc.table_name = $1
                LIMIT 1
            ";
            let row = sqlx::query(sql)
                .bind(table_name)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?;

            match row {
                Some(r) => r.try_get("column_name").map_err(|e| e.to_string()),
                None => Ok("id".to_string()), // Fallback
            }
        }
        DbType::Mysql => {
            let safe_db_name = db_name.replace("'", "''");
            let safe_table_name = table_name.replace("'", "''");
            let sql = format!(
                "SELECT COLUMN_NAME 
                 FROM information_schema.COLUMNS 
                 WHERE TABLE_SCHEMA = '{}' 
                 AND TABLE_NAME = '{}' 
                 AND COLUMN_KEY = 'PRI' 
                 LIMIT 1",
                safe_db_name, safe_table_name
            );
            let row = sqlx::query(&sql)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?;

            match row {
                Some(r) => r.try_get("COLUMN_NAME").map_err(|e| e.to_string()),
                None => Ok("id".to_string()), // Fallback
            }
        }
        DbType::Sqlite => {
            let info: Vec<(i64, String, String, i64, Option<String>, i64)> =
                sqlx::query_as(&format!(
                    "PRAGMA table_info({})",
                    quote_identifier(table_name, db_type)
                ))
                .fetch_all(pool)
                .await
                .map_err(|e| e.to_string())?;

            for (_, name, _, _, _, pk) in info {
                if pk > 0 {
                    return Ok(name);
                }
            }
            Ok("id".to_string()) // Fallback
        }
    }
}

/// PUT /api/table/{name}/{id} - Update row by ID
async fn update_row(
    AuthSession(session): AuthSession,
    Path((name, id)): Path<(String, String)>,
    Json(payload): Json<Value>,
) -> Json<ApiResponse<Value>> {
    if !is_valid_identifier(&name) {
        return Json(ApiResponse::error("Invalid table name"));
    }

    let pool = session.pool;
    let db_type = session.db_type;
    let db_name = session.database;

    let obj = match payload.as_object() {
        Some(o) => o,
        None => return Json(ApiResponse::error("Request body must be a JSON object")),
    };
    if obj.is_empty() {
        return Json(ApiResponse::error("No data provided"));
    }

    // Get Primary Key column name
    let pk_col = match get_primary_key(&pool, &db_type, &name, &db_name).await {
        Ok(pk) => pk,
        Err(e) => {
            return Json(ApiResponse::error(format!(
                "Failed to determine primary key: {}",
                e
            )));
        }
    };

    let mut set_clauses = Vec::new();
    for (col, val) in obj.iter() {
        if !is_valid_identifier(col) {
            return Json(ApiResponse::error(&format!("Invalid column name: {}", col)));
        }

        // Format value as SQL literal
        let sql_val = match val {
            Value::Null => "NULL".to_string(),
            Value::Bool(b) => {
                if *b {
                    "TRUE".to_string()
                } else {
                    "FALSE".to_string()
                }
            }
            Value::Number(n) => n.to_string(),
            Value::String(s) => {
                let escaped = s.replace('\'', "''");
                format!("'{}'", escaped)
            }
            _ => {
                let s = val.to_string();
                let escaped = s.replace('\'', "''");
                format!("'{}'", escaped)
            }
        };
        set_clauses.push(format!("{} = {}", quote_identifier(col, &db_type), sql_val));
    }

    // Escape ID value
    let id_escaped = id.replace('\'', "''");
    let table_quoted = quote_identifier(&name, &db_type);
    let pk_quoted = quote_identifier(&pk_col, &db_type);
    let sql = format!(
        "UPDATE {} SET {} WHERE {} = '{}'",
        table_quoted,
        set_clauses.join(", "),
        pk_quoted,
        id_escaped
    );

    println!("DEBUG: update_row SQL: {}", sql);

    match sqlx::query(&sql).execute(&pool).await {
        Ok(result) => Json(ApiResponse::success(json!({
            "message": "Row updated successfully",
            "rows_affected": result.rows_affected()
        }))),
        Err(e) => {
            println!("DEBUG: update_row error: {}", e);
            Json(ApiResponse::error(e.to_string()))
        }
    }
}

/// DELETE /api/table/{name}/{id} - Delete row by ID
async fn delete_row(
    AuthSession(session): AuthSession,
    Path((name, id)): Path<(String, String)>,
) -> Json<ApiResponse<Value>> {
    if !is_valid_identifier(&name) {
        return Json(ApiResponse::error("Invalid table name"));
    }

    let pool = session.pool;
    let db_type = session.db_type;
    let db_name = session.database;

    // Get Primary Key column name
    let pk_col = match get_primary_key(&pool, &db_type, &name, &db_name).await {
        Ok(pk) => pk,
        Err(e) => {
            return Json(ApiResponse::error(format!(
                "Failed to determine primary key: {}",
                e
            )));
        }
    };

    let table_quoted = quote_identifier(&name, &db_type);
    let pk_quoted = quote_identifier(&pk_col, &db_type);

    // Note: treating ID as string literal to rely on DB implicit casting (e.g. '1' -> 1)
    // This matches update_row strategy and avoids specific type binding issues with Any driver
    let id_escaped = id.replace('\'', "''");
    let sql = format!(
        "DELETE FROM {} WHERE {} = '{}'",
        table_quoted, pk_quoted, id_escaped
    );

    match sqlx::query(&sql).execute(&pool).await {
        Ok(result) => Json(ApiResponse::success(json!({
            "message": "Row deleted successfully",
            "rows_affected": result.rows_affected()
        }))),
        Err(e) => Json(ApiResponse::error(e.to_string())),
    }
}
