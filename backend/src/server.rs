use axum::{Json, Router, routing::get};
use serde_json::{Value, json};
use tower_http::add_extension::AddExtensionLayer;

use crate::{auth::SessionExt, routes, state::SessionStore};

pub fn router(session_store: SessionStore) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .nest("/api", routes::api_routes(session_store.clone()))
        // Add session store to request extensions for AuthSession extractor
        .layer(AddExtensionLayer::new(SessionExt(session_store)))
}

async fn health_check() -> Json<Value> {
    Json(json!({"status": "ok"}))
}
