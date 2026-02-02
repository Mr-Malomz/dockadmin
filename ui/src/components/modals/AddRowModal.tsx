import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SmartInput } from '@/components/ui/SmartInput';
import type { ColumnInfo } from '@/models';
import { useState, useEffect } from 'react';

interface AddRowModalProps {
	open: boolean;
	onClose: () => void;
	tableName: string;
	columns: ColumnInfo[];
	onSave: (data: Record<string, string>) => Promise<void>;
}

export function AddRowModal({
	open,
	onClose,
	tableName,
	columns,
	onSave,
}: AddRowModalProps) {
	const [formData, setFormData] = useState<Record<string, string>>({});
	const [isSaving, setIsSaving] = useState(false);

	// Reset form when modal opens
	useEffect(() => {
		if (open) {
			const initialData: Record<string, string> = {};
			columns.forEach((col) => {
				initialData[col.name] = '';
			});
			setFormData(initialData);
			setIsSaving(false);
		}
	}, [open, columns]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			await onSave(formData);
			onClose();
		} catch (error) {
			console.error('Failed to add row:', error);
			// Modal stays open on error
		} finally {
			setIsSaving(false);
		}
	};

	// Filter out auto-generated columns like id
	const editableColumns = columns.filter(
		(col) => !col.is_primary_key || col.default_value === null,
	);

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='bg-duck-dark-700 border-duck-dark-400/50 text-duck-white-50 max-w-lg p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]'>
				{/* Header - fixed */}
				<div className='p-6 border-b border-duck-dark-400/30 shrink-0'>
					<h2 className='text-duck-base font-normal text-duck-white-50'>
						Add new row to{' '}
						<span className='text-duck-primary-500'>
							{tableName}
						</span>{' '}
						table
					</h2>
				</div>

				{/* Scrollable Form Content */}
				<div className='flex-1 overflow-y-auto min-h-0'>
					<form id='add-row-form' onSubmit={handleSubmit}>
						<div className='p-6 space-y-4'>
							{editableColumns.map((column) => (
								<div key={column.name} className='space-y-2'>
									<label className='flex items-center gap-2 text-duck-white-700 text-duck-sm font-normal'>
										{column.name}
										<span className='text-duck-xxs px-1.5 py-0.5 rounded bg-duck-dark-500 text-duck-white-700 border border-duck-dark-400/50'>
											{column.data_type}
										</span>
									</label>
									<SmartInput
										dataType={column.data_type}
										value={formData[column.name] || ''}
										onChange={(value) =>
											setFormData((prev) => ({
												...prev,
												[column.name]: value,
											}))
										}
										placeholder={column.name}
										className='h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 text-duck-sm'
									/>
								</div>
							))}
						</div>
					</form>
				</div>

				{/* Footer - fixed */}
				<DialogFooter className='p-6 border-t border-duck-dark-400/30 gap-2 shrink-0 bg-duck-dark-700'>
					<Button
						type='button'
						variant='outline'
						onClick={onClose}
						className='bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-500 hover:bg-duck-dark-500 text-duck-sm font-normal'
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button
						type='submit'
						form='add-row-form'
						className='bg-duck-primary-500 hover:bg-duck-primary-600 text-duck-white-500 text-duck-sm font-normal border border-duck-primary-900'
						disabled={isSaving}
					>
						{isSaving ? 'Saving...' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
