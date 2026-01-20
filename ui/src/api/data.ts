import { api } from './client';
import type { PaginatedRows, MutationResult, TableRowsParams } from '../types/api';

export async function getRows(tableName: string, params: TableRowsParams = {}) {
    const searchParams = new URLSearchParams();

    if (params.page !== undefined) searchParams.set('page', String(params.page));
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.order) searchParams.set('order', params.order);

    const queryString = searchParams.toString();
    const url = `/table/${encodeURIComponent(tableName)}${queryString ? `?${queryString}` : ''}`;

    return api.get<PaginatedRows>(url);
}

export async function insertRow(tableName: string, row: Record<string, unknown>) {
    return api.post<MutationResult>(`/table/${encodeURIComponent(tableName)}`, row);
}

export async function updateRow(
    tableName: string,
    id: string | number,
    row: Record<string, unknown>
) {
    return api.put<MutationResult>(
        `/table/${encodeURIComponent(tableName)}/${encodeURIComponent(String(id))}`,
        row
    );
}

export async function deleteRow(tableName: string, id: string | number) {
    return api.delete<MutationResult>(
        `/table/${encodeURIComponent(tableName)}/${encodeURIComponent(String(id))}`
    );
}
