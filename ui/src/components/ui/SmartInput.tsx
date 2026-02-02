import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface SmartInputProps {
	dataType: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	required?: boolean;
}


export function SmartInput({
	dataType,
	value,
	onChange,
	placeholder,
	className = '',
	required,
}: SmartInputProps) {
	const type = dataType.toLowerCase();

	// Date/Time types
	if (type.includes('datetime') || type.includes('timestamp')) {
		return (
			<Input
				type='datetime-local'
				value={formatForDatetimeLocal(value)}
				onChange={(e) => onChange(e.target.value)}
				className={className}
				required={required}
			/>
		);
	}

	if (type === 'date') {
		return (
			<Input
				type='date'
				value={formatForDate(value)}
				onChange={(e) => onChange(e.target.value)}
				className={className}
				required={required}
			/>
		);
	}

	if (type === 'time') {
		return (
			<Input
				type='time'
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={className}
				required={required}
			/>
		);
	}

	// boolean types
	if (type === 'boolean' || type === 'bool') {
		return (
			<div className='flex items-center gap-2 h-10'>
				<Switch
					checked={value === 'true' || value === '1'}
					onCheckedChange={(checked) =>
						onChange(checked ? 'true' : 'false')
					}
					className='data-[state=checked]:bg-duck-primary-500'
				/>
				<span className='text-duck-sm text-duck-white-700'>
					{value === 'true' || value === '1' ? 'True' : 'False'}
				</span>
			</div>
		);
	}

	// numeric types
	if (
		type.includes('int') ||
		type === 'number' ||
		type === 'decimal' ||
		type === 'numeric' ||
		type === 'float' ||
		type === 'double' ||
		type === 'real'
	) {
		return (
			<Input
				type='number'
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={className}
				required={required}
				step={type.includes('int') ? '1' : 'any'}
			/>
		);
	}

	// Text/JSON types - use textarea for longer content
	if (type === 'text' || type === 'json' || type === 'jsonb') {
		return (
			<textarea
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={`min-h-[80px] w-full rounded-md border px-3 py-2 text-duck-sm ${className}`}
				required={required}
			/>
		);
	}

	// default: text input
	return (
		<Input
			type='text'
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			className={className}
			required={required}
		/>
	);
}

// helper to format datetime for datetime-local input
function formatForDatetimeLocal(value: string): string {
	if (!value) return '';
	// Try to parse and format to YYYY-MM-DDTHH:MM
	try {
		const date = new Date(value);
		if (isNaN(date.getTime())) return value;
		return date.toISOString().slice(0, 16);
	} catch {
		return value;
	}
}

// helper to format date for date input
function formatForDate(value: string): string {
	if (!value) return '';
	try {
		const date = new Date(value);
		if (isNaN(date.getTime())) return value;
		return date.toISOString().slice(0, 10);
	} catch {
		return value;
	}
}
