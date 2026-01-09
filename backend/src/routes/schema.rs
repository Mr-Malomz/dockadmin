use axum::{
    Json, Router,
    extract::{Path, State},
    routing::{delete, get, post, put},
};
use serde_json::{Value, json};
use sqlx::Row;

use crate::{
    models::{ApiResponse, ColumnInfo, DbType, IndexInfo, TableInfo},
    state::AppState,
};

pub fn routes(state: AppState) -> Router {
    Router::new()
        // Read operations
        .route("/tables", get(list_tables))
        .route("/table/{name}", get(get_table))
        .route("/table/{name}/indexes", get(get_indexes))
        .route("/table/{name}/foreign-keys", get(get_foreign_keys))
        // Write operations
        .route("/table", post(create_table))
        .route("/table/{name}", put(alter_table))
        .route("/table/{name}", delete(drop_table))
        .with_state(state)
}

/// GET /api/schema/tables - List all tables
async fn list_tables(State(state): State<AppState>) -> Json<ApiResponse<Value>> {
    // Extract data from state in a block expression so the lock is dropped before await
    let (pool, db_type, db_name) = {
        let state_read = state.read().unwrap();

        let pool = match &state_read.pool {
            Some(p) => p.clone(),
            None => return Json(ApiResponse::error("Not connected to database")),
        };

        let (db_type, db_name) = match &state_read.connection_info {
            Some(info) => (info.db_type.clone(), info.database.clone()),
            None => return Json(ApiResponse::error("No connection info")),
        };

        (pool, db_type, db_name)
    };

    let query = match db_type {
        DbType::Postgres => format!(
            "SELECT table_name as name, table_type, NULL as row_count_estimate 
             FROM information_schema.tables 
             WHERE table_schema = 'public' 
             ORDER BY table_name"
        ),
        DbType::Mysql => {
            let safe_db_name = db_name.replace("'", "''");
            format!(
                "SELECT table_name as name, table_type, table_rows as row_count_estimate 
                 FROM information_schema.tables 
                 WHERE table_schema = '{}' 
                 ORDER BY table_name",
                safe_db_name
            )
        }
        DbType::Sqlite => format!(
            "SELECT name, type as table_type, NULL as row_count_estimate 
             FROM sqlite_schema 
             WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' 
             ORDER BY name"
        ),
    };

    match sqlx::query(&query).fetch_all(&pool).await {
        Ok(rows) => {
            let tables: Vec<TableInfo> = rows
                .into_iter()
                .map(|row| {
                    let raw_type: String = row.try_get("table_type").unwrap_or_default();
                    let table_type = match raw_type.to_lowercase().as_str() {
                        "base table" | "table" => "TABLE".to_string(),
                        "view" => "VIEW".to_string(),
                        _ => raw_type,
                    };

                    let row_count_estimate: Option<i64> =
                        row.try_get("row_count_estimate").unwrap_or_default();

                    TableInfo {
                        name: row.try_get("name").unwrap_or_default(),
                        table_type,
                        row_count_estimate,
                    }
                })
                .collect();

            Json(ApiResponse::success(json!({ "tables": tables })))
        }
        Err(e) => Json(ApiResponse::error(e.to_string())),
    }
}

/// GET /api/schema/table/{name} - Get table structure
async fn get_table(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Json<ApiResponse<Value>> {
    let (pool, db_type, db_name) = {
        let state_read = state.read().unwrap();

        let pool = match &state_read.pool {
            Some(p) => p.clone(),
            None => return Json(ApiResponse::error("Not connected to database")),
        };

        let (db_type, db_name) = match &state_read.connection_info {
            Some(info) => (info.db_type.clone(), info.database.clone()),
            None => return Json(ApiResponse::error("No connection info")),
        };

        (pool, db_type, db_name)
    };

    let query = match db_type {
        DbType::Postgres => format!(
            "SELECT column_name, data_type, is_nullable, column_default,
                CASE WHEN pk.constraint_type = 'PRIMARY KEY' THEN true ELSE false END as is_primary
             FROM information_schema.columns c
             LEFT JOIN (
                 SELECT ku.table_schema, ku.table_name, ku.column_name, tc.constraint_type
                 FROM information_schema.key_column_usage ku
                 JOIN information_schema.table_constraints tc ON ku.constraint_name = tc.constraint_name
                 WHERE tc.constraint_type = 'PRIMARY KEY'
             ) pk ON c.table_schema = pk.table_schema AND c.table_name = pk.table_name AND c.column_name = pk.column_name
             WHERE c.table_schema = 'public' AND c.table_name = '{}'
             ORDER BY c.ordinal_position",
            name
        ),
        DbType::Mysql => format!(
            "SELECT column_name, data_type, is_nullable, column_default,
                CASE WHEN column_key = 'PRI' THEN true ELSE false END as is_primary
             FROM information_schema.columns
             WHERE table_schema = '{}' AND table_name = '{}'
             ORDER BY ordinal_position",
            db_name, name
        ),
        DbType::Sqlite => format!(
            "SELECT name as column_name, type as data_type, 
                CASE WHEN \"notnull\" = 0 THEN 'YES' ELSE 'NO' END as is_nullable, 
                dflt_value as column_default, 
                pk as is_primary
             FROM pragma_table_info('{}')",
            name
        ),
    };

    match sqlx::query(&query).fetch_all(&pool).await {
        Ok(rows) => {
            let columns: Vec<ColumnInfo> = rows
                .into_iter()
                .map(|row| {
                    // Normalize is_primary: Try bool (PG/MySQL), fallback to int relative to 1 (SQLite)
                    let is_primary_key: bool = row
                        .try_get("is_primary")
                        .unwrap_or_else(|_| row.try_get::<i64, _>("is_primary").unwrap_or(0) == 1);

                    // Normalize is_nullable: PG/MySQL/SQLite query returns "YES"/"NO" (String)
                    let is_nullable_str: String = row.try_get("is_nullable").unwrap_or_default();
                    let nullable = is_nullable_str.eq_ignore_ascii_case("YES");

                    ColumnInfo {
                        name: row.try_get("column_name").unwrap_or_default(),
                        data_type: row.try_get("data_type").unwrap_or_default(),
                        nullable,
                        is_primary_key,
                        default_value: row.try_get("column_default").ok(),
                    }
                })
                .collect();

            Json(ApiResponse::success(json!({ "columns": columns })))
        }
        Err(e) => Json(ApiResponse::error(e.to_string())),
    }
}

/// GET /api/schema/table/{name}/indexes - Get table indexes
async fn get_indexes(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Json<ApiResponse<Value>> {
    let (pool, db_type, db_name) = {
        let state_read = state.read().unwrap();

        let pool = match &state_read.pool {
            Some(p) => p.clone(),
            None => return Json(ApiResponse::error("Not connected to database")),
        };

        let (db_type, db_name) = match &state_read.connection_info {
            Some(info) => (info.db_type.clone(), info.database.clone()),
            None => return Json(ApiResponse::error("No connection info")),
        };

        (pool, db_type, db_name)
    };

    // We use an async block to allow using the `?` operator for error handling
    let result: Result<Vec<IndexInfo>, String> = async {
        match db_type {
            DbType::Postgres => {
                let sql = "
                    SELECT
                        i.relname as name,
                        ix.indisunique as is_unique,
                        ix.indisprimary as is_primary,
                        array_to_json(array_agg(a.attname))::text as column_names
                    FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
                    WHERE t.oid = ix.indrelid
                      AND i.oid = ix.indexrelid
                      AND a.attrelid = t.oid
                      AND a.attnum = ANY(ix.indkey)
                      AND t.relkind = 'r'
                      AND t.relname = $1
                    GROUP BY i.relname, ix.indisunique, ix.indisprimary
                ";

                let rows = sqlx::query(sql)
                    .bind(name)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| e.to_string())?;

                let indexes = rows
                    .into_iter()
                    .map(|row| {
                        let columns_json_str: String = row
                            .try_get("column_names")
                            .unwrap_or_else(|_| "[]".to_string());
                        let column_names: Vec<String> =
                            serde_json::from_str(&columns_json_str).unwrap_or_default();

                        IndexInfo {
                            name: row.try_get("name").unwrap_or_default(),
                            is_unique: row.try_get("is_unique").unwrap_or(false),
                            is_primary: row.try_get("is_primary").unwrap_or(false),
                            column_names,
                        }
                    })
                    .collect();

                Ok(indexes)
            }
            DbType::Mysql => {
                let sql = format!(
                    "
                    SELECT 
                        INDEX_NAME as name,
                        NON_UNIQUE = 0 as is_unique,
                        INDEX_NAME = 'PRIMARY' as is_primary,
                        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as column_names
                    FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = '{}' AND TABLE_NAME = '{}'
                    GROUP BY INDEX_NAME, NON_UNIQUE, INDEX_NAME
                ",
                    db_name, name
                );

                let rows = sqlx::query(&sql)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| e.to_string())?;

                let indexes = rows
                    .into_iter()
                    .map(|row| {
                        let columns_str: String = row.try_get("column_names").unwrap_or_default();
                        let column_names: Vec<String> =
                            columns_str.split(',').map(|s| s.to_string()).collect();

                        let is_unique_int: i64 = row.try_get("is_unique").unwrap_or(0);
                        let is_primary_int: i64 = row.try_get("is_primary").unwrap_or(0);

                        IndexInfo {
                            name: row.try_get("name").unwrap_or_default(),
                            is_unique: is_unique_int == 1,
                            is_primary: is_primary_int == 1,
                            column_names,
                        }
                    })
                    .collect();

                Ok(indexes)
            }
            DbType::Sqlite => {
                let index_list =
                    sqlx::query("SELECT name, `unique`, origin FROM pragma_index_list(?)")
                        .bind(&name)
                        .fetch_all(&pool)
                        .await
                        .map_err(|e| e.to_string())?;

                let mut indexes = Vec::new();
                for row in index_list {
                    let index_name: String = row.try_get("name").unwrap_or_default();
                    let is_unique: bool = row.try_get::<i64, _>("unique").unwrap_or(0) == 1;
                    let origin: String = row.try_get("origin").unwrap_or_default();
                    let is_primary = origin == "pk";

                    // Now get columns for this index
                    let cols_sql = format!("SELECT name FROM pragma_index_info('{}')", index_name);
                    let cols_rows = sqlx::query(&cols_sql)
                        .fetch_all(&pool)
                        .await
                        .unwrap_or_default();
                    let column_names: Vec<String> = cols_rows
                        .into_iter()
                        .map(|r| r.try_get("name").unwrap_or_default())
                        .collect();

                    indexes.push(IndexInfo {
                        name: index_name,
                        is_unique,
                        is_primary,
                        column_names,
                    });
                }
                Ok(indexes)
            }
        }
    }
    .await;

    match result {
        Ok(indexes) => Json(ApiResponse::success(json!({ "indexes": indexes }))),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// GET /api/schema/table/{name}/foreign-keys - Get foreign key relationships
async fn get_foreign_keys(Path(name): Path<String>) -> Json<ApiResponse<Value>> {
    // TODO: Implement get foreign keys
    Json(ApiResponse::success(
        json!({ "message": "Not implemented", "table": name }),
    ))
}

/// POST /api/schema/table - Create new table
async fn create_table() -> Json<ApiResponse<Value>> {
    // TODO: Implement create table
    Json(ApiResponse::success(
        json!({ "message": "Not implemented" }),
    ))
}

/// PUT /api/schema/table/{name} - Alter table structure
async fn alter_table(Path(name): Path<String>) -> Json<ApiResponse<Value>> {
    // TODO: Implement alter table
    Json(ApiResponse::success(
        json!({ "message": "Not implemented", "table": name }),
    ))
}

/// DELETE /api/schema/table/{name} - Drop table
async fn drop_table(Path(name): Path<String>) -> Json<ApiResponse<Value>> {
    // TODO: Implement drop table
    Json(ApiResponse::success(
        json!({ "message": "Not implemented", "table": name }),
    ))
}
