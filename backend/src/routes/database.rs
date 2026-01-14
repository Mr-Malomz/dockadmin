use axum::{Json, Router, routing::get};
use serde_json::{Value, json};
use sqlx::Row;

use crate::{
    auth::AuthSession,
    models::{ApiResponse, DbType},
    state::SessionStore,
};

pub fn routes(session_store: SessionStore) -> Router {
    Router::new()
        .route("/info", get(info))
        .with_state(session_store)
}

/// GET /api/database/info - Get database version, size, charset, etc.
async fn info(AuthSession(session): AuthSession) -> Json<ApiResponse<Value>> {
    let pool = session.pool;
    let db_type = session.db_type;
    let db_name = session.database;

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
    let table_count: i64 = match sqlx::query(&table_count_sql).fetch_one(&pool).await {
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
