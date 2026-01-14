use crate::state::create_session_store;

mod models;
mod routes;
mod server;
mod sql_utils;
mod state;
mod auth;

#[tokio::main]
async fn main() {
    sqlx::any::install_default_drivers();

    let session_store = create_session_store();
    let app = server::router(session_store);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    println!("Server running on http://0.0.0.0:3000");

    axum::serve(listener, app).await.unwrap();
}
