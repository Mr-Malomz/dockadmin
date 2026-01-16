import { cn } from '@/lib/utils';

type ViewMode = 'data' | 'schema';

interface DataGridFooterProps {
	rowCount: number;
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
}

export function DataGridFooter({
	rowCount,
	viewMode,
	onViewModeChange,
}: DataGridFooterProps) {
	return (
		<div className='flex items-center justify-between px-4 py-2 border-t border-duck-dark-400/30 bg-duck-dark-500 shrink-0'>
			{/* Row Count on the left */}
			<div className='text-duck-xs text-duck-white-700'>
				{rowCount} row{rowCount !== 1 ? 's' : ''}
			</div>

			{/* Data/Schema Tabs on the right */}
			<div className='flex items-center gap-1 bg-duck-dark-600 rounded-md p-0.5'>
				<button
					onClick={() => onViewModeChange('data')}
					className={cn(
						'px-3 py-1 rounded text-duck-xs font-normal transition-colors',
						viewMode === 'data'
							? 'bg-duck-dark-500 text-duck-white-50'
							: 'text-duck-white-700 hover:text-duck-white-500'
					)}
				>
					Data
				</button>
				<button
					onClick={() => onViewModeChange('schema')}
					className={cn(
						'px-3 py-1 rounded text-duck-xs font-normal transition-colors',
						viewMode === 'schema'
							? 'bg-duck-dark-500 text-duck-white-50'
							: 'text-duck-white-700 hover:text-duck-white-500'
					)}
				>
					Schema
				</button>
			</div>
		</div>
	);
}

export type { ViewMode };
