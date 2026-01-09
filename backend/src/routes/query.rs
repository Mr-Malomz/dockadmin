use axum::{Json, Router, routing::post};
use serde_json::{Value, json};

pub fn routes() -> Router {
    Router::new().route("/", post(execute_query))
}

/// POST /api/query - Execute raw SQL query
async fn execute_query() -> Json<Value> {
    // TODO: Implement raw SQL execution
    Json(json!({ "message": "Not implemented" }))
}
