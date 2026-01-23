import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as schemaApi from '../api/schema';
import * as dataApi from '../api/data';
import * as databaseApi from '../api/database';
import * as queryApi from '../api/query';
import type { TableRowsParams, CreateTableRequest, AlterTableRequest } from '../types/api';

// query keys for cache management
export const queryKeys = {
    tables: ['tables'] as const,
    table: (name: string) => ['table', name] as const,
    tableRows: (name: string, params?: TableRowsParams) => ['tableRows', name, params] as const,
    tableIndexes: (name: string) => ['tableIndexes', name] as const,
    tableForeignKeys: (name: string) => ['tableForeignKeys', name] as const,
    databaseInfo: ['databaseInfo'] as const,
};

// schema queries
export function useTables() {
    return useQuery({
        queryKey: queryKeys.tables,
        queryFn: async () => {
            const response = await schemaApi.getTables();
            if (!response.success) throw new Error(response.error);
            return response.data!.tables;
        },
    });
}

export function useTable(tableName: string) {
    return useQuery({
        queryKey: queryKeys.table(tableName),
        queryFn: async () => {
            const response = await schemaApi.getTable(tableName);
            if (!response.success) throw new Error(response.error);
            return response.data!.columns;
        },
        enabled: !!tableName,
    });
}

export function useTableIndexes(tableName: string) {
    return useQuery({
        queryKey: queryKeys.tableIndexes(tableName),
        queryFn: async () => {
            const response = await schemaApi.getIndexes(tableName);
            if (!response.success) throw new Error(response.error);
            return response.data!.indexes;
        },
        enabled: !!tableName,
    });
}

export function useTableForeignKeys(tableName: string) {
    return useQuery({
        queryKey: queryKeys.tableForeignKeys(tableName),
        queryFn: async () => {
            const response = await schemaApi.getForeignKeys(tableName);
            if (!response.success) throw new Error(response.error);
            return response.data!.foreign_keys;
        },
        enabled: !!tableName,
    });
}

// data operation
export function useTableRows(tableName: string, params: TableRowsParams = {}) {
    return useQuery({
        queryKey: queryKeys.tableRows(tableName, params),
        queryFn: async () => {
            const response = await dataApi.getRows(tableName, params);
            if (!response.success) throw new Error(response.error);
            return response.data!;
        },
        enabled: !!tableName,
    });
}

// database info query
export function useDatabaseInfo() {
    return useQuery({
        queryKey: queryKeys.databaseInfo,
        queryFn: async () => {
            const response = await databaseApi.getInfo();
            if (!response.success) throw new Error(response.error);
            return response.data!;
        },
    });
}

// mutations with cache invalidation
export function useCreateTable() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (request: CreateTableRequest) => {
            const response = await schemaApi.createTable(request);
            if (!response.success) throw new Error(response.error);
            return response.data!;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tables });
            queryClient.invalidateQueries({ queryKey: queryKeys.databaseInfo });
        },
    });
}

export function useAlterTable() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            tableName,
            request,
        }: {
            tableName: string;
            request: AlterTableRequest;
        }) => {
            const response = await schemaApi.alterTable(tableName, request);
            if (!response.success) throw new Error(response.error);
            return response.data!;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.table(variables.tableName),
            });
            // invalidate all tableRows queries for this table (any params)
            queryClient.invalidateQueries({
                queryKey: ['tableRows', variables.tableName],
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.tables }); // Also invalidate list of tables in case of renaming
        },
    });
}

export function useDropTable() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (tableName: string) => {
            const response = await schemaApi.dropTable(tableName);
            if (!response.success) throw new Error(response.error);
            return response.data!;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tables });
            queryClient.invalidateQueries({ queryKey: queryKeys.databaseInfo });
        },
    });
}

export function useInsertRow(tableName: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (row: Record<string, unknown>) => {
            const response = await dataApi.insertRow(tableName, row);
            if (!response.success) throw new Error(response.error);
            return response.data!;
        },
        onSuccess: () => {
            // invalidate all tableRows queries for this table (any params)
            queryClient.invalidateQueries({ queryKey: ['tableRows', tableName] });
        },
    });
}

export function useUpdateRow(tableName: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, row }: { id: string | number; row: Record<string, unknown> }) => {
            const response = await dataApi.updateRow(tableName, id, row);
            if (!response.success) throw new Error(response.error);
            return response.data!;
        },
        onSuccess: () => {
            // invalidate all tableRows queries for this table (any params)
            queryClient.invalidateQueries({ queryKey: ['tableRows', tableName] });
        },
    });
}

export function useDeleteRow(tableName: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string | number) => {
            const response = await dataApi.deleteRow(tableName, id);
            if (!response.success) throw new Error(response.error);
            return response.data!;
        },
        onSuccess: () => {
            // invalidate all tableRows queries for this table (any params)
            queryClient.invalidateQueries({ queryKey: ['tableRows', tableName] });
        },
    });
}

export function useExecuteQuery() {
    return useMutation({
        mutationFn: async (sql: string) => {
            const response = await queryApi.execute(sql);
            if (!response.success) throw new Error(response.error);
            return response.data!;
        },
    });
}
