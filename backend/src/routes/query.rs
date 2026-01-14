use axum::{Json, Router, routing::post};
use serde_json::{Value, json};
use sqlx::{Column, Row};

use crate::{
    auth::AuthSession,
    models::{ApiResponse, QueryRequest},
    state::SessionStore,
};

pub fn routes(session_store: SessionStore) -> Router {
    Router::new()
        .route("/", post(execute_query))
        .with_state(session_store)
}

/// POST /api/query - Execute raw SQL query
async fn execute_query(
    AuthSession(session): AuthSession,
    Json(payload): Json<QueryRequest>,
) -> Json<ApiResponse<Value>> {
    let sql = payload.sql.trim();

    if sql.is_empty() {
        return Json(ApiResponse::error("SQL query cannot be empty"));
    }

    let pool = session.pool;

    // detect if it's a SELECT query
    let is_select = sql.to_uppercase().trim_start().starts_with("SELECT");
    if is_select {
        // execute as SELECT and return rows
        match sqlx::query(sql).fetch_all(&pool).await {
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
