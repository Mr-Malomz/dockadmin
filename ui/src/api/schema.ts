import { api } from './client';
import type {
    TableInfo,
    ColumnInfo,
    IndexInfo,
    ForeignKeyInfo,
    CreateTableRequest,
    AlterTableRequest,
    MutationResult,
} from '../types/api';

// read operations
export async function getTables() {
    return api.get<{ tables: TableInfo[] }>('/schema/tables');
}

export async function getTable(name: string) {
    return api.get<{ columns: ColumnInfo[] }>(`/schema/table/${encodeURIComponent(name)}`);
}

export async function getIndexes(tableName: string) {
    return api.get<{ indexes: IndexInfo[] }>(
        `/schema/table/${encodeURIComponent(tableName)}/indexes`
    );
}

export async function getForeignKeys(tableName: string) {
    return api.get<{ foreign_keys: ForeignKeyInfo[] }>(
        `/schema/table/${encodeURIComponent(tableName)}/foreign-keys`
    );
}

// write operations
export async function createTable(request: CreateTableRequest) {
    return api.post<{ message: string; table: string }>('/schema/table', request);
}

export async function alterTable(tableName: string, request: AlterTableRequest) {
    return api.put<MutationResult>(`/schema/table/${encodeURIComponent(tableName)}`, request);
}

export async function dropTable(tableName: string) {
    return api.delete<{ message: string; table: string }>(
        `/schema/table/${encodeURIComponent(tableName)}`
    );
}
