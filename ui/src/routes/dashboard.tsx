import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { DashboardLayout } from '@/components/layout';
import {
	DataGrid,
	DataGridHeader,
	DataGridFooter,
	SchemaView,
	SQLEditor,
	type ViewMode,
	type QueryResult,
} from '@/components/data';
import {
	AddRowModal,
	ColumnModal,
	CreateTableModal,
	EditRowModal,
	DeleteConfirmModal,
} from '@/components/modals';
import type {
	TableInfo,
	ColumnInfo,
	TableRow,
	NewColumnDefinition,
} from '@/models';
import { toast } from 'sonner';
import {
	useTables,
	useTable,
	useTableRows,
	useCreateTable,
	useAlterTable,
	useInsertRow,
	useUpdateRow,
	useDeleteRow,
	useExecuteQuery,
} from '@/hooks';

export const Route = createFileRoute('/dashboard')({
	component: DashboardPage,
});

// dashboard mode: table view or SQL editor
type DashboardMode = 'table' | 'sql-editor';

function DashboardPage() {
	const { isConnected, isLoading, database, dbType } = useAuth();
	const navigate = useNavigate();
	const [dashboardMode, setDashboardMode] = useState<DashboardMode>('table');
	const [selectedTable, setSelectedTable] = useState<string | null>(null);
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
	const [addRowModalOpen, setAddRowModalOpen] = useState(false);
	const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
	const [createTableModalOpen, setCreateTableModalOpen] = useState(false);
	const [editRowModalOpen, setEditRowModalOpen] = useState(false);
	const [editingRowData, setEditingRowData] = useState<TableRow | null>(null);
	const [editingColumnData, setEditingColumnData] =
		useState<ColumnInfo | null>(null);
	const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
	const [deleteColumnConfirmOpen, setDeleteColumnConfirmOpen] =
		useState(false);
	const [deletingColumnName, setDeletingColumnName] = useState<string | null>(
		null,
	);
	const [viewMode, setViewMode] = useState<ViewMode>('data');

	// React Query hooks - must be called unconditionally (before any returns)
	const tablesQuery = useTables();
	const columnsQuery = useTable(selectedTable || '');
	const rowsQuery = useTableRows(selectedTable || '');

	// Mutations
	const createTableMutation = useCreateTable();
	const alterTableMutation = useAlterTable(selectedTable || '');
	const insertRowMutation = useInsertRow(selectedTable || '');
	const updateRowMutation = useUpdateRow(selectedTable || '');
	const deleteRowMutation = useDeleteRow(selectedTable || '');
	const executeQueryMutation = useExecuteQuery();

	// API data - use directly without transformation
	const tables: TableInfo[] = tablesQuery.data || [];
	const columns: ColumnInfo[] = columnsQuery.data || [];
	const rows: TableRow[] = rowsQuery.data?.rows || [];

	// show loading spinner while checking auth status
	if (isLoading) {
		return (
			<div className='min-h-screen bg-duck-dark-900 flex items-center justify-center'>
				<Spinner size='lg' />
			</div>
		);
	}

	// redirect to connection page if not connected
	if (!isConnected) {
		navigate({ to: '/' });
		return null;
	}

	// connection info from auth state
	const connectionInfo = {
		dbType: dbType || 'Unknown',
		host: 'localhost', // TODO: store host in auth state if needed
		port: '5432',
		database: database || 'Unknown',
	};

	const handleSelectTable = (tableName: string) => {
		setDashboardMode('table');
		setSelectedTable(tableName);
		setSelectedRows(new Set());
	};

	const handleNewTable = () => {
		setCreateTableModalOpen(true);
	};

	const handleSQLEditor = () => {
		setDashboardMode('sql-editor');
		setSelectedTable(null);
	};

	const handleSelectRow = (rowId: string, selected: boolean) => {
		setSelectedRows((prev) => {
			const newSet = new Set(prev);
			if (selected) {
				newSet.add(rowId);
			} else {
				newSet.delete(rowId);
			}
			return newSet;
		});
	};

	const handleSelectAll = (selected: boolean) => {
		if (selected) {
			const allIds = rows.map((_, index) => String(index));
			setSelectedRows(new Set(allIds));
		} else {
			setSelectedRows(new Set());
		}
	};

	const handleDeleteRows = () => {
		setDeleteConfirmModalOpen(true);
	};

	const confirmDeleteRows = async () => {
		const count = selectedRows.size;
		const rowIds = Array.from(selectedRows);

		try {
			// Delete each selected row
			for (const rowId of rowIds) {
				await deleteRowMutation.mutateAsync(rowId);
			}
			toast.success(`Deleted ${count} row${count > 1 ? 's' : ''}!`);
			setSelectedRows(new Set());
		} catch (error) {
			toast.error('Failed to delete rows');
		}
	};

	const handleEditRow = () => {
		if (selectedRows.size === 1) {
			const rowIndex = Number(Array.from(selectedRows)[0]);
			const rowData = rows[rowIndex];
			if (rowData) {
				setEditingRowData(rowData);
				setEditRowModalOpen(true);
			}
		}
	};

	const handleSaveEditedRow = async (data: Record<string, string>) => {
		if (!editingRowData || !('id' in editingRowData)) {
			toast.error('Cannot update row without ID');
			return;
		}

		try {
			await updateRowMutation.mutateAsync({
				id: editingRowData.id as string | number,
				row: data,
			});
			toast.success('Row updated successfully!');
			setSelectedRows(new Set());
		} catch (error) {
			toast.error('Failed to update row');
			throw error;
		}
	};

	const handleAddRow = async (data: Record<string, string>) => {
		try {
			await insertRowMutation.mutateAsync(data);
			toast.success('Row added successfully!');
		} catch (error) {
			toast.error('Failed to add row');
			throw error;
		}
	};

	const handleAddColumn = async (column: NewColumnDefinition) => {
		try {
			// Note: editing columns is not supported by the current API
			// This always adds a new column
			await alterTableMutation.mutateAsync({
				alter_type: 'AddColumn',
				column_definition: {
					name: column.name,
					data_type: column.data_type,
					nullable: column.nullable,
					is_primary_key: column.is_primary_key,
				},
			});
			toast.success(`Column "${column.name}" added successfully!`);
			setEditingColumnData(null);
			setAddColumnModalOpen(false);
		} catch (error) {
			toast.error('Failed to add column');
		}
	};

	const handleEditColumn = (columnName: string) => {
		const columnData = columns.find((col) => col.name === columnName);
		if (columnData) {
			setEditingColumnData(columnData);
			setAddColumnModalOpen(true);
		}
	};

	const handleDeleteColumn = (columnName: string) => {
		setDeletingColumnName(columnName);
		setDeleteColumnConfirmOpen(true);
	};

	const confirmDeleteColumn = async () => {
		if (deletingColumnName) {
			try {
				await alterTableMutation.mutateAsync({
					alter_type: 'DropColumn',
					column_name: deletingColumnName,
				});
				toast.success(`Column "${deletingColumnName}" deleted!`);
				setDeletingColumnName(null);
			} catch (error) {
				toast.error('Failed to delete column');
			}
		}
	};

	const handleCreateTable = async (
		tableName: string,
		tableColumns: NewColumnDefinition[],
		_foreignKeys: {
			sourceColumn: string;
			targetTable: string;
			targetColumn: string;
			onDelete: string;
		}[],
	) => {
		try {
			const payload = {
				name: tableName,
				columns: tableColumns.map((col) => ({
					name: col.name,
					data_type: col.data_type,
					nullable: col.nullable,
					is_primary_key: col.is_primary_key,
				})),
			};

			await createTableMutation.mutateAsync(payload);
			toast.success(`Table "${tableName}" created successfully!`);
		} catch (error) {
			console.error('Create table error:', error);
			const message =
				error instanceof Error
					? error.message
					: 'Failed to create table';
			toast.error(message);
		}
	};

	// SQL query execution using API
	const handleRunQuery = async (query: string): Promise<QueryResult> => {
		const startTime = Date.now();

		try {
			const result = await executeQueryMutation.mutateAsync(query);
			const endTime = Date.now();

			if (result.rows && result.rows.length > 0) {
				// SELECT query with results
				const columnNames = Object.keys(result.rows[0]);
				return {
					status: 'success',
					time: endTime - startTime,
					size: null,
					columns: columnNames,
					rows: result.rows,
				};
			}

			// Non-SELECT query (INSERT, UPDATE, DELETE, etc.)
			return {
				status: 'success',
				time: endTime - startTime,
				size: null,
				columns: [],
				rows: [],
				message: result.message || 'Query executed successfully',
				rowsAffected: result.rows_affected,
			};
		} catch (error) {
			return {
				status: 'error',
				time: null,
				size: null,
				columns: [],
				rows: [],
				error:
					error instanceof Error
						? error.message
						: 'Query execution failed',
			};
		}
	};

	return (
		<DashboardLayout
			dbType={connectionInfo.dbType}
			host={connectionInfo.host}
			port={connectionInfo.port}
			database={connectionInfo.database}
			tables={tables}
			selectedTable={selectedTable}
			isSQLEditorActive={dashboardMode === 'sql-editor'}
			onSelectTable={handleSelectTable}
			onNewTable={handleNewTable}
			onSQLEditor={handleSQLEditor}
		>
			{/* sql editor mode */}
			{dashboardMode === 'sql-editor' && (
				<SQLEditor onRun={handleRunQuery} />
			)}

			{/* table view mode */}
			{dashboardMode === 'table' && (
				<>
					{/* no table selected - show empty state */}
					{!selectedTable && (
						<div className='flex-1 flex items-center justify-center text-duck-white-300'>
							<div className='text-center'>
								<p className='text-duck-sm'>
									Select a table from the sidebar to view its
									data
								</p>
							</div>
						</div>
					)}

					{/* table selected */}
					{selectedTable && (
						<>
							<DataGridHeader
								tableName={selectedTable}
								selectedCount={selectedRows.size}
								onAddColumn={() => setAddColumnModalOpen(true)}
								onEditRow={handleEditRow}
								onAddRow={() => setAddRowModalOpen(true)}
								onDeleteRows={handleDeleteRows}
							/>

							{/* loading state for columns/rows */}
							{(columnsQuery.isLoading ||
								rowsQuery.isLoading) && (
								<div className='flex-1 flex items-center justify-center'>
									<Spinner size='lg' />
								</div>
							)}

							{/* error state for columns/rows */}
							{!columnsQuery.isLoading &&
								!rowsQuery.isLoading &&
								(columnsQuery.error || rowsQuery.error) && (
									<div className='flex-1 flex items-center justify-center'>
										<div className='text-center'>
											<p className='text-red-400 text-duck-sm mb-2'>
												Failed to load table data
											</p>
											<p className='text-duck-white-300 text-duck-xs'>
												{columnsQuery.error?.message ||
													rowsQuery.error?.message}
											</p>
										</div>
									</div>
								)}

							{/* data loaded successfully */}
							{!columnsQuery.isLoading &&
								!rowsQuery.isLoading &&
								!columnsQuery.error &&
								!rowsQuery.error && (
									<>
										{/* data view or schema view based on viewMode */}
										{viewMode === 'data' ? (
											<DataGrid
												columns={columns}
												rows={rows}
												selectedRows={selectedRows}
												onSelectRow={handleSelectRow}
												onSelectAll={handleSelectAll}
												onEditColumn={handleEditColumn}
												onDeleteColumn={
													handleDeleteColumn
												}
											/>
										) : (
											<SchemaView
												tableName={selectedTable}
												columns={columns}
												dbType={dbType || 'postgres'}
											/>
										)}

										{/* footer with row count and Data/Schema tabs */}
										<DataGridFooter
											rowCount={rows.length}
											viewMode={viewMode}
											onViewModeChange={setViewMode}
										/>
									</>
								)}
						</>
					)}

					<AddRowModal
						open={addRowModalOpen}
						onClose={() => setAddRowModalOpen(false)}
						tableName={selectedTable || ''}
						columns={columns}
						onSave={handleAddRow}
					/>

					<ColumnModal
						open={addColumnModalOpen}
						onClose={() => {
							setAddColumnModalOpen(false);
							setEditingColumnData(null);
						}}
						tableName={selectedTable || ''}
						onSave={handleAddColumn}
						editingColumn={editingColumnData}
					/>

					<EditRowModal
						open={editRowModalOpen}
						onClose={() => {
							setEditRowModalOpen(false);
							setEditingRowData(null);
						}}
						tableName={selectedTable || ''}
						columns={columns}
						rowData={editingRowData}
						onSave={handleSaveEditedRow}
					/>

					<DeleteConfirmModal
						open={deleteConfirmModalOpen}
						onClose={() => setDeleteConfirmModalOpen(false)}
						itemType='row'
						itemCount={selectedRows.size}
						tableName={selectedTable || ''}
						onConfirm={confirmDeleteRows}
					/>

					<DeleteConfirmModal
						open={deleteColumnConfirmOpen}
						onClose={() => {
							setDeleteColumnConfirmOpen(false);
							setDeletingColumnName(null);
						}}
						itemType='column'
						itemCount={1}
						tableName={selectedTable || ''}
						itemName={deletingColumnName || undefined}
						onConfirm={confirmDeleteColumn}
					/>
				</>
			)}

			<CreateTableModal
				open={createTableModalOpen}
				onClose={() => setCreateTableModalOpen(false)}
				onSave={handleCreateTable}
				availableTables={tables}
			/>
		</DashboardLayout>
	);
}
