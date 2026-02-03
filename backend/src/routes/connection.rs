use std::time::Instant;

use axum::{
    Json, Router,
    extract::State,
    http::HeaderMap,
    routing::{get, post},
};
use sqlx::any::AnyPoolOptions;

use crate::{
    auth::AuthSession,
    models::{ApiResponse, ConnectRequest, ConnectResponse, DbType, Session, StatusResponse},
    state::SessionStore,
};

pub fn routes(session_store: SessionStore) -> Router {
    Router::new()
        .route("/connect", post(connect))
        .route("/status", get(status))
        .route("/disconnect", post(disconnect))
        .with_state(session_store)
}

fn build_connection_string(req: &ConnectRequest) -> String {
    let mut host = req.host.clone();

    // If running in docker container, map localhost to host.docker.internal
    if std::env::var("IS_DOCKER").is_ok() && (host == "localhost" || host == "127.0.0.1") {
        host = "host.docker.internal".to_string();
    }

    match req.db_type {
        DbType::Postgres => format!(
            "postgres://{}:{}@{}:{}/{}",
            req.username, req.password, host, req.port, req.database
        ),
        DbType::Mysql => format!(
            "mysql://{}:{}@{}:{}/{}",
            req.username, req.password, host, req.port, req.database
        ),
        DbType::Sqlite => format!("sqlite:{}", req.database),
    }
}

// POST /api/connect
async fn connect(
    State(session_store): State<SessionStore>,
    Json(payload): Json<ConnectRequest>,
) -> Json<ApiResponse<ConnectResponse>> {
    let connection_string = build_connection_string(&payload);
    match AnyPoolOptions::new()
        .max_connections(5)
        .connect(&connection_string)
        .await
    {
        Ok(pool) => {
            let token = uuid::Uuid::new_v4().to_string();
            let session = Session {
                token: token.clone(),
                pool,
                database: payload.database.clone(),
                db_type: payload.db_type.clone(),
                created_at: Instant::now(),
            };
            let mut store = session_store.write().await;
            store.insert(token.clone(), session);

            Json(ApiResponse::success(ConnectResponse {
                token,
                database: payload.database,
                db_type: payload.db_type,
            }))
        }
        Err(e) => Json(ApiResponse::error(e.to_string())),
    }
}

// GET /api/status - Returns session info if authenticated
async fn status(AuthSession(session): AuthSession) -> Json<ApiResponse<StatusResponse>> {
    Json(ApiResponse::success(StatusResponse {
        connected: true,
        database: Some(session.database),
        db_type: Some(session.db_type),
    }))
}

// POST /api/disconnect - Removes session from store
async fn disconnect(
    State(session_store): State<SessionStore>,
    headers: HeaderMap,
) -> Json<ApiResponse<StatusResponse>> {
    // Extract token from Authorization header
    let token = match headers.get("authorization") {
        Some(value) => {
            let val = value.to_str().unwrap_or("");
            val.strip_prefix("Bearer ").unwrap_or("")
        }
        None => "",
    };

    // Remove session from store
    if !token.is_empty() {
        let mut store = session_store.write().await;
        store.remove(token);
    }

    Json(ApiResponse::success(StatusResponse {
        connected: false,
        database: None,
        db_type: None,
    }))
}
