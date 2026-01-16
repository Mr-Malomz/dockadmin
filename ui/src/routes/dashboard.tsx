import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
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

export const Route = createFileRoute('/dashboard')({
	component: DashboardPage,
});

// Dashboard mode: table view or SQL editor
type DashboardMode = 'table' | 'sql-editor';

// Mock data for development
const MOCK_TABLES: TableInfo[] = [
	{ name: 'users', tableType: 'TABLE', rowCountEstimate: 1523 },
	{ name: 'orders', tableType: 'TABLE', rowCountEstimate: 4820 },
	{ name: 'products', tableType: 'TABLE', rowCountEstimate: 312 },
	{ name: 'categories', tableType: 'TABLE', rowCountEstimate: 24 },
	{ name: 'reviews', tableType: 'TABLE', rowCountEstimate: 8920 },
	{ name: 'payments', tableType: 'TABLE', rowCountEstimate: 4315 },
	{ name: 'shipping_addresses', tableType: 'TABLE', rowCountEstimate: 2156 },
	{ name: 'wishlists', tableType: 'TABLE', rowCountEstimate: 892 },
];

const MOCK_COLUMNS: ColumnInfo[] = [
	{
		name: 'id',
		dataType: 'uuid',
		nullable: false,
		isPrimaryKey: true,
		defaultValue: 'gen_random_uuid()',
	},
	{
		name: 'email',
		dataType: 'varchar(255)',
		nullable: false,
		isPrimaryKey: false,
		defaultValue: null,
	},
	{
		name: 'name',
		dataType: 'varchar(255)',
		nullable: true,
		isPrimaryKey: false,
		defaultValue: null,
	},
	{
		name: 'created_on',
		dataType: 'timestamp',
		nullable: false,
		isPrimaryKey: false,
		defaultValue: 'CURRENT_TIMESTAMP',
	},
];

const MOCK_ROWS: TableRow[] = [
	{
		id: 'fa2b3c4d',
		email: 'alice@example.com',
		name: 'Alice Johnson',
		created_on: '2024-01-15 14:23:11',
	},
	{
		id: 'fa2b3c4d',
		email: 'alice@example.com',
		name: 'Alice Johnson',
		created_on: '2024-01-15 14:23:11',
	},
	{
		id: 'fa2b3c4d',
		email: 'alice@example.com',
		name: 'Alice Johnson',
		created_on: '2024-01-15 14:23:11',
	},
	{
		id: 'fa2b3c4d',
		email: 'alice@example.com',
		name: 'Alice Johnson',
		created_on: '2024-01-15 14:23:11',
	},
	{
		id: 'fa2b3c4d',
		email: 'alice@example.com',
		name: 'Alice Johnson',
		created_on: '2024-01-15 14:23:11',
	},
	{
		id: 'fa2b3c4d',
		email: 'alice@example.com',
		name: 'Alice Johnson',
		created_on: '2024-01-15 14:23:11',
	},
	{
		id: 'fa2b3c4d',
		email: 'alice@example.com',
		name: 'Alice Johnson',
		created_on: '2024-01-15 14:23:11',
	},
	{
		id: 'fa2b3c4d',
		email: 'alice@example.com',
		name: 'Alice Johnson',
		created_on: '2024-01-15 14:23:11',
	},
	{
		id: 'fa2b3c4d',
		email: 'alice@example.com',
		name: 'Alice Johnson',
		created_on: '2024-01-15 14:23:11',
	},
];

function DashboardPage() {
	const [dashboardMode, setDashboardMode] = useState<DashboardMode>('table');
	const [selectedTable, setSelectedTable] = useState<string | null>('users');
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
		null
	);
	const [viewMode, setViewMode] = useState<ViewMode>('data');

	// Mock connection info (would come from auth state)
	const connectionInfo = {
		dbType: 'PostgreSQL',
		host: 'localhost',
		port: '5432',
		database: 'myapp_production',
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
			const allIds = MOCK_ROWS.map((_, index) => String(index));
			setSelectedRows(new Set(allIds));
		} else {
			setSelectedRows(new Set());
		}
	};

	const handleDeleteRows = () => {
		setDeleteConfirmModalOpen(true);
	};

	const confirmDeleteRows = () => {
		const count = selectedRows.size;
		toast.success(`Deleted ${count} row${count > 1 ? 's' : ''}!`);
		setSelectedRows(new Set());
	};

	const handleEditRow = () => {
		if (selectedRows.size === 1) {
			const rowIndex = Number(Array.from(selectedRows)[0]);
			const rowData = MOCK_ROWS[rowIndex];
			if (rowData) {
				setEditingRowData(rowData);
				setEditRowModalOpen(true);
			}
		}
	};

	const handleSaveEditedRow = (data: Record<string, string>) => {
		console.log('Saving edited row:', data);
		toast.success('Row updated successfully!');
		setSelectedRows(new Set());
	};

	const handleAddRow = (data: Record<string, string>) => {
		console.log('Adding row:', data);
		toast.success('Row added successfully!');
	};

	const handleAddColumn = (column: NewColumnDefinition) => {
		if (editingColumnData) {
			console.log('Updating column:', column);
			toast.success(`Column "${column.name}" updated successfully!`);
			setEditingColumnData(null);
		} else {
			console.log('Adding column:', column);
			toast.success(`Column "${column.name}" added successfully!`);
		}
	};

	const handleEditColumn = (columnName: string) => {
		const columnData = MOCK_COLUMNS.find((col) => col.name === columnName);
		if (columnData) {
			setEditingColumnData(columnData);
			setAddColumnModalOpen(true);
		}
	};

	const handleDeleteColumn = (columnName: string) => {
		setDeletingColumnName(columnName);
		setDeleteColumnConfirmOpen(true);
	};

	const confirmDeleteColumn = () => {
		if (deletingColumnName) {
			toast.success(`Column "${deletingColumnName}" deleted!`);
			setDeletingColumnName(null);
		}
	};

	const handleCreateTable = (
		tableName: string,
		columns: NewColumnDefinition[],
		foreignKeys: {
			sourceColumn: string;
			targetTable: string;
			targetColumn: string;
			onDelete: string;
		}[]
	) => {
		console.log('Creating table:', tableName, columns, foreignKeys);
		toast.success(`Table "${tableName}" created successfully!`);
	};

	// Mock SQL query execution
	const handleRunQuery = async (query: string): Promise<QueryResult> => {
		console.log('Running query:', query);

		// Simulate API delay
		await new Promise((resolve) => setTimeout(resolve, 230));

		// Mock result based on query
		const lowerQuery = query.toLowerCase();

		if (lowerQuery.includes('select')) {
			return {
				status: 'success',
				time: 230,
				size: '1.96 KB',
				columns: ['id', 'email', 'name', 'created_on'],
				rows: MOCK_ROWS,
			};
		}

		// INSERT, UPDATE, DELETE - return message result
		if (
			lowerQuery.includes('insert') ||
			lowerQuery.includes('update') ||
			lowerQuery.includes('delete')
		) {
			return {
				status: 'success',
				time: 45,
				size: null,
				columns: [],
				rows: [],
				message: 'Query executed successfully',
				rowsAffected: lowerQuery.includes('insert') ? 1 : 5,
			};
		}

		return {
			status: 'error',
			time: null,
			size: null,
			columns: [],
			rows: [],
			error: 'Invalid query syntax',
		};
	};

	return (
		<DashboardLayout
			dbType={connectionInfo.dbType}
			host={connectionInfo.host}
			port={connectionInfo.port}
			database={connectionInfo.database}
			tables={MOCK_TABLES}
			selectedTable={selectedTable}
			isSQLEditorActive={dashboardMode === 'sql-editor'}
			onSelectTable={handleSelectTable}
			onNewTable={handleNewTable}
			onSQLEditor={handleSQLEditor}
		>
			{/* SQL Editor Mode */}
			{dashboardMode === 'sql-editor' && (
				<SQLEditor onRun={handleRunQuery} />
			)}

			{/* Table View Mode */}
			{dashboardMode === 'table' && selectedTable && (
				<>
					<DataGridHeader
						tableName={selectedTable}
						selectedCount={selectedRows.size}
						onAddColumn={() => setAddColumnModalOpen(true)}
						onEditRow={handleEditRow}
						onAddRow={() => setAddRowModalOpen(true)}
						onDeleteRows={handleDeleteRows}
					/>

					{/* Data View or Schema View based on viewMode */}
					{viewMode === 'data' ? (
						<DataGrid
							columns={MOCK_COLUMNS}
							rows={MOCK_ROWS}
							selectedRows={selectedRows}
							onSelectRow={handleSelectRow}
							onSelectAll={handleSelectAll}
							onEditColumn={handleEditColumn}
							onDeleteColumn={handleDeleteColumn}
						/>
					) : (
						<SchemaView
							tableName={selectedTable}
							columns={MOCK_COLUMNS}
						/>
					)}

					{/* Footer with row count and Data/Schema tabs */}
					<DataGridFooter
						rowCount={MOCK_ROWS.length}
						viewMode={viewMode}
						onViewModeChange={setViewMode}
					/>

					<AddRowModal
						open={addRowModalOpen}
						onClose={() => setAddRowModalOpen(false)}
						tableName={selectedTable}
						columns={MOCK_COLUMNS}
						onSave={handleAddRow}
					/>

					<ColumnModal
						open={addColumnModalOpen}
						onClose={() => {
							setAddColumnModalOpen(false);
							setEditingColumnData(null);
						}}
						tableName={selectedTable}
						onSave={handleAddColumn}
						editingColumn={editingColumnData}
					/>

					<EditRowModal
						open={editRowModalOpen}
						onClose={() => {
							setEditRowModalOpen(false);
							setEditingRowData(null);
						}}
						tableName={selectedTable}
						columns={MOCK_COLUMNS}
						rowData={editingRowData}
						onSave={handleSaveEditedRow}
					/>

					<DeleteConfirmModal
						open={deleteConfirmModalOpen}
						onClose={() => setDeleteConfirmModalOpen(false)}
						itemType='row'
						itemCount={selectedRows.size}
						tableName={selectedTable}
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
						tableName={selectedTable}
						itemName={deletingColumnName || undefined}
						onConfirm={confirmDeleteColumn}
					/>
				</>
			)}

			<CreateTableModal
				open={createTableModalOpen}
				onClose={() => setCreateTableModalOpen(false)}
				onSave={handleCreateTable}
				availableTables={MOCK_TABLES}
			/>
		</DashboardLayout>
	);
}
