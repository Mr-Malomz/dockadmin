interface SpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

const sizes = {
	sm: 'w-4 h-4 border-2',
	md: 'w-6 h-6 border-2',
	lg: 'w-10 h-10 border-3',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
	return (
		<div
			className={`${sizes[size]} border-duck-white-700 border-t-duck-primary-500 rounded-full animate-spin ${className}`}
		/>
	);
}
