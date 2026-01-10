use axum::{
    Json, Router,
    extract::{Path, State},
    routing::{delete, get, post, put},
};
use serde_json::{Value, json};
use sqlx::Row;

use crate::{
    models::{
        AlterTableRequest, AlterType, ApiResponse, ColumnInfo, CreateTableRequest, DbType, ForeignKeyInfo, IndexInfo, TableInfo
    },
    sql_utils::{is_valid_identifier, quote_identifier},
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
async fn get_foreign_keys(
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

    let result: Result<Vec<ForeignKeyInfo>, String> = async {
        match db_type {
            DbType::Postgres => {
                let sql = "
                    SELECT
                        tc.constraint_name,
                        kcu.column_name,
                        ccu.table_name AS foreign_table,
                        ccu.column_name AS foreign_column
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_name = $1
                ";
                let rows = sqlx::query(sql)
                    .bind(name)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| e.to_string())?;

                let fks = rows
                    .into_iter()
                    .map(|row| crate::models::ForeignKeyInfo {
                        constraint_name: row.try_get("constraint_name").unwrap_or_default(),
                        column_name: row.try_get("column_name").unwrap_or_default(),
                        foreign_table: row.try_get("foreign_table").unwrap_or_default(),
                        foreign_column: row.try_get("foreign_column").unwrap_or_default(),
                    })
                    .collect();
                Ok(fks)
            }
            DbType::Mysql => {
                let sql = format!(
                    "
                    SELECT 
                        CONSTRAINT_NAME as constraint_name,
                        COLUMN_NAME as column_name,
                        REFERENCED_TABLE_NAME as foreign_table,
                        REFERENCED_COLUMN_NAME as foreign_column
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = '{}' 
                      AND TABLE_NAME = '{}' 
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                ",
                    db_name, name
                );

                let rows = sqlx::query(&sql)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| e.to_string())?;

                let fks = rows
                    .into_iter()
                    .map(|row| crate::models::ForeignKeyInfo {
                        constraint_name: row.try_get("constraint_name").unwrap_or_default(),
                        column_name: row.try_get("column_name").unwrap_or_default(),
                        foreign_table: row.try_get("foreign_table").unwrap_or_default(),
                        foreign_column: row.try_get("foreign_column").unwrap_or_default(),
                    })
                    .collect();
                Ok(fks)
            }
            DbType::Sqlite => {
                let rows =
                    sqlx::query("SELECT id, `from`, `table`, `to` FROM pragma_foreign_key_list(?)")
                        .bind(&name)
                        .fetch_all(&pool)
                        .await
                        .map_err(|e| e.to_string())?;

                let fks = rows
                    .into_iter()
                    .map(|row| {
                        let id: i64 = row.try_get("id").unwrap_or(0);
                        crate::models::ForeignKeyInfo {
                            constraint_name: format!("fk_{}", id), // SQLite doesn't always name FKs explicitly in this list
                            column_name: row.try_get("from").unwrap_or_default(),
                            foreign_table: row.try_get("table").unwrap_or_default(),
                            foreign_column: row.try_get("to").unwrap_or_default(),
                        }
                    })
                    .collect();
                Ok(fks)
            }
        }
    }
    .await;

    match result {
        Ok(fks) => Json(ApiResponse::success(json!({ "foreign_keys": fks }))),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

/// POST /api/schema/table - Create new table
async fn create_table(
    State(state): State<AppState>,
    Json(payload): Json<CreateTableRequest>,
) -> Json<ApiResponse<Value>> {
    if !is_valid_identifier(&payload.name) {
        return Json(ApiResponse::error("Invalid table name"));
    }

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

    let mut column_defs = Vec::new();
    for col in &payload.columns {
        if !is_valid_identifier(&col.name) {
            return Json(ApiResponse::error(&format!(
                "Invalid column name: {}",
                col.name
            )));
        }
        let name_quoted = quote_identifier(&col.name, &db_type);
        // map simplified types to specific DB types
        let data_type = match col.data_type.to_uppercase().as_str() {
            "TEXT" | "STRING" => "TEXT",
            "INT" | "INTEGER" | "NUMBER" => "INTEGER",
            "BOOL" | "BOOLEAN" => match db_type {
                DbType::Postgres => "BOOLEAN",
                _ => "INTEGER", // MySQL/SQLite use 0/1 usually
            },
            "DATETIME" => match db_type {
                DbType::Postgres => "TIMESTAMP",
                _ => "DATETIME",
            },
            _ => "TEXT", // Fallback
        };
        let nullable = if col.nullable { "" } else { "NOT NULL" };
        let primary = if col.is_primary_key {
            // Note: SQLite uses "INTEGER PRIMARY KEY AUTOINCREMENT" explicitly for auto-ids
            "PRIMARY KEY"
        } else {
            ""
        };
        column_defs.push(format!(
            "{} {} {} {}",
            name_quoted, data_type, nullable, primary
        ));
    }

    // construct SQL
    let table_name_quoted = quote_identifier(&payload.name, &db_type);
    let sql = format!(
        "CREATE TABLE {} ({})",
        table_name_quoted,
        column_defs.join(", ")
    );

    // execute the query
    match sqlx::query(&sql).execute(&pool).await {
        Ok(_) => Json(ApiResponse::success(json!({
            "message": "Table created successfully",
            "table": payload.name
        }))),
        Err(e) => Json(ApiResponse::error(e.to_string())),
    }
}

/// PUT /api/schema/table/{name} - Alter table structure
async fn alter_table(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(payload): Json<AlterTableRequest>,
) -> Json<ApiResponse<Value>> {
    if !is_valid_identifier(&name) {
        return Json(ApiResponse::error("Invalid table name"));
    }

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

    let table_name_quoted = quote_identifier(&name, &db_type);
    let sql = match payload.alter_type {
        AlterType::RenameTable => {
            let new_name = match payload.new_name {
                Some(n) => n,
                None => return Json(ApiResponse::error("New name required for Rename Table")),
            };
            if !is_valid_identifier(&new_name) {
                return Json(ApiResponse::error("Invalid new table name"));
            }
            let new_name_quoted = quote_identifier(&new_name, &db_type);
            format!(
                "ALTER TABLE {} RENAME TO {}",
                table_name_quoted, new_name_quoted
            )
        }
        AlterType::AddColumn => {
            let col_def = match payload.column_definition {
                Some(c) => c,
                None => return Json(ApiResponse::error("Column definition required for Add Column")),
            };
            if !is_valid_identifier(&col_def.name) {
                return Json(ApiResponse::error("Invalid column name"));
            }
            let name_quoted = quote_identifier(&col_def.name, &db_type);
            
            // Re-using type mapping logic 
            let data_type = match col_def.data_type.to_uppercase().as_str() {
                "TEXT" | "STRING" => "TEXT",
                "INT" | "INTEGER" | "NUMBER" => "INTEGER",
                "BOOL" | "BOOLEAN" => match db_type {
                    DbType::Postgres => "BOOLEAN",
                    _ => "INTEGER",
                },
                "DATETIME" => match db_type {
                    DbType::Postgres => "TIMESTAMP",
                    _ => "DATETIME",
                },
                _ => "TEXT",
            };
            
            let nullable = if col_def.nullable { "" } else { "NOT NULL" };
            format!(
                "ALTER TABLE {} ADD COLUMN {} {} {}",
                table_name_quoted, name_quoted, data_type, nullable
            )
        }
        AlterType::DropColumn => {
            let col_name = match payload.column_name {
                Some(c) => c,
                None => return Json(ApiResponse::error("Column name required for Drop Column")),
            };
            if !is_valid_identifier(&col_name) {
                return Json(ApiResponse::error("Invalid column name"));
            }
            let col_name_quoted = quote_identifier(&col_name, &db_type);
            format!("ALTER TABLE {} DROP COLUMN {}", table_name_quoted, col_name_quoted)
        }
    };
    match sqlx::query(&sql).execute(&pool).await {
        Ok(_) => Json(ApiResponse::success(json!({
            "message": "Table altered successfully",
            "table": name,
            "action": format!("{:?}", payload.alter_type)
        }))),
        Err(e) => Json(ApiResponse::error(e.to_string())),
    }
}

/// DELETE /api/schema/table/{name} - Drop table
async fn drop_table(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Json<ApiResponse<Value>> {
    if !is_valid_identifier(&name) {
        return Json(ApiResponse::error("Invalid table name"));
    }

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

    let table_name_quoted = quote_identifier(&name, &db_type);
    let sql = format!("DROP TABLE {}", table_name_quoted);

    match sqlx::query(&sql).execute(&pool).await {
        Ok(_) => Json(ApiResponse::success(json!({
            "message": "Table dropped successfully",
            "table": name
        }))),
        Err(e) => Json(ApiResponse::error(e.to_string())),
    }
}
