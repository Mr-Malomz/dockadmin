use axum::{Json, Router, routing::get};
use serde_json::{Value, json};

use crate::{routes, state::AppState};

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .nest("/api", routes::api_routes(state))
}

async fn health_check() -> Json<Value> {
    Json(json!({"status": "ok"}))
}
