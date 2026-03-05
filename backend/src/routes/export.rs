use axum::{
    Router,
    body::Body,
    extract::{Path, Query},
    http::{StatusCode, header},
    response::Response,
    routing::get,
};
use serde_json::json;
use sqlx::{Column, Row};

use crate::{
    auth::AuthSession,
    models::{DbType, ExportParams},
    sql_utils::{is_valid_identifier, quote_identifier},
    state::SessionStore,
};

pub fn routes(session_store: SessionStore) -> Router {
    Router::new()
        .route("/{name}", get(export_table))
        .with_state(session_store)
}

/// JSON error response builder since the handler returns Response for flexibility sake, not Json<ApiResponse>
fn error_response(status: StatusCode, message: &str) -> Response {
    let body = json!({"success": false, "error": message}).to_string();
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(body))
        .unwrap()
}

/// Helper: escape a value for CSV
fn csv_escape(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

/// GET /api/export/{name}?format=csv - Export table data as CSV file
async fn export_table(
    AuthSession(session): AuthSession,
    Path(name): Path<String>,
    Query(params): Query<ExportParams>,
) -> Response {
    if !is_valid_identifier(&name) {
        return error_response(StatusCode::BAD_REQUEST, "Invalid table name");
    }

    let format = params.format.unwrap_or_else(|| "csv".to_string());
    if format != "csv" {
        return error_response(
            StatusCode::BAD_REQUEST,
            &format!("Unsupported format: '{}'. Supported formats: csv", format),
        );
    }

    let pool = session.pool;
    let db_type = session.db_type;

    let table_quoted = quote_identifier(&name, &db_type);

    let sql = match &db_type {
        DbType::Postgres => {
            let cols_sql = format!(
                "SELECT column_name::text as col_name FROM information_schema.columns \
                 WHERE table_schema = 'public' AND table_name = '{}' \
                 ORDER BY ordinal_position",
                name.replace("'", "''")
            );
            match sqlx::query(&cols_sql).fetch_all(&pool).await {
                Ok(rows) => {
                    let casts: Vec<String> = rows
                        .iter()
                        .filter_map(|row| {
                            row.try_get::<String, _>("col_name")
                                .ok()
                                .map(|col| format!("\"{}\"::text as \"{}\"", col, col))
                        })
                        .collect();
                    if casts.is_empty() {
                        format!("SELECT * FROM {}", table_quoted)
                    } else {
                        format!("SELECT {} FROM {}", casts.join(", "), table_quoted)
                    }
                }
                Err(_) => format!("SELECT * FROM {}", table_quoted),
            }
        }
        DbType::Mysql => {
            let db_name = session.database.clone();
            let cols_sql = format!(
                "SELECT CAST(COLUMN_NAME AS CHAR) as col_name \
                 FROM information_schema.columns \
                 WHERE table_schema = '{}' AND table_name = '{}' \
                 ORDER BY ordinal_position",
                db_name.replace("'", "''"),
                name.replace("'", "''")
            );
            match sqlx::query(&cols_sql).fetch_all(&pool).await {
                Ok(rows) => {
                    let casts: Vec<String> = rows
                        .iter()
                        .filter_map(|row| {
                            row.try_get::<String, _>("col_name")
                                .ok()
                                .or_else(|| {
                                    row.try_get::<Vec<u8>, _>("col_name")
                                        .ok()
                                        .map(|b| String::from_utf8_lossy(&b).to_string())
                                })
                                .map(|col| format!("CAST(`{}` AS CHAR) as `{}`", col, col))
                        })
                        .collect();
                    if casts.is_empty() {
                        format!("SELECT * FROM {}", table_quoted)
                    } else {
                        format!("SELECT {} FROM {}", casts.join(", "), table_quoted)
                    }
                }
                Err(_) => format!("SELECT * FROM {}", table_quoted),
            }
        }
        DbType::Sqlite => {
            let cols_sql = "SELECT name, type FROM pragma_table_info(?)".to_string();
            match sqlx::query(&cols_sql).bind(&name).fetch_all(&pool).await {
                Ok(rows) => {
                    let casts: Vec<String> = rows
                        .iter()
                        .filter_map(|row| {
                            let col_name: String = row.try_get("name").ok()?;
                            let col_type: String = row.try_get("type").ok().unwrap_or_default();
                            let upper = col_type.to_uppercase();
                            if upper.contains("DATETIME")
                                || upper.contains("DATE")
                                || upper.contains("TIMESTAMP")
                                || upper.contains("TIME")
                            {
                                Some(format!(
                                    "CAST(\"{}\" AS TEXT) as \"{}\"",
                                    col_name, col_name
                                ))
                            } else {
                                Some(format!("\"{}\"", col_name))
                            }
                        })
                        .collect();
                    if casts.is_empty() {
                        format!("SELECT * FROM {}", table_quoted)
                    } else {
                        format!("SELECT {} FROM {}", casts.join(", "), table_quoted)
                    }
                }
                Err(_) => format!("SELECT * FROM {}", table_quoted),
            }
        }
    };

    let rows = match sqlx::query(&sql).fetch_all(&pool).await {
        Ok(rows) => rows,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("Failed to fetch data: {}", e),
            );
        }
    };

    let mut csv = String::new();

    if rows.is_empty() {
        csv.push_str("No data found");
    } else {
        let columns: Vec<String> = rows[0]
            .columns()
            .iter()
            .map(|col| col.name().to_string())
            .collect();

        csv.push_str(
            &columns
                .iter()
                .map(|c| csv_escape(c))
                .collect::<Vec<_>>()
                .join(","),
        );
        csv.push('\n');

        // Data rows
        for row in &rows {
            let values: Vec<String> = (0..columns.len())
                .map(|i| {
                    // Try extracting as different types (same approach as data.rs)
                    if let Ok(s) = row.try_get::<String, _>(i) {
                        csv_escape(&s)
                    } else if let Ok(n) = row.try_get::<i64, _>(i) {
                        n.to_string()
                    } else if let Ok(f) = row.try_get::<f64, _>(i) {
                        f.to_string()
                    } else if let Ok(b) = row.try_get::<bool, _>(i) {
                        b.to_string()
                    } else if let Ok(bytes) = row.try_get::<Vec<u8>, _>(i) {
                        csv_escape(&String::from_utf8_lossy(&bytes))
                    } else {
                        String::new()
                    }
                })
                .collect();

            csv.push_str(&values.join(","));
            csv.push('\n');
        }
    }

    // Return the CSV as a file download
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}.csv\"", name),
        )
        .body(Body::from(csv))
        .unwrap()
}
