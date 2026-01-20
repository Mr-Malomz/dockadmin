import { api } from './client';
import type { QueryRequest, QueryResult } from '../types/api';

export async function execute(sql: string) {
    const request: QueryRequest = { sql };
    return api.post<QueryResult>('/query', request);
}
