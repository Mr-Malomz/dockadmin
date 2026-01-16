import { Button } from '@/components/ui/button';
import AddIcon from '@/assets/svgs/AddIcon';
import EditIcon from '@/assets/svgs/EditIcon';
import DeleteIcon from '@/assets/svgs/DeleteIcon';

interface DataGridHeaderProps {
	tableName: string;
	selectedCount: number;
	onAddColumn: () => void;
	onAddRow: () => void;
	onEditRow: () => void;
	onDeleteRows: () => void;
}

export function DataGridHeader({
	tableName,
	selectedCount,
	onAddColumn,
	onAddRow,
	onEditRow,
	onDeleteRows,
}: DataGridHeaderProps) {
	const hasSelection = selectedCount > 0;
	const isSingleSelection = selectedCount === 1;

	return (
		<div className='bg-duck-dark-700 shrink-0'>
			{/* Table Name */}
			<div className='px-6 pt-8 pb-3 border-b border-duck-dark-400/30'>
				<h1 className='text-duck-lg font-normal text-duck-white-50'>
					{tableName}
				</h1>
			</div>

			{/* Actions Row */}
			<div className='flex items-center justify-end gap-2 px-4 py-2 border-b border-duck-dark-400/30 bg-duck-dark-500'>
				{hasSelection ? (
					<>
						{/* Edit button - only shown for single row selection */}
						{isSingleSelection && (
							<Button
								onClick={onEditRow}
								variant='outline'
								className='gap-2 h-8 bg-transparent border-duck-primary-500/50 text-duck-primary-400 hover:bg-duck-primary-500/20 text-duck-sm'
							>
								<EditIcon className='text-duck-primary-400' />
								Edit Row
							</Button>
						)}
						{/* Delete button */}
						<Button
							onClick={onDeleteRows}
							variant='outline'
							className='gap-2 h-8 bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/20 text-duck-sm'
						>
							<DeleteIcon className='text-red-400' />
							Delete {selectedCount} Row
							{selectedCount > 1 ? 's' : ''}
						</Button>
					</>
				) : (
					<>
						<Button
							onClick={onAddColumn}
							variant='outline'
							className='gap-2 h-8 bg-transparent border-duck-dark-400/50 text-duck-white-500 hover:bg-duck-dark-700 text-duck-sm'
						>
							<AddIcon />
							Add Column
						</Button>
						<Button
							onClick={onAddRow}
							variant='outline'
							className='gap-2 h-8 bg-transparent border-duck-dark-400/50 text-duck-white-500 hover:bg-duck-dark-700 text-duck-sm'
						>
							<AddIcon />
							Add Row
						</Button>
					</>
				)}
			</div>
		</div>
	);
}
