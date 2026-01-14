pub mod connection;
pub mod data;
pub mod database;
pub mod query;
pub mod schema;

use axum::Router;

use crate::state::SessionStore;

pub fn api_routes(session_store: SessionStore) -> Router {
    Router::new()
        .merge(connection::routes(session_store.clone()))
        .nest("/database", database::routes(session_store.clone()))
        .nest("/schema", schema::routes(session_store.clone()))
        .nest("/table", data::routes(session_store.clone()))
        .nest("/query", query::routes(session_store.clone()))
}
