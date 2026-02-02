import { Sidebar } from './Sidebar';
import Logo from '@/assets/svgs/Logo';
import type { TableInfo } from '@/models';

interface DashboardLayoutProps {
	children: React.ReactNode;
	dbType: string;
	host: string;
	port: string;
	database: string;
	tables: TableInfo[];
	selectedTable: string | null;
	isSQLEditorActive?: boolean;
	onSelectTable: (tableName: string) => void;
	onNewTable: () => void;
	onSQLEditor: () => void;
	onEditTable: (tableName: string) => void;
	onDeleteTable: (tableName: string) => void;
	onLogout: () => void;
}

export function DashboardLayout({
	children,
	dbType,
	host,
	port,
	database,
	tables,
	selectedTable,
	isSQLEditorActive = false,
	onSelectTable,
	onNewTable,
	onSQLEditor,
	onEditTable,
	onDeleteTable,
	onLogout,
}: DashboardLayoutProps) {
	return (
		<div className='h-screen bg-duck-dark-700 flex flex-col overflow-hidden'>
			<nav className='bg-duck-dark-700 border-b border-duck-dark-400/30 flex items-center px-6 py-4 gap-4 shrink-0'>
				<header>
					<Logo />
					<div className='flex items-center gap-2 mt-[10px]'>
						<span className='text-duck-xs text-duck-white-700 font-normal'>
							{dbType} • {host}:{port} • {database}
						</span>
						<span className='inline-flex items-center px-2 py-0.5 rounded-full text-duck-xxs font-medium bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/50'>
							● CONNECTED
						</span>
					</div>
				</header>
			</nav>

			{/* Main Content Area */}
			<div className='flex flex-1 min-h-0 overflow-hidden'>
				<Sidebar
					tables={tables}
					selectedTable={selectedTable}
					isSQLEditorActive={isSQLEditorActive}
					onSelectTable={onSelectTable}
					onNewTable={onNewTable}
					onSQLEditor={onSQLEditor}
					onEditTable={onEditTable}
					onDeleteTable={onDeleteTable}
					onLogout={onLogout}
				/>
				<main className='flex-1 flex flex-col min-h-0 bg-duck-dark-800 overflow-hidden'>
					{children}
				</main>
			</div>
		</div>
	);
}
