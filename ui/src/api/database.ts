import { api } from './client';
import type { DatabaseInfo } from '../types/api';

export async function getInfo() {
    return api.get<DatabaseInfo>('/database/info');
}
