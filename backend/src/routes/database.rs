use axum::{Json, Router, routing::get};
use serde_json::{Value, json};

pub fn routes() -> Router {
    Router::new().route("/info", get(info))
}

/// GET /api/database/info - Get database version, size, charset, etc.
async fn info() -> Json<Value> {
    // TODO: Implement database info
    Json(json!({ "message": "Not implemented" }))
}
