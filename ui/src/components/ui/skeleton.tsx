interface SkeletonProps {
	className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
	return (
		<div
			className={`bg-duck-dark-500 animate-pulse rounded ${className}`}
		/>
	);
}

// pre-built skeleton variants for common patterns
export function SkeletonText({ lines = 3 }: { lines?: number }) {
	return (
		<div className='space-y-2'>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
				/>
			))}
		</div>
	);
}

export function SkeletonRow() {
	return (
		<div className='flex items-center gap-4 p-4'>
			<Skeleton className='w-10 h-10 rounded-full' />
			<div className='flex-1 space-y-2'>
				<Skeleton className='h-4 w-1/3' />
				<Skeleton className='h-3 w-1/2' />
			</div>
		</div>
	);
}
