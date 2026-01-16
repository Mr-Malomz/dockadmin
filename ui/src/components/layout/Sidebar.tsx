import AddIcon from '@/assets/svgs/AddIcon';
import SQLIcon from '@/assets/svgs/SQLIcon';
import SearchIcon from '@/assets/svgs/SearchIcon';
import TableIcon from '@/assets/svgs/TableIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TableInfo } from '@/models';

interface SidebarProps {
	tables: TableInfo[];
	selectedTable: string | null;
	isSQLEditorActive: boolean;
	onSelectTable: (tableName: string) => void;
	onNewTable: () => void;
	onSQLEditor: () => void;
}

export function Sidebar({
	tables,
	selectedTable,
	isSQLEditorActive,
	onSelectTable,
	onNewTable,
	onSQLEditor,
}: SidebarProps) {
	return (
		<aside className='w-[256px] bg-duck-dark-900 border-r border-duck-dark-400/30 flex flex-col overflow-hidden'>
			{/* Action Buttons */}
			<div className='px-6 py-8 bg-duck-dark-500 border-b border-duck-dark-300/50 grid gap-2 shrink-0'>
				<Button
					onClick={onNewTable}
					variant='outline'
					className='w-full justify-start gap-2 h-9 bg-transparent border-duck-dark-400/50 text-duck-white-700 hover:bg-duck-dark-700 text-duck-sm font-normal'
				>
					<AddIcon />
					New Table
				</Button>
				<Button
					onClick={onSQLEditor}
					variant='outline'
					className={`w-full justify-start gap-2 h-9 bg-transparent border-duck-dark-400/50 text-duck-white-700 hover:bg-duck-dark-700 hover:text-duck-white-500 text-duck-sm font-normal ${isSQLEditorActive ? 'bg-duck-dark-700 text-duck-white-500' : ''}`}
				>
					<SQLIcon
						className={
							isSQLEditorActive
								? 'text-duck-white-500'
								: 'text-duck-white-700'
						}
					/>
					SQL Editor
				</Button>
			</div>

			{/* Search */}
			<div className='px-3 mt-6 shrink-0'>
				<div className='relative'>
					<div className='absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none'>
						<SearchIcon />
					</div>
					<Input
						type='text'
						placeholder='Search'
						className='pl-8 h-9 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-500 placeholder:text-duck-dark-300 text-duck-sm'
					/>
				</div>
			</div>

			{/* Tables List */}
			<div className='mt-6 flex-1 overflow-y-auto min-h-0'>
				<div className='px-3 py-2 text-duck-xxs text-duck-white-700 uppercase tracking-wide'>
					Tables ({tables.length})
				</div>
				<nav className=''>
					{tables.map((table) => (
						<button
							key={table.name}
							onClick={() => onSelectTable(table.name)}
							className={`w-full flex items-center gap-2 px-2 py-1.5 text-duck-sm text-left transition-colors font-normal ${
								selectedTable === table.name
									? 'bg-duck-dark-500 text-duck-white-50 border-l-2 border-duck-white-500'
									: 'text-duck-white-900 hover:bg-duck-dark-700'
							}`}
						>
							<TableIcon
								className={
									selectedTable === table.name
										? 'text-duck-white-500'
										: 'text-duck-white-900'
								}
							/>
							{table.name}
						</button>
					))}
				</nav>
			</div>
		</aside>
	);
}
