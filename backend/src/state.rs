use std::sync::Arc;
use std::sync::RwLock;

use sqlx::AnyPool;

use crate::models::DbType;

#[derive(Clone)]
pub struct ConnectionInfo {
    pub database: String,
    pub db_type: DbType,
}

pub struct AppStateInner {
    pub pool: Option<AnyPool>,
    pub connection_info: Option<ConnectionInfo>,
}

// wrap in Arc for thread safety
pub type AppState = Arc<RwLock<AppStateInner>>;

// constructor function
pub fn create_app_state() -> AppState {
    Arc::new(RwLock::new(AppStateInner {
        pool: None,
        connection_info: None,
    }))
}
