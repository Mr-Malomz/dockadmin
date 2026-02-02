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

#[derive(Debug, Deserialize)]
pub struct ColumnDefinition {
    pub name: String,
    pub data_type: String,
    #[serde(default)]
    pub nullable: bool,
    #[serde(default)]
    pub is_primary_key: bool,
    #[serde(default)]
    pub unique: bool,
    #[serde(default)]
    pub auto_increment: bool,
    pub default_value: Option<String>,
}

/// Foreign key definition for table creation
#[derive(Debug, Deserialize)]
pub struct ForeignKeyDefinition {
    pub source_column: String,
    pub target_table: String,
    pub target_column: String,
    #[serde(default = "default_on_delete")]
    pub on_delete: String, // RESTRICT, CASCADE, SET NULL, NO ACTION
}

fn default_on_delete() -> String {
    "RESTRICT".to_string()
}

#[derive(Debug, Deserialize)]
pub struct CreateTableRequest {
    pub name: String,
    pub columns: Vec<ColumnDefinition>,
    #[serde(default)]
    pub foreign_keys: Vec<ForeignKeyDefinition>,
}

#[derive(Debug, Deserialize)]
pub enum AlterType {
    RenameTable,
    AddColumn,
    DropColumn,
    ModifyColumn,
    RenameColumn,
}

#[derive(Debug, Deserialize)]
pub struct AlterTableRequest {
    pub alter_type: AlterType,
    pub new_name: Option<String>,
    pub column_definition: Option<ColumnDefinition>,
    pub column_name: Option<String>,
    pub old_column_name: Option<String>, // For ModifyColumn/RenameColumn
}
