import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Settings, X, Plus, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
	INITIAL_NEW_COLUMN,
	type NewColumnDefinition,
	COLUMN_TYPES,
} from '@/models';
import type { TableInfo } from '@/models';

// Foreign Key definition
interface ForeignKeyDefinition {
	sourceColumn: string;
	targetTable: string;
	targetColumn: string;
	onDelete: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
}

const INITIAL_FOREIGN_KEY: ForeignKeyDefinition = {
	sourceColumn: '',
	targetTable: '',
	targetColumn: '',
	onDelete: 'RESTRICT',
};

interface CreateTableModalProps {
	open: boolean;
	onClose: () => void;
	onSave: (
		tableName: string,
		columns: NewColumnDefinition[],
		foreignKeys: ForeignKeyDefinition[],
	) => void | Promise<void>;
	availableTables?: TableInfo[]; // Tables available for FK references
}

export function CreateTableModal({
	open,
	onClose,
	onSave,
	availableTables = [],
}: CreateTableModalProps) {
	const [tableName, setTableName] = useState('');
	const [description, setDescription] = useState('');
	const [foreignKeys, setForeignKeys] = useState<ForeignKeyDefinition[]>([]);
	const [columns, setColumns] = useState<NewColumnDefinition[]>([
		// default with ID column only
		{
			name: 'id',
			data_type: 'integer',
			is_primary_key: true,
			nullable: false,
			default_value: '',
			unique: false,
		},
	]);

	// Reset form when modal opens
	useEffect(() => {
		if (open) {
			setTableName('');
			setDescription('');
			setColumns([
				{
					...INITIAL_NEW_COLUMN,
					name: 'id',
					data_type: 'integer',
					is_primary_key: true,
				},
			]);
			setForeignKeys([]);
		}
	}, [open]);

	const handleAddColumn = () => {
		setColumns([...columns, { ...INITIAL_NEW_COLUMN }]);
	};

	const handleRemoveColumn = (index: number) => {
		const newColumns = [...columns];
		newColumns.splice(index, 1);
		setColumns(newColumns);
	};

	const updateColumn = (
		index: number,
		field: keyof NewColumnDefinition,
		value: unknown,
	) => {
		const newColumns = [...columns];
		newColumns[index] = { ...newColumns[index], [field]: value };
		setColumns(newColumns);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		console.log('CreateTableModal handleSubmit called');
		await onSave(tableName, columns, foreignKeys);
		onClose();
	};

	// Foreign key handlers
	const handleAddForeignKey = () => {
		setForeignKeys([...foreignKeys, { ...INITIAL_FOREIGN_KEY }]);
	};

	const handleRemoveForeignKey = (index: number) => {
		const newFKs = [...foreignKeys];
		newFKs.splice(index, 1);
		setForeignKeys(newFKs);
	};

	const updateForeignKey = (
		index: number,
		field: keyof ForeignKeyDefinition,
		value: string,
	) => {
		const newFKs = [...foreignKeys];
		newFKs[index] = { ...newFKs[index], [field]: value };
		setForeignKeys(newFKs);
	};

	// Get columns from a target table (mock - returns common columns)
	// In a real app, this would fetch columns from the API based on table selection
	const getTargetTableColumns = (_tableId: string): string[] => {
		// For now, return common column names. In production, fetch from API.
		return ['id', 'created_at', 'updated_at', 'name', 'email', 'user_id'];
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent
				className='bg-duck-dark-700 border-duck-dark-400/50 text-duck-white-50 p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]'
				style={{ width: '799px', maxWidth: '799px' }}
			>
				{/* Header */}
				<div className='p-6 border-b border-duck-dark-400/30 shrink-0'>
					<h2 className='text-duck-base font-normal text-duck-white-50 flex items-center gap-2'>
						Create a new table under{' '}
						<span className='px-2 py-0.5 rounded bg-duck-dark-500 text-duck-white-500 text-duck-xs font-mono border border-duck-dark-400/50'>
							"REPLACE WITH DB NAME"
						</span>
					</h2>
				</div>

				<div className='flex-1 overflow-y-auto min-h-0'>
					<form id='create-table-form' onSubmit={handleSubmit}>
						{/* Table Details Section */}
						<div className='grid grid-cols-[1fr_448px] border-b border-duck-dark-400/30'>
							<div className='p-6 flex items-start'>
								<span className='text-duck-white-500 text-duck-sm font-normal'>
									Table Details
								</span>
							</div>
							<div className='p-6 space-y-4'>
								<div className='space-y-2'>
									<label className='text-duck-white-700 text-duck-sm font-normal'>
										Name
									</label>
									<Input
										type='text'
										placeholder='e.g. users'
										value={tableName}
										onChange={(e) =>
											setTableName(e.target.value)
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
										value={description}
										onChange={(e) =>
											setDescription(e.target.value)
										}
										className='h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 text-duck-sm'
									/>
								</div>
							</div>
						</div>

						{/* Columns Section */}
						<div className='p-6 space-y-4'>
							<h3 className='text-duck-base font-medium text-duck-white-50 mb-2'>
								Columns
							</h3>

							{/* Columns Header */}
							<div className='grid grid-cols-[200px_140px_1fr_60px_60px] gap-3 px-2 py-1 text-duck-xs text-duck-white-500 uppercase tracking-wide'>
								<div>Name</div>
								<div>Type</div>
								<div>Default Value</div>
								<div className='text-center'>Primary</div>
								<div></div>
							</div>

							{/* Columns List */}
							<div className='space-y-2'>
								{columns.map((col, index) => (
									<div
										key={index}
										className='group grid grid-cols-[200px_140px_1fr_60px_60px] gap-3 items-center p-2 bg-duck-dark-600/50 border border-duck-dark-400/30 rounded-md hover:border-duck-dark-300 transition-colors'
									>
										{/* Name Input */}
										<Input
											value={col.name}
											onChange={(e) =>
												updateColumn(
													index,
													'name',
													e.target.value,
												)
											}
											placeholder='column_name'
											className='h-8 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 text-duck-sm'
										/>

										{/* Type Select */}
										<Select
											value={col.data_type}
											onValueChange={(value) =>
												updateColumn(
													index,
													'data_type',
													value,
												)
											}
										>
											<SelectTrigger className='h-8 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 text-duck-sm'>
												<SelectValue placeholder='Type' />
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

										{/* Default Value Input */}
										<Input
											value={col.default_value || ''}
											onChange={(e) =>
												updateColumn(
													index,
													'default_value',
													e.target.value,
												)
											}
											placeholder='NULL'
											disabled={col.nullable}
											className={`h-8 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 text-duck-sm ${
												col.nullable
													? 'opacity-50 cursor-not-allowed'
													: ''
											}`}
										/>

										{/* Primary Key Checkbox */}
										<div className='flex justify-center'>
											<Checkbox
												checked={col.is_primary_key}
												onCheckedChange={(checked) =>
													updateColumn(
														index,
														'is_primary_key',
														checked === true,
													)
												}
												className='border-duck-dark-300 data-[state=checked]:bg-duck-primary-500 data-[state=checked]:border-duck-primary-500'
											/>
										</div>

										{/* Actions */}
										<div className='flex items-center justify-end gap-1'>
											<DropdownMenu modal={false}>
												<DropdownMenuTrigger asChild>
													<Button
														type='button'
														variant='ghost'
														size='icon'
														className='h-7 w-7 text-duck-white-700 hover:text-duck-white-500 hover:bg-duck-dark-500 relative'
													>
														<Settings size={14} />
														{/* Indicator dot when extra options are set */}
														{(col.unique ||
															col.nullable) && (
															<span className='absolute -top-0.5 -right-0.5 w-2 h-2 bg-duck-primary-500 rounded-full' />
														)}
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent
													align='end'
													className='w-56 bg-duck-dark-600 border-duck-dark-400/50 p-2'
												>
													{/* Unique Toggle */}
													<div className='flex items-center justify-between py-2 px-1'>
														<div>
															<div className='text-duck-sm text-duck-white-500 font-normal'>
																Unique
															</div>
															<div className='text-duck-xs text-duck-white-700'>
																Enforce unique
																values
															</div>
														</div>
														<Switch
															checked={col.unique}
															onCheckedChange={(
																checked,
															) =>
																updateColumn(
																	index,
																	'unique',
																	checked,
																)
															}
															className='data-[state=checked]:bg-duck-primary-500'
														/>
													</div>

													{/* Nullable Toggle - hidden for primary keys */}
													{!col.is_primary_key && (
														<div className='flex items-center justify-between py-2 px-1'>
															<div>
																<div className='text-duck-sm text-duck-white-500 font-normal'>
																	Nullable
																</div>
																<div className='text-duck-xs text-duck-white-700'>
																	Allow NULL
																	values
																</div>
															</div>
															<Switch
																checked={
																	col.nullable
																}
																onCheckedChange={(
																	checked,
																) =>
																	updateColumn(
																		index,
																		'nullable',
																		checked,
																	)
																}
																className='data-[state=checked]:bg-duck-primary-500'
															/>
														</div>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
											<Button
												type='button'
												variant='ghost'
												size='icon'
												onClick={() =>
													handleRemoveColumn(index)
												}
												className='h-7 w-7 text-duck-white-700 hover:text-red-400 hover:bg-duck-dark-500'
											>
												<X size={14} />
											</Button>
										</div>
									</div>
								))}

								<Button
									type='button'
									onClick={handleAddColumn}
									variant='outline'
									className='w-full h-10 border-dashed border-duck-dark-300 text-duck-white-700 hover:bg-duck-dark-600 hover:text-duck-white-500 bg-transparent flex items-center justify-center gap-2'
								>
									<Plus size={16} />
									Add column
								</Button>
							</div>

							{/* Foreign Keys Section */}
							<div className='pt-6 space-y-6'>
								<div>
									<h3 className='text-duck-base font-medium text-duck-white-50 mb-3'>
										Foreign keys
									</h3>

									{/* FK List */}
									<div className='space-y-2'>
										{foreignKeys.map((fk, index) => (
											<div
												key={index}
												className='flex items-center gap-3 p-3 bg-duck-dark-600/50 border border-duck-dark-400/30 rounded-md'
											>
												{/* Target Table (select first) */}
												<Select
													value={fk.targetTable}
													onValueChange={(value) => {
														updateForeignKey(
															index,
															'targetTable',
															value,
														);
														// Auto-select 'id' when table changes
														updateForeignKey(
															index,
															'targetColumn',
															'id',
														);
													}}
												>
													<SelectTrigger className='w-40 h-8 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 text-duck-sm'>
														<SelectValue placeholder='Select table' />
													</SelectTrigger>
													<SelectContent className='bg-duck-dark-600 border-duck-dark-400/50'>
														{availableTables.map(
															(table) => (
																<SelectItem
																	key={
																		table.name
																	}
																	value={
																		table.name
																	}
																	className='text-duck-white-200 focus:bg-duck-dark-200 text-duck-sm'
																>
																	{table.name}
																</SelectItem>
															),
														)}
													</SelectContent>
												</Select>

												<span className='text-duck-white-500'>
													.
												</span>

												{/* Target Column */}
												<Select
													value={fk.targetColumn}
													onValueChange={(value) =>
														updateForeignKey(
															index,
															'targetColumn',
															value,
														)
													}
													disabled={!fk.targetTable}
												>
													<SelectTrigger className='w-32 h-8 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 text-duck-sm'>
														<SelectValue placeholder='Column' />
													</SelectTrigger>
													<SelectContent className='bg-duck-dark-600 border-duck-dark-400/50'>
														{getTargetTableColumns(
															fk.targetTable,
														).map((col) => (
															<SelectItem
																key={col}
																value={col}
																className='text-duck-white-200 focus:bg-duck-dark-200 text-duck-sm'
															>
																{col}
															</SelectItem>
														))}
													</SelectContent>
												</Select>

												{/* Arrow */}
												<ArrowRight
													size={16}
													className='text-duck-white-700 shrink-0'
												/>

												{/* Source Column (from this table) */}
												<Select
													value={fk.sourceColumn}
													onValueChange={(value) =>
														updateForeignKey(
															index,
															'sourceColumn',
															value,
														)
													}
													disabled={!fk.targetTable}
												>
													<SelectTrigger className='w-40 h-8 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 text-duck-sm'>
														<SelectValue placeholder='This table column' />
													</SelectTrigger>
													<SelectContent className='bg-duck-dark-600 border-duck-dark-400/50'>
														{columns
															.filter(
																(c) => c.name,
															)
															.map((col) => (
																<SelectItem
																	key={
																		col.name
																	}
																	value={
																		col.name
																	}
																	className='text-duck-white-200 focus:bg-duck-dark-200 text-duck-sm'
																>
																	{col.name}
																</SelectItem>
															))}
													</SelectContent>
												</Select>

												{/* ON DELETE Action */}
												<Select
													value={fk.onDelete}
													onValueChange={(value) =>
														updateForeignKey(
															index,
															'onDelete',
															value,
														)
													}
												>
													<SelectTrigger className='w-32 h-8 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 text-duck-xs'>
														<SelectValue />
													</SelectTrigger>
													<SelectContent className='bg-duck-dark-600 border-duck-dark-400/50'>
														<SelectItem
															value='RESTRICT'
															className='text-duck-white-200 focus:bg-duck-dark-200 text-duck-xs'
														>
															RESTRICT
														</SelectItem>
														<SelectItem
															value='CASCADE'
															className='text-duck-white-200 focus:bg-duck-dark-200 text-duck-xs'
														>
															CASCADE
														</SelectItem>
														<SelectItem
															value='SET NULL'
															className='text-duck-white-200 focus:bg-duck-dark-200 text-duck-xs'
														>
															SET NULL
														</SelectItem>
														<SelectItem
															value='SET DEFAULT'
															className='text-duck-white-200 focus:bg-duck-dark-200 text-duck-xs'
														>
															SET DEFAULT
														</SelectItem>
														<SelectItem
															value='NO ACTION'
															className='text-duck-white-200 focus:bg-duck-dark-200 text-duck-xs'
														>
															NO ACTION
														</SelectItem>
													</SelectContent>
												</Select>

												{/* Delete FK */}
												<Button
													type='button'
													variant='ghost'
													size='icon'
													onClick={() =>
														handleRemoveForeignKey(
															index,
														)
													}
													className='h-7 w-7 text-duck-white-700 hover:text-red-400 hover:bg-duck-dark-500 shrink-0'
												>
													<X size={14} />
												</Button>
											</div>
										))}

										{/* Add FK Button */}
										<Button
											type='button'
											onClick={handleAddForeignKey}
											variant='outline'
											className='w-full h-10 border-dashed border-duck-dark-300 text-duck-white-700 hover:bg-duck-dark-600 hover:text-duck-white-500 bg-transparent flex items-center justify-center gap-2'
										>
											<Plus size={16} />
											Add foreign key relation
										</Button>
									</div>
								</div>
							</div>
						</div>
					</form>
				</div>

				{/* Footer */}
				<DialogFooter className='p-6 gap-2 border-t border-duck-dark-400/30 shrink-0 bg-duck-dark-700'>
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
						form='create-table-form'
						className='bg-duck-primary-500 hover:bg-duck-primary-600 text-duck-white-500 text-duck-sm font-normal border border-duck-primary-900'
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
