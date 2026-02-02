use crate::models::DbType;
use sqlx::AnyPool;
use std::time::Instant;

#[derive(Clone)]
#[allow(dead_code)]
pub struct Session {
    pub token: String,
    pub pool: AnyPool,
    pub database: String,
    pub db_type: DbType,
    pub created_at: Instant,
}
