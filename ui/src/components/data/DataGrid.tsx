import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import EditIcon from '@/assets/svgs/EditIcon';
import DeleteIcon from '@/assets/svgs/DeleteIcon';
import type { ColumnInfo, TableRow as RowData } from '@/models';

interface DataGridProps {
	columns: ColumnInfo[];
	rows: RowData[];
	selectedRows: Set<string>;
	onSelectRow: (rowId: string, selected: boolean) => void;
	onSelectAll: (selected: boolean) => void;
	onEditColumn: (columnName: string) => void;
	onDeleteColumn: (columnName: string) => void;
}

export function DataGrid({
	columns,
	rows,
	selectedRows,
	onSelectRow,
	onSelectAll,
	onEditColumn,
	onDeleteColumn,
}: DataGridProps) {
	const allSelected = rows.length > 0 && selectedRows.size === rows.length;
	const someSelected =
		selectedRows.size > 0 && selectedRows.size < rows.length;

	// Use primary key as unique identifier, fallback to index
	const getRowId = (row: RowData, index: number): string => {
		const pkColumn = columns.find((col) => col.is_primary_key);
		if (
			pkColumn &&
			row[pkColumn.name] !== undefined &&
			row[pkColumn.name] !== null
		) {
			return String(row[pkColumn.name]);
		}
		return String(index);
	};

	return (
		<div className='flex-1 overflow-auto'>
			<Table className='w-auto'>
				<TableHeader>
					<TableRow className='border-b border-duck-dark-400/30 bg-duck-dark-500 hover:bg-duck-dark-500'>
						<TableHead className='w-10 px-3 border-l border-duck-dark-400/30'>
							<Checkbox
								checked={allSelected}
								ref={(ref) => {
									if (ref) {
										(
											ref as HTMLButtonElement & {
												indeterminate: boolean;
											}
										).indeterminate = someSelected;
									}
								}}
								onCheckedChange={(checked) =>
									onSelectAll(!!checked)
								}
								className='border-duck-dark-300 data-[state=checked]:bg-duck-primary-500 data-[state=checked]:border-duck-primary-500'
							/>
						</TableHead>
						{columns.map((column) => (
							<TableHead
								key={column.name}
								className='text-duck-white-700 text-duck-xs font-normal px-3 py-2 whitespace-nowrap border-l border-duck-dark-400/30'
							>
								<div className='flex items-center justify-between gap-2'>
									<span>{column.name}</span>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button className='p-0.5 rounded hover:bg-duck-dark-400/50 transition-colors'>
												<ChevronDown className='w-3 h-3 text-duck-white-700' />
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align='end'
											className='bg-duck-dark-600 border-duck-dark-400/50'
										>
											<DropdownMenuItem
												onClick={() =>
													onEditColumn(column.name)
												}
												className='text-duck-white-500 text-duck-sm focus:bg-duck-dark-500 focus:text-duck-white-50 cursor-pointer gap-2'
											>
												<EditIcon className='text-duck-white-500' />
												Edit Column
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() =>
													onDeleteColumn(column.name)
												}
												className='text-red-400 text-duck-sm focus:bg-red-500/20 focus:text-red-400 cursor-pointer gap-2'
											>
												<DeleteIcon className='text-red-400' />
												Delete Column
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row, index) => {
						const rowId = getRowId(row, index);
						const isSelected = selectedRows.has(rowId);

						return (
							<TableRow
								key={`${rowId}-${index}`}
								className='border-b border-duck-dark-400/30 bg-duck-dark-600 hover:bg-duck-dark-500'
							>
								<TableCell className='w-10 px-3 border-l border-duck-dark-400/30'>
									<Checkbox
										checked={isSelected}
										onCheckedChange={(checked) =>
											onSelectRow(rowId, !!checked)
										}
										className='border-duck-dark-300 data-[state=checked]:bg-duck-primary-500 data-[state=checked]:border-duck-primary-500'
									/>
								</TableCell>
								{columns.map((column) => (
									<TableCell
										key={column.name}
										className='text-duck-white-500 text-duck-sm px-3 py-2 whitespace-nowrap border-l border-duck-dark-400/30'
									>
										{row[column.name] !== null &&
										row[column.name] !== undefined ? (
											String(row[column.name])
										) : (
											<span className='text-duck-dark-300'>
												NULL
											</span>
										)}
									</TableCell>
								))}
							</TableRow>
						);
					})}
					{rows.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={columns.length + 1}
								className='text-center text-duck-white-700 py-8'
							>
								No data available
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
