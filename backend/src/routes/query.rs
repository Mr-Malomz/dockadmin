use axum::{Json, Router, routing::post};
use serde_json::{Value, json};
use sqlx::{Column, Row};
use uuid::Uuid;

use crate::{
    auth::AuthSession,
    models::{ApiResponse, DbType, QueryRequest},
    state::SessionStore,
};

pub fn routes(session_store: SessionStore) -> Router {
    Router::new()
        .route("/", post(execute_query))
        .with_state(session_store)
}

// POST /api/query - Execute raw SQL query
async fn execute_query(
    AuthSession(session): AuthSession,
    Json(payload): Json<QueryRequest>,
) -> Json<ApiResponse<Value>> {
    let sql = payload.sql.trim();

    if sql.is_empty() {
        return Json(ApiResponse::error("SQL query cannot be empty"));
    }

    let pool = session.pool;
    let db_type = session.db_type;

    // detect if it's a SELECT query
    let is_select = sql.to_uppercase().trim_start().starts_with("SELECT");

    if is_select {
        let mut final_sql = sql.to_string();

        // Using temp table to inspect columns and cast to CHAR
        // This avoids "Any driver does not support MySql type..." error for DATETIME
        if matches!(db_type, DbType::Mysql) {
            // Usage of temp tables requires the same connection for creation and inspection.
            // Pool execution might switch connections, so we must acquire one explicitly.
            if let Ok(mut conn) = pool.acquire().await {
                let temp_name = format!("temp_{}", Uuid::new_v4().simple());
                let clean_sql = sql.trim_end_matches(|c| c == ';' || char::is_whitespace(c));

                // Create temp table structure (LIMIT 0 to avoid copying data)
                let create_sql = format!(
                    "CREATE TEMPORARY TABLE {} SELECT * FROM ({}) AS sub LIMIT 0",
                    temp_name, clean_sql
                );

                // Inspect using the same connection
                match sqlx::query(&create_sql).execute(&mut *conn).await {
                    Ok(_) => {
                        // Get columns
                        let columns_sql = format!("SHOW COLUMNS FROM {}", temp_name);
                        match sqlx::query(&columns_sql).fetch_all(&mut *conn).await {
                            Ok(rows) => {
                                let casts: Vec<String> = rows
                                    .iter()
                                    .filter_map(|r| {
                                        r.try_get::<String, _>("Field").ok().map(|field| {
                                            format!("CAST(`{}` AS CHAR) AS `{}`", field, field)
                                        })
                                    })
                                    .collect();

                                if !casts.is_empty() {
                                    final_sql = format!(
                                        "SELECT {} FROM ({}) AS sub",
                                        casts.join(", "),
                                        clean_sql
                                    );
                                }
                            }
                            Err(e) => println!("Failed to fetch columns: {}", e),
                        }

                        // Drop temp table
                        let _ =
                            sqlx::query(&format!("DROP TEMPORARY TABLE IF EXISTS {}", temp_name))
                                .execute(&mut *conn)
                                .await;
                    }
                    Err(e) => println!("Failed to create temp table: {}", e),
                }
            } else {
                println!("Failed to acquire connection for temp table check");
            }
        }

        // execute as SELECT and return rows
        match sqlx::query(&final_sql).fetch_all(&pool).await {
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
                                    // Fallback for Blob/bytes (if any remain uncasted)
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
                    "row_count": data.len()
                })))
            }
            Err(e) => Json(ApiResponse::error(e.to_string())),
        }
    } else {
        // Execute as INSERT/UPDATE/DELETE and return rows_affected
        match sqlx::query(sql).execute(&pool).await {
            Ok(result) => Json(ApiResponse::success(json!({
                "message": "Query executed successfully",
                "rows_affected": result.rows_affected()
            }))),
            Err(e) => Json(ApiResponse::error(e.to_string())),
        }
    }
}
