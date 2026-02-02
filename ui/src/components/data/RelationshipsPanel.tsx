import { useState } from 'react';
import { ChevronDown, ChevronRight, Link2 } from 'lucide-react';

interface ForeignKeyInfo {
	column_name: string;
	foreign_table: string;
	foreign_column: string;
}

interface RelationshipsPanelProps {
	foreignKeys: ForeignKeyInfo[];
}

export function RelationshipsPanel({ foreignKeys }: RelationshipsPanelProps) {
	const [isOpen, setIsOpen] = useState(false);

	if (!foreignKeys || foreignKeys.length === 0) return null;

	return (
		<div className='border-t border-duck-dark-400/30 bg-duck-dark-600'>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className='w-full flex items-center justify-between px-4 py-2 text-duck-sm text-duck-white-500 hover:bg-duck-dark-500 hover:text-duck-white-200 transition-colors'
			>
				<div className='flex items-center gap-2'>
					<Link2 size={14} />
					<span className='font-medium'>
						Relationships ({foreignKeys.length})
					</span>
				</div>
				{isOpen ? (
					<ChevronDown size={14} />
				) : (
					<ChevronRight size={14} />
				)}
			</button>

			{isOpen && (
				<div className='px-4 pb-4 pt-2 space-y-2'>
					{foreignKeys.map((fk, i) => (
						<div
							key={i}
							className='flex items-center gap-2 text-duck-sm bg-duck-dark-500/50 p-2 rounded border border-duck-dark-400/30'
						>
							<span className='text-duck-primary-400 font-mono'>
								{fk.column_name}
							</span>
							<span className='text-duck-white-700'>
								refers to
							</span>
							<div className='flex items-center gap-1 bg-duck-dark-400/30 px-1.5 py-0.5 rounded border border-duck-dark-400/50'>
								<span className='text-duck-white-200 font-medium'>
									{fk.foreign_table}
								</span>
								<span className='text-duck-white-500'>.</span>
								<span className='text-duck-white-200 font-medium'>
									{fk.foreign_column}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
