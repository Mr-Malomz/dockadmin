import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
	type NewColumnDefinition,
	type ColumnInfo,
	INITIAL_NEW_COLUMN,
	COLUMN_TYPES,
} from '@/models';
import { useState, useEffect } from 'react';

interface ColumnModalProps {
	open: boolean;
	onClose: () => void;
	tableName: string;
	onSave: (column: NewColumnDefinition) => void;
	/** If provided, the modal will be in "edit" mode with pre-filled data */
	editingColumn?: ColumnInfo | null;
}

export function ColumnModal({
	open,
	onClose,
	tableName,
	onSave,
	editingColumn,
}: ColumnModalProps) {
	const [column, setColumn] =
		useState<NewColumnDefinition>(INITIAL_NEW_COLUMN);

	const isEditMode = !!editingColumn;

	// Reset or populate form when modal opens
	useEffect(() => {
		if (open) {
			if (editingColumn) {
				// Edit mode: populate with existing column data
				setColumn({
					name: editingColumn.name,
					description: '',
					data_type: editingColumn.data_type,
					default_value: editingColumn.default_value || '',
					is_primary_key: editingColumn.is_primary_key,
					nullable: editingColumn.nullable,
					unique: false, // ColumnInfo doesn't have unique, default to false
				});
			} else {
				// Add mode: reset to initial values
				setColumn(INITIAL_NEW_COLUMN);
			}
		}
	}, [open, editingColumn]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(column);
		onClose();
	};

	const updateColumn = (field: keyof NewColumnDefinition, value: unknown) => {
		setColumn((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent
				className='bg-duck-dark-700 border-duck-dark-400/50 text-duck-white-50 p-0 gap-0'
				style={{ width: '799px', maxWidth: '799px' }}
			>
				{/* Header */}
				<div className='p-6 border-b border-duck-dark-400/30'>
					<h2 className='text-duck-base font-normal text-duck-white-50'>
						{isEditMode ? 'Edit column in' : 'Add new column to'}{' '}
						<span className='text-duck-primary-500'>
							{tableName}
						</span>{' '}
						table
					</h2>
				</div>

				<form onSubmit={handleSubmit}>
					{/* General Section */}
					<div className='grid grid-cols-[1fr_448px] border-b border-duck-dark-400/30'>
						<div className='p-6 flex items-start'>
							<span className='text-duck-white-500 text-duck-sm font-normal'>
								General
							</span>
						</div>
						<div className='p-6 space-y-4'>
							<div className='space-y-2'>
								<label className='text-duck-white-700 text-duck-sm font-normal'>
									Name
								</label>
								<Input
									type='text'
									placeholder='column_name'
									value={column.name}
									onChange={(e) =>
										updateColumn('name', e.target.value)
									}
									required
									className='h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 text-duck-sm'
								/>
							</div>

							<div className='space-y-2'>
								<label className='text-duck-white-700 text-duck-sm font-normal'>
									Description (optional)
								</label>
								<Input
									type='text'
									placeholder=''
									value={column.description || ''}
									onChange={(e) =>
										updateColumn(
											'description',
											e.target.value,
										)
									}
									className='h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 text-duck-sm'
								/>
							</div>
						</div>
					</div>

					{/* Data Type Section */}
					<div className='grid grid-cols-[1fr_448px] border-b border-duck-dark-400/30'>
						<div className='p-6 flex items-start'>
							<span className='text-duck-white-500 text-duck-sm font-normal'>
								Data Type
							</span>
						</div>
						<div className='p-6 space-y-4'>
							<div className='space-y-2'>
								<label className='text-duck-white-700 text-duck-sm font-normal'>
									Type
								</label>
								<Select
									value={column.data_type}
									onValueChange={(value) =>
										updateColumn('data_type', value)
									}
								>
									<SelectTrigger className='w-full h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800'>
										<SelectValue placeholder='Choose a column type' />
									</SelectTrigger>
									<SelectContent className='bg-duck-dark-600 border-duck-dark-400/50'>
										{COLUMN_TYPES.map((type) => (
											<SelectItem
												key={type}
												value={type}
												className='text-duck-white-200 focus:bg-duck-dark-200 text-duck-sm'
											>
												{type}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className='space-y-2'>
								<label className='text-duck-white-700 text-duck-sm font-normal'>
									Default Value
								</label>
								<Input
									type='text'
									placeholder='NULL'
									value={column.default_value}
									onChange={(e) =>
										updateColumn(
											'default_value',
											e.target.value,
										)
									}
									className='h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 text-duck-sm'
								/>
							</div>
						</div>
					</div>

					{/* Constraints Section */}
					<div className='grid grid-cols-[1fr_448px] border-b border-duck-dark-400/30'>
						<div className='p-6 flex items-start'>
							<span className='text-duck-white-500 text-duck-sm font-normal'>
								Constraints
							</span>
						</div>
						<div className='p-6 space-y-5'>
							{/* Primary Key */}
							<div className='flex items-start gap-3'>
								<Switch
									checked={column.is_primary_key}
									onCheckedChange={(checked) =>
										updateColumn('is_primary_key', checked)
									}
									className='data-[state=checked]:bg-duck-primary-500 mt-0.5'
								/>
								<div>
									<div className='text-duck-sm text-duck-white-500 font-normal'>
										Primary Key
									</div>
									<div className='text-duck-xs text-duck-white-700 mt-0.5'>
										A primary key indicates that a column
										can be used as a unique identifier for
										rows in the table
									</div>
								</div>
							</div>

							{/* Nullable */}
							<div className='flex items-start gap-3'>
								<Switch
									checked={column.nullable}
									onCheckedChange={(checked) =>
										updateColumn('nullable', checked)
									}
									className='data-[state=checked]:bg-duck-primary-500 mt-0.5'
								/>
								<div>
									<div className='text-duck-sm text-duck-white-500 font-normal'>
										Nullable
									</div>
									<div className='text-duck-xs text-duck-white-700 mt-0.5'>
										Allow the column to use a NULL value if
										no value is provided
									</div>
								</div>
							</div>

							{/* Unique */}
							<div className='flex items-start gap-3'>
								<Switch
									checked={column.unique}
									onCheckedChange={(checked) =>
										updateColumn('unique', checked)
									}
									className='data-[state=checked]:bg-duck-primary-500 mt-0.5'
								/>
								<div>
									<div className='text-duck-sm text-duck-white-500 font-normal'>
										Unique
									</div>
									<div className='text-duck-xs text-duck-white-700 mt-0.5'>
										Enforce values in the column to be
										unique across rows
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Footer with Cancel and Save buttons */}
					<DialogFooter className='p-6 gap-2'>
						<Button
							type='button'
							variant='outline'
							onClick={onClose}
							className='bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-500 hover:bg-duck-dark-500 text-duck-sm font-normal'
						>
							Cancel
						</Button>
						<Button
							type='submit'
							className='bg-duck-primary-500 hover:bg-duck-primary-600 text-duck-white-500 text-duck-sm font-normal border border-duck-primary-900'
						>
							{isEditMode ? 'Save Changes' : 'Save'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
