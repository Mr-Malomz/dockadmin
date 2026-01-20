import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import { getToken, clearToken } from '../api/client';
import type { ConnectRequest, DatabaseType } from '../types/api';

interface AuthState {
	isConnected: boolean;
	isLoading: boolean;
	database: string | null;
	dbType: DatabaseType | null;
}

interface AuthContextType extends AuthState {
	connect: (
		credentials: ConnectRequest,
	) => Promise<{ success: boolean; error?: string }>;
	disconnect: () => Promise<void>;
	checkStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<AuthState>({
		isConnected: false,
		isLoading: true,
		database: null,
		dbType: null,
	});

	const checkStatus = useCallback(async () => {
		const token = getToken();
		if (!token) {
			setState({
				isConnected: false,
				isLoading: false,
				database: null,
				dbType: null,
			});
			return;
		}

		const response = await authApi.status();
		if (response.success && response.data?.connected) {
			setState({
				isConnected: true,
				isLoading: false,
				database: response.data.database,
				dbType: response.data.db_type,
			});
		} else {
			clearToken();
			setState({
				isConnected: false,
				isLoading: false,
				database: null,
				dbType: null,
			});
		}
	}, []);

	const connect = useCallback(async (credentials: ConnectRequest) => {
		const response = await authApi.connect(credentials);

		if (response.success && response.data) {
			setState({
				isConnected: true,
				isLoading: false,
				database: response.data.database,
				dbType: response.data.db_type,
			});
			return { success: true };
		}

		return { success: false, error: response.error || 'Connection failed' };
	}, []);

	const disconnect = useCallback(async () => {
		await authApi.disconnect();
		setState({
			isConnected: false,
			isLoading: false,
			database: null,
			dbType: null,
		});
	}, []);

	// Check session on mount
	useEffect(() => {
		checkStatus();
	}, [checkStatus]);

	return (
		<AuthContext.Provider
			value={{ ...state, connect, disconnect, checkStatus }}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
