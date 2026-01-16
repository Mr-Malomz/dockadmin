// Table and schema types

export interface TableInfo {
    name: string;
    tableType: string;
    rowCountEstimate: number | null;
}

export interface ColumnInfo {
    name: string;
    dataType: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    defaultValue: string | null;
}

export interface TableRow {
    [key: string]: unknown;
}

export interface PaginatedData {
    rows: TableRow[];
    page: number;
    limit: number;
}

// Column definition for creating new columns
export interface NewColumnDefinition {
    name: string;
    description?: string;
    dataType: string;
    defaultValue: string;
    isPrimaryKey: boolean;
    nullable: boolean;
    unique: boolean;
}

export const INITIAL_NEW_COLUMN: NewColumnDefinition = {
    name: '',
    description: '',
    dataType: '',
    defaultValue: '',
    isPrimaryKey: false,
    nullable: false,
    unique: false,
};

// Column type options
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
