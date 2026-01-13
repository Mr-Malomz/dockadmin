use axum::{Json, Router, extract::State, routing::get};
use serde_json::{Value, json};
use sqlx::{Column, Row};

use crate::{
    models::{ApiResponse, DbType},
    state::AppState,
};

pub fn routes(state: AppState) -> Router {
    Router::new().route("/info", get(info)).with_state(state)
}

/// GET /api/database/info - Get database version, size, charset, etc.
async fn info(State(state): State<AppState>) -> Json<ApiResponse<Value>> {
    let (pool, db_type, db_name) = {
        let state_read = state.read().unwrap();
        let pool = match &state_read.pool {
            Some(p) => p.clone(),
            None => return Json(ApiResponse::error("Not connected to database")),
        };
        let (db_type, db_name) = match &state_read.connection_info {
            Some(info) => (info.db_type.clone(), info.database.clone()),
            None => return Json(ApiResponse::error("No connection info")),
        };
        (pool, db_type, db_name)
    };

    // Get database version
    let version_sql = match db_type {
        DbType::Postgres => "SELECT version()",
        DbType::Mysql => "SELECT version()",
        DbType::Sqlite => "SELECT sqlite_version()",
    };
    let version: String = match sqlx::query(version_sql).fetch_one(&pool).await {
        Ok(row) => row.try_get(0).unwrap_or_default(),
        Err(_) => "Unknown".to_string(),
    };

    // Get table count
    let table_count_sql = match db_type {
        DbType::Postgres => {
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
                .to_string()
        }
        DbType::Mysql => format!(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{}'",
            db_name
        ),
        DbType::Sqlite => {
            "SELECT COUNT(*) FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
                .to_string()
        }
    };
    let table_count: i64 = match sqlx::query(&table_count_sql.to_string())
        .fetch_one(&pool)
        .await
    {
        Ok(row) => row.try_get(0).unwrap_or(0),
        Err(_) => 0,
    };

    // Build response
    let db_type_str = match db_type {
        DbType::Postgres => "PostgreSQL",
        DbType::Mysql => "MySQL",
        DbType::Sqlite => "SQLite",
    };

    Json(ApiResponse::success(json!({
        "database": db_name,
        "db_type": db_type_str,
        "version": version,
        "table_count": table_count
    })))
}
