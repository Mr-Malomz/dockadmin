use axum::{
    Json, Router,
    extract::Path,
    routing::{delete, get, post, put},
};
use serde_json::{Value, json};

pub fn routes() -> Router {
    Router::new()
        .route("/{name}", get(read_rows))
        .route("/{name}", post(insert_row))
        .route("/{name}/{id}", put(update_row))
        .route("/{name}/{id}", delete(delete_row))
}

/// GET /api/table/{name}?page=&limit=&sort=&order= - Read rows (paginated)
async fn read_rows(Path(name): Path<String>) -> Json<Value> {
    // TODO: Implement read rows with pagination
    Json(json!({ "message": "Not implemented", "table": name }))
}

/// POST /api/table/{name} - Insert new row
async fn insert_row(Path(name): Path<String>) -> Json<Value> {
    // TODO: Implement insert row
    Json(json!({ "message": "Not implemented", "table": name }))
}

/// PUT /api/table/{name}/{id} - Update row by ID
async fn update_row(Path((name, id)): Path<(String, String)>) -> Json<Value> {
    // TODO: Implement update row
    Json(json!({ "message": "Not implemented", "table": name, "id": id }))
}

/// DELETE /api/table/{name}/{id} - Delete row by ID
async fn delete_row(Path((name, id)): Path<(String, String)>) -> Json<Value> {
    // TODO: Implement delete row
    Json(json!({ "message": "Not implemented", "table": name, "id": id }))
}
