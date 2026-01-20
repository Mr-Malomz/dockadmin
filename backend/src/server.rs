use axum::{Json, Router, http::Method, routing::get};
use serde_json::{Value, json};
use tower_http::add_extension::AddExtensionLayer;
use tower_http::cors::{Any, CorsLayer};

use crate::{auth::SessionExt, routes, state::SessionStore};

pub fn router(session_store: SessionStore) -> Router {
    // Configure CORS for frontend development
    let cors = CorsLayer::new()
        .allow_origin(
            "http://localhost:5173"
                .parse::<axum::http::HeaderValue>()
                .unwrap(),
        )
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health_check))
        .nest("/api", routes::api_routes(session_store.clone()))
        // Add session store to request extensions for AuthSession extractor
        .layer(AddExtensionLayer::new(SessionExt(session_store.clone())))
        .layer(cors)
}

async fn health_check() -> Json<Value> {
    Json(json!({"status": "ok"}))
}
