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
    nullable: true,
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

/**
 * Normalizes database-specific type names to simplified types used in the UI dropdown.
 * Handles variations like PostgreSQL's 'timestamp without time zone' -> 'timestamp'
 */
export function normalizeDataType(dbType: string): string {
    const normalized = dbType.toLowerCase().trim();

    // Timestamp variations
    if (normalized.includes('timestamp')) return 'timestamp';

    // Integer variations
    if (normalized === 'int' || normalized === 'int4' || normalized === 'serial') return 'integer';
    if (normalized === 'int8' || normalized === 'bigserial') return 'bigint';
    if (normalized === 'smallint' || normalized === 'int2') return 'integer';

    // Varchar/character varying
    if (normalized.includes('character varying') || normalized.includes('varchar')) return 'varchar(255)';

    // Boolean variations
    if (normalized === 'bool') return 'boolean';

    // JSON variations
    if (normalized === 'jsonb') return 'json';

    // Decimal/numeric
    if (normalized.includes('numeric') || normalized.includes('decimal')) return 'decimal';

    // Float/real/double
    if (normalized.includes('float') || normalized === 'real' || normalized.includes('double')) return 'decimal';

    // Check if it's already a valid type
    if (COLUMN_TYPES.includes(normalized as ColumnType)) {
        return normalized;
    }

    // Default fallback - return as-is (will show empty in dropdown but allows custom types)
    return dbType;
}

