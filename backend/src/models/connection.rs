use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DbType {
    Postgres,
    Mysql,
    Sqlite,
}

#[derive(Debug, Deserialize)]
pub struct ConnectRequest {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub db_type: DbType,
}

#[derive(Debug, Serialize)]
pub struct ConnectResponse {
    pub success: bool,
    pub database: String,
    pub db_type: DbType,
}

#[derive(Debug, Serialize)]
pub struct StatusResponse {
    pub connected: bool,
    pub database: Option<String>,
    pub db_type: Option<DbType>,
}
