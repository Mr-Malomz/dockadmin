use axum::{
    Json, Router,
    extract::State,
    routing::{get, post},
};
use sqlx::any::AnyPoolOptions;

use crate::{
    models::{ConnectRequest, ConnectResponse, DbType, StatusResponse},
    state::{AppState, ConnectionInfo},
};

pub fn routes(state: AppState) -> Router {
    Router::new()
        .route("/connect", post(connect))
        .route("/status", get(status))
        .route("/disconnect", post(disconnect))
        .with_state(state)
}

fn build_connection_string(req: &ConnectRequest) -> String {
    match req.db_type {
        DbType::Postgres => format!(
            "postgres://{}:{}@{}:{}/{}",
            req.username, req.password, req.host, req.port, req.database
        ),
        DbType::Mysql => format!(
            "mysql://{}:{}@{}:{}/{}",
            req.username, req.password, req.host, req.port, req.database
        ),
        DbType::Sqlite => format!("sqlite:{}", req.database),
    }
}

// POST /api/connect
async fn connect(
    State(state): State<AppState>,
    Json(payload): Json<ConnectRequest>,
) -> Json<ConnectResponse> {
    let connection_string = build_connection_string(&payload);
    match AnyPoolOptions::new()
        .max_connections(5)
        .connect(&connection_string)
        .await
    {
        Ok(pool) => {
            let mut state_write = state.write().unwrap();
            state_write.pool = Some(pool);
            state_write.connection_info = Some(ConnectionInfo {
                database: payload.database.clone(),
                db_type: payload.db_type.clone(),
            });
            Json(ConnectResponse {
                success: true,
                database: payload.database,
                db_type: payload.db_type,
            })
        }
        Err(e) => Json(ConnectResponse {
            success: false,
            database: payload.database,
            db_type: payload.db_type,
        }),
    }
}

// GET /api/status
async fn status(State(state): State<AppState>) -> Json<StatusResponse> {
    let state_read = state.read().unwrap();

    match &state_read.connection_info {
        Some(info) => Json(StatusResponse {
            connected: state_read.pool.is_some(),
            database: Some(info.database.clone()),
            db_type: Some(info.db_type.clone()),
        }),
        None => Json(StatusResponse {
            connected: false,
            database: None,
            db_type: None,
        }),
    }
}

// POST /api/disconnect
async fn disconnect(State(state): State<AppState>) -> Json<StatusResponse> {
    let mut state_write = state.write().unwrap();
    state_write.pool = None;
    state_write.connection_info = None;

    Json(StatusResponse {
        connected: false,
        database: None,
        db_type: None,
    })
}
