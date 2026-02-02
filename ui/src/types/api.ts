export type DatabaseType = 'postgres' | 'mysql' | 'sqlite';

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// authentication types
export interface ConnectRequest {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    db_type: DatabaseType;
}

export interface ConnectResponse {
    token: string;
    database: string;
    db_type: DatabaseType;
}

export interface StatusResponse {
    connected: boolean;
    database: string | null;
    db_type: DatabaseType | null;
}

// database info types
export interface DatabaseInfo {
    database: string;
    db_type: string;
    version: string;
    table_count: number;
}

// schema types
export interface TableInfo {
    name: string;
    table_type: string;
    row_count_estimate: number | null;
}

export interface ColumnInfo {
    name: string;
    data_type: string;
    nullable: boolean;
    is_primary_key: boolean;
    default_value: string | null;
}

export interface IndexInfo {
    name: string;
    is_unique: boolean;
    is_primary: boolean;
    column_names: string[];
}

export interface ForeignKeyInfo {
    constraint_name: string;
    column_name: string;
    foreign_table: string;
    foreign_column: string;
}

// schema write types
export interface CreateTableRequest {
    name: string;
    columns: ColumnDefinition[];
}

export interface ColumnDefinition {
    name: string;
    data_type: string;
    nullable: boolean;
    is_primary_key: boolean;
    default_value?: string | null;
}

export type AlterTableRequest =
    | { alter_type: 'RenameTable'; new_name: string }
    | { alter_type: 'AddColumn'; column_definition: ColumnDefinition }
    | { alter_type: 'DropColumn'; column_name: string }
    | { alter_type: 'ModifyColumn'; old_column_name: string; column_definition: ColumnDefinition }
    | { alter_type: 'RenameColumn'; old_column_name: string; column_name: string };

// data types (CRUD)
export interface PaginatedRows {
    rows: Record<string, unknown>[];
    page: number;
    limit: number;
}

export interface MutationResult {
    message: string;
    rows_affected: number;
}

export interface TableRowsParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}

// query types
export interface QueryRequest {
    sql: string;
}

export interface QueryResult {
    rows?: Record<string, unknown>[];
    row_count?: number;
    message?: string;
    rows_affected?: number;
}
