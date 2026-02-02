import AddIcon from '@/assets/svgs/AddIcon';
import SQLIcon from '@/assets/svgs/SQLIcon';
import SearchIcon from '@/assets/svgs/SearchIcon';
import TableIcon from '@/assets/svgs/TableIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TableInfo } from '@/models';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import EditIcon from '@/assets/svgs/EditIcon';
import LogOutIcon from '@/assets/svgs/LogOutIcon';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarProps {
	tables: TableInfo[];
	selectedTable: string | null;
	isSQLEditorActive: boolean;
	onSelectTable: (tableName: string) => void;
	onNewTable: () => void;
	onSQLEditor: () => void;
	onEditTable: (tableName: string) => void;
	onDeleteTable: (tableName: string) => void;
	onLogout: () => void;
}

export function Sidebar({
	tables,
	selectedTable,
	isSQLEditorActive,
	onSelectTable,
	onNewTable,
	onSQLEditor,
	onEditTable,
	onDeleteTable,
	onLogout,
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
						<div key={table.name} className='group relative py-0.5'>
							<button
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
								<span className='truncate flex-1'>
									{table.name}
								</span>
							</button>

							{/* Ellipsis Action (visible on group hover) */}
							<div className='absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity'>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant='ghost'
											size='icon'
											className='h-6 w-6 text-duck-white-700 hover:text-duck-white-50 hover:bg-duck-dark-500'
											onClick={(e) => e.stopPropagation()}
										>
											<MoreHorizontal size={14} />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align='end'
										className='w-32 bg-duck-dark-600 border-duck-dark-400/50'
									>
										<DropdownMenuItem
											onClick={(e) => {
												e.stopPropagation();
												onEditTable(table.name);
											}}
											className='text-duck-primary-400 focus:bg-duck-primary-500/20 focus:text-duck-primary-400 text-duck-xs gap-2'
										>
											<EditIcon className='w-3.5 h-3.5 text-duck-primary-400' />
											Edit Table
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={(e) => {
												e.stopPropagation();
												onDeleteTable(table.name);
											}}
											className='text-red-400 focus:bg-duck-dark-500 focus:text-red-400 text-duck-xs gap-2'
										>
											<Trash2
												size={14}
												className='text-red-400'
											/>
											Delete Table
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					))}
				</nav>
			</div>

			{/* logout button  */}
			<div className='px-6 py-4 bg-duck-dark-500 border-t border-duck-dark-300/50 shrink-0'>
				<Button
					variant='outline'
					className='w-full justify-start gap-2 h-9 bg-transparent border-duck-dark-400/50 text-duck-white-700 hover:bg-duck-dark-700 hover:text-duck-white-500 text-duck-sm font-normal'
					onClick={onLogout}
				>
					<LogOutIcon />
					Logout
				</Button>
			</div>
		</aside>
	);
}
