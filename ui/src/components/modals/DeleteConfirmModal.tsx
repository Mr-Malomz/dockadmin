import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DeleteIcon from '@/assets/svgs/DeleteIcon';

interface DeleteConfirmModalProps {
	open: boolean;
	onClose: () => void;
	/** Type of item being deleted: 'row', 'column', etc. */
	itemType: 'row' | 'column';
	/** Number of items to delete */
	itemCount: number;
	/** Name of the table/container */
	tableName: string;
	/** Optional: name of the item being deleted (for single column deletion) */
	itemName?: string;
	onConfirm: () => void;
}

export function DeleteConfirmModal({
	open,
	onClose,
	itemType,
	itemCount,
	tableName,
	itemName,
	onConfirm,
}: DeleteConfirmModalProps) {
	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

	// Generate display text based on item type and count
	const getItemText = () => {
		if (itemType === 'column' && itemName) {
			return `column "${itemName}"`;
		}
		return `${itemCount} ${itemType}${itemCount > 1 ? 's' : ''}`;
	};

	const itemText = getItemText();

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='bg-duck-dark-700 border-duck-dark-400/50 text-duck-white-50 max-w-md p-0 gap-0'>
				{/* Header with icon */}
				<div className='p-6 border-b border-duck-dark-400/30 flex flex-col items-center gap-4'>
					<div className='w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center'>
						<DeleteIcon className='text-red-400 w-6 h-6' />
					</div>
					<h2 className='text-duck-base font-normal text-duck-white-50 text-center'>
						Delete {itemText} from{' '}
						<span className='text-duck-primary-500'>
							{tableName}
						</span>
						?
					</h2>
				</div>

				{/* Warning message */}
				<div className='p-6'>
					<p className='text-duck-sm text-duck-white-700 text-center'>
						This action cannot be undone. The selected {itemType}
						{itemCount > 1 ? 's' : ''} will be permanently deleted
						from the database.
					</p>
				</div>

				{/* Footer with Cancel and Delete buttons */}
				<DialogFooter className='p-6 border-t border-duck-dark-400/30 gap-2'>
					<Button
						type='button'
						variant='outline'
						onClick={onClose}
						className='bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-500 hover:bg-duck-dark-500 text-duck-sm font-normal'
					>
						Cancel
					</Button>
					<Button
						type='button'
						onClick={handleConfirm}
						className='bg-red-500 hover:bg-red-600 text-white text-duck-sm font-normal border border-red-700'
					>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
