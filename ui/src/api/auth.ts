import { api, setToken, clearToken } from './client';
import type {
    ConnectRequest,
    ConnectResponse,
    StatusResponse,
} from '../types/api';

export async function connect(credentials: ConnectRequest) {
    const response = await api.post<ConnectResponse>('/connect', credentials);

    if (response.success && response.data?.token) {
        setToken(response.data.token);
    }

    return response;
}

export async function status() {
    return api.get<StatusResponse>('/status');
}

export async function disconnect() {
    const response = await api.post<StatusResponse>('/disconnect');

    if (response.success) {
        clearToken();
    }

    return response;
}
