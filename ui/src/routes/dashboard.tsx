import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
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
	useDropTable,
	useTableForeignKeys,
} from '@/hooks';

export const Route = createFileRoute('/dashboard')({
	component: DashboardPage,
});

// dashboard mode: table view or SQL editor
type DashboardMode = 'table' | 'sql-editor';

function DashboardPage() {
	const { isConnected, isLoading, database, dbType, disconnect } = useAuth();
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

	// Table Actions State
	const [tableToEdit, setTableToEdit] = useState<string | null>(null);
	const [deleteTableConfirmOpen, setDeleteTableConfirmOpen] = useState(false);
	const [tableToDelete, setTableToDelete] = useState<string | null>(null);

	// React Query hooks - must be called unconditionally (before any returns)
	const tablesQuery = useTables();
	const columnsQuery = useTable(selectedTable || '');
	const rowsQuery = useTableRows(selectedTable || '');

	// Queries for Edit Table
	const editTableColumnsQuery = useTable(tableToEdit || '');
	const editTableFKsQuery = useTableForeignKeys(tableToEdit || '');

	// Mutations
	const createTableMutation = useCreateTable();
	const dropTableMutation = useDropTable();
	const alterTableMutation = useAlterTable();
	const insertRowMutation = useInsertRow(selectedTable || '');
	const updateRowMutation = useUpdateRow(selectedTable || '');
	const deleteRowMutation = useDeleteRow(selectedTable || '');
	const executeQueryMutation = useExecuteQuery();

	// API data
	const tables: TableInfo[] = tablesQuery.data || [];
	const columns: ColumnInfo[] = columnsQuery.data || [];
	const rows: TableRow[] = rowsQuery.data?.rows || [];

	// Auto-select the first table when tables are loaded and none is selected
	useEffect(() => {
		if (tables.length > 0 && !selectedTable && dashboardMode === 'table') {
			setSelectedTable(tables[0].name);
		}
	}, [tables, selectedTable, dashboardMode]);

	// Open modal when edit data is ready
	useEffect(() => {
		if (
			tableToEdit &&
			editTableColumnsQuery.data &&
			editTableFKsQuery.data
		) {
			setCreateTableModalOpen(true);
		}
	}, [tableToEdit, editTableColumnsQuery.data, editTableFKsQuery.data]);

	// Clear editing state when modal closes
	useEffect(() => {
		if (!createTableModalOpen) {
			setTableToEdit(null);
		}
	}, [createTableModalOpen]);

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
		setTableToEdit(null);
		setCreateTableModalOpen(true);
	};

	const handleEditTable = (tableName: string) => {
		setTableToEdit(tableName);
	};

	const handleDeleteTable = (tableName: string) => {
		setTableToDelete(tableName);
		setDeleteTableConfirmOpen(true);
	};

	const confirmDeleteTable = async () => {
		if (tableToDelete) {
			try {
				await dropTableMutation.mutateAsync(tableToDelete);
				toast.success(`Table "${tableToDelete}" deleted!`);
				if (selectedTable === tableToDelete) setSelectedTable(null);
				setTableToDelete(null);
			} catch (error) {
				toast.error(`Failed to delete table "${tableToDelete}"`);
				throw error; // Re-throw so modal stays open
			}
		}
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
			throw error; // Re-throw so modal stays open
		}
	};

	const handleEditRow = () => {
		if (selectedRows.size === 1) {
			const selectedId = Array.from(selectedRows)[0];

			// Find primary key column
			const pkColumn = columns.find((col) => col.is_primary_key);

			let rowData: TableRow | undefined;

			if (pkColumn) {
				// Find row by primary key value
				rowData = rows.find(
					(row) => String(row[pkColumn.name]) === selectedId,
				);
			} else {
				// Fallback to index if no PK (legacy behavior)
				const rowIndex = Number(selectedId);
				if (!isNaN(rowIndex)) {
					rowData = rows[rowIndex];
				}
			}

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
			// Check if we're editing an existing column
			if (editingColumnData) {
				// Use ModifyColumn for editing
				await alterTableMutation.mutateAsync({
					tableName: selectedTable || '',
					request: {
						alter_type: 'ModifyColumn',
						old_column_name: editingColumnData.name,
						column_definition: {
							name: column.name,
							data_type: column.data_type,
							nullable: column.nullable,
							is_primary_key: column.is_primary_key,
							default_value: column.default_value,
						},
					},
				});
				toast.success(`Column "${column.name}" modified successfully!`);
			} else {
				// Add new column
				await alterTableMutation.mutateAsync({
					tableName: selectedTable || '',
					request: {
						alter_type: 'AddColumn',
						column_definition: {
							name: column.name,
							data_type: column.data_type,
							nullable: column.nullable,
							is_primary_key: column.is_primary_key,
							default_value: column.default_value,
						},
					},
				});
				toast.success(`Column "${column.name}" added successfully!`);
			}
			setEditingColumnData(null);
			setAddColumnModalOpen(false);
		} catch (error) {
			toast.error(
				editingColumnData
					? 'Failed to modify column'
					: 'Failed to add column',
			);
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
					tableName: selectedTable || '',
					request: {
						alter_type: 'DropColumn',
						column_name: deletingColumnName,
					},
				});
				toast.success(`Column "${deletingColumnName}" deleted!`);
				setDeletingColumnName(null);
			} catch (error) {
				toast.error('Failed to delete column');
				throw error; // Re-throw so modal stays open
			}
		}
	};

	const handleSaveTable = async (
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
			// If not editing, create new table
			if (!tableToEdit) {
				const payload = {
					name: tableName,
					columns: tableColumns.map((col) => ({
						name: col.name,
						data_type: col.data_type,
						nullable: col.nullable,
						is_primary_key: col.is_primary_key,
						default_value: col.default_value,
					})),
				};

				await createTableMutation.mutateAsync(payload);
				toast.success(`Table "${tableName}" created successfully!`);
				return;
			}

			// EDIT MODE Logic
			let currentTableName = tableToEdit;

			// 1. Check for Table Rename
			if (tableToEdit !== tableName) {
				await alterTableMutation.mutateAsync({
					tableName: tableToEdit,
					request: {
						alter_type: 'RenameTable',
						new_name: tableName,
					},
				});
				currentTableName = tableName;
				toast.success(
					`Table renamed from "${tableToEdit}" to "${tableName}"`,
				);
			}

			// Get original columns map
			const originalCols = editInitialData?.columns || [];

			// 2. Identify Changes
			// Columns to Add (in new but not in old)
			// We match by name. A column is "New" if its name doesn't exist in original cols.
			// Note: This means renaming a column in UI = Drop + Add (data loss) unless we track IDs
			// Since our UI doesn't track column rename explicitly (no IDs), we accept this limitation for now.
			const addedCols = tableColumns.filter(
				(newCol) =>
					!originalCols.some((oldCol) => oldCol.name === newCol.name),
			);

			// Columns to Drop (in old but not in new)
			const droppedCols = originalCols.filter(
				(oldCol) =>
					!tableColumns.some((newCol) => newCol.name === oldCol.name),
			);

			// Columns to Modify (in both, but properties changed)
			const modifiedCols = tableColumns.filter((newCol) => {
				const oldCol = originalCols.find((c) => c.name === newCol.name);
				if (!oldCol) return false;

				// Compare properties
				return (
					oldCol.data_type !== newCol.data_type ||
					oldCol.nullable !== newCol.nullable ||
					String(oldCol.default_value || '') !==
						String(newCol.default_value || '')
					// checking PK change might be tricky if backend doesn't support it easily, skipping for now
				);
			});

			// 3. Execute Updates Comparison
			// Since mutations are async and might depend on each other (schema state), execute sequentially

			// Drop Columns
			for (const col of droppedCols) {
				await alterTableMutation.mutateAsync({
					tableName: currentTableName,
					request: {
						alter_type: 'DropColumn',
						column_name: col.name,
					},
				});
			}

			// Add Columns
			for (const col of addedCols) {
				await alterTableMutation.mutateAsync({
					tableName: currentTableName,
					request: {
						alter_type: 'AddColumn',
						column_definition: {
							name: col.name,
							data_type: col.data_type,
							nullable: col.nullable,
							is_primary_key: col.is_primary_key,
							default_value: col.default_value,
						},
					},
				});
			}

			// Modify Columns
			for (const col of modifiedCols) {
				const oldCol = originalCols.find((c) => c.name === col.name)!;
				await alterTableMutation.mutateAsync({
					tableName: currentTableName,
					request: {
						alter_type: 'ModifyColumn',
						old_column_name: col.name,
						column_definition: {
							name: col.name,
							data_type: col.data_type,
							nullable: col.nullable,
							is_primary_key: col.is_primary_key,
							default_value: col.default_value,
						},
					},
				});
			}

			if (
				addedCols.length > 0 ||
				droppedCols.length > 0 ||
				modifiedCols.length > 0
			) {
				toast.success('Table schema updated successfully!');
			}

			// Clear selection if we renamed the currently selected table
			if (
				selectedTable === tableToEdit &&
				tableToEdit !== currentTableName
			) {
				setSelectedTable(currentTableName);
			}
		} catch (error) {
			console.error('Save table error:', error);
			const message =
				error instanceof Error
					? error.message
					: 'Failed to save table changes';
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

	// Prepare initial data for Edit Table Modal
	const editInitialData =
		tableToEdit && editTableColumnsQuery.data
			? {
					tableName: tableToEdit,
					columns: editTableColumnsQuery.data.map((c) => ({
						name: c.name,
						data_type: c.data_type,
						nullable: c.nullable,
						is_primary_key: c.is_primary_key,
						default_value: c.default_value
							? String(c.default_value)
							: '',
						unique: false, // Defaults to false as we don't have index data readily mapped yet
					})),
					foreignKeys: (editTableFKsQuery.data || []).map(
						(fk) =>
							({
								sourceColumn: fk.column_name,
								targetTable: fk.foreign_table,
								targetColumn: fk.foreign_column,
								onDelete: 'RESTRICT', // Default, as API might not return exact onDelete action yet
							}) as any,
					), // Cast as any to bypass strict literal type check for onDelete
				}
			: null;

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
			onEditTable={handleEditTable}
			onDeleteTable={handleDeleteTable}
			onLogout={async () => {
				await disconnect();
				navigate({ to: '/' });
			}}
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
				onSave={handleSaveTable}
				availableTables={tables}
				databaseName={database || undefined}
				initialData={editInitialData}
			/>

			<DeleteConfirmModal
				open={deleteTableConfirmOpen}
				onClose={() => setDeleteTableConfirmOpen(false)}
				itemType='table'
				itemCount={1}
				tableName={tableToDelete || ''}
				itemName={tableToDelete || undefined}
				onConfirm={confirmDeleteTable}
			/>
		</DashboardLayout>
	);
}
