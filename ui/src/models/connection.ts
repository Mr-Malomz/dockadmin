// Database connection types

export type DatabaseType = 'postgres' | 'mysql' | 'sqlite';

export interface ConnectionForm {
    dbType: DatabaseType;
    database: string;
    host: string;
    port: string;
    username: string;
    password: string;
}

export const DEFAULT_PORTS: Record<DatabaseType, string> = {
    postgres: '5432',
    mysql: '3306',
    sqlite: '',
};

export const INITIAL_CONNECTION_FORM: ConnectionForm = {
    dbType: 'postgres',
    database: '',
    host: 'localhost',
    port: '5432',
    username: '',
    password: '',
};
