use crate::state::create_app_state;

mod models;
mod routes;
mod server;
mod sql_utils;
mod state;

#[tokio::main]
async fn main() {
    sqlx::any::install_default_drivers();

    let app_state = create_app_state();
    let app = server::router(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    println!("Server running on http://0.0.0.0:3000");

    axum::serve(listener, app).await.unwrap();
}
