use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub table_type: String,
    pub row_count_estimate: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub is_primary_key: bool,
    pub default_value: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IndexInfo {
    pub name: String,
    pub column_names: Vec<String>,
    pub is_unique: bool,
    pub is_primary: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForeignKeyInfo {
    pub constraint_name: String,
    pub column_name: String,
    pub foreign_table: String,
    pub foreign_column: String,
}
