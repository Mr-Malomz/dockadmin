// table and schema types - matches API response format

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

export interface TableRow {
    [key: string]: unknown;
}

export interface PaginatedData {
    rows: TableRow[];
    page: number;
    limit: number;
}

// column definition for creating new columns
export interface NewColumnDefinition {
    name: string;
    description?: string;
    data_type: string;
    default_value: string;
    is_primary_key: boolean;
    nullable: boolean;
    unique: boolean;
}

export const INITIAL_NEW_COLUMN: NewColumnDefinition = {
    name: '',
    description: '',
    data_type: '',
    default_value: '',
    is_primary_key: false,
    nullable: false,
    unique: false,
};

// column type options
export const COLUMN_TYPES = [
    'integer',
    'bigint',
    'text',
    'varchar(255)',
    'boolean',
    'timestamp',
    'date',
    'json',
    'uuid',
    'decimal',
] as const;

export type ColumnType = (typeof COLUMN_TYPES)[number];
