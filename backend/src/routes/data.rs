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

    // For MySQL, we need to cast columns to avoid DATETIME type issues with Any driver
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
    let mut placeholders = Vec::new();
    let mut values: Vec<String> = Vec::new();
    for (i, (col, val)) in obj.iter().enumerate() {
        if !is_valid_identifier(col) {
            return Json(ApiResponse::error(&format!("Invalid column name: {}", col)));
        }
        columns.push(quote_identifier(col, &db_type));
        let placeholder = match db_type {
            DbType::Postgres => format!("${}", i + 1),
            _ => "?".to_string(),
        };
        placeholders.push(placeholder);

        let val_str = match val {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => b.to_string(),
            Value::Null => "NULL".to_string(),
            _ => val.to_string(),
        };
        values.push(val_str);
    }
    let table_quoted = quote_identifier(&name, &db_type);
    let sql = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        table_quoted,
        columns.join(", "),
        placeholders.join(", ")
    );

    let mut query = sqlx::query(&sql);
    for val in &values {
        query = query.bind(val);
    }
    match query.execute(&pool).await {
        Ok(result) => Json(ApiResponse::success(json!({
            "message": "Row inserted successfully",
            "rows_affected": result.rows_affected()
        }))),
        Err(e) => Json(ApiResponse::error(e.to_string())),
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

    let obj = match payload.as_object() {
        Some(o) => o,
        None => return Json(ApiResponse::error("Request body must be a JSON object")),
    };
    if obj.is_empty() {
        return Json(ApiResponse::error("No data provided"));
    }

    let mut set_clauses = Vec::new();
    let mut values: Vec<String> = Vec::new();
    for (i, (col, val)) in obj.iter().enumerate() {
        if !is_valid_identifier(col) {
            return Json(ApiResponse::error(&format!("Invalid column name: {}", col)));
        }

        let placeholder = match db_type {
            DbType::Postgres => format!("${}", i + 1),
            _ => "?".to_string(),
        };
        set_clauses.push(format!(
            "{} = {}",
            quote_identifier(col, &db_type),
            placeholder
        ));
        let val_str = match val {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => b.to_string(),
            Value::Null => "NULL".to_string(),
            _ => val.to_string(),
        };
        values.push(val_str);
    }

    let id_placeholder = match db_type {
        DbType::Postgres => format!("${}", values.len() + 1),
        _ => "?".to_string(),
    };
    values.push(id.clone());
    let table_quoted = quote_identifier(&name, &db_type);
    let sql = format!(
        "UPDATE {} SET {} WHERE id = {}",
        table_quoted,
        set_clauses.join(", "),
        id_placeholder
    );
    let mut query = sqlx::query(&sql);
    for val in &values {
        query = query.bind(val);
    }
    match query.execute(&pool).await {
        Ok(result) => Json(ApiResponse::success(json!({
            "message": "Row updated successfully",
            "rows_affected": result.rows_affected()
        }))),
        Err(e) => Json(ApiResponse::error(e.to_string())),
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

    let table_quoted = quote_identifier(&name, &db_type);
    let placeholder = match db_type {
        DbType::Postgres => "$1".to_string(),
        _ => "?".to_string(),
    };
    let sql = format!("DELETE FROM {} WHERE id = {}", table_quoted, placeholder);
    match sqlx::query(&sql).bind(&id).execute(&pool).await {
        Ok(result) => Json(ApiResponse::success(json!({
            "message": "Row deleted successfully",
            "rows_affected": result.rows_affected()
        }))),
        Err(e) => Json(ApiResponse::error(e.to_string())),
    }
}
