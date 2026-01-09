pub mod connection;
pub mod data;
pub mod database;
pub mod query;
pub mod schema;

use axum::Router;

use crate::state::AppState;

pub fn api_routes(state: AppState) -> Router {
    Router::new()
        .nest("/", connection::routes(state.clone()))
        .nest("/database", database::routes())
        .nest("/schema", schema::routes(state.clone()))
        .nest("/table", data::routes())
        .nest("/query", query::routes())
}
