import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { EditorView } from '@codemirror/view';
import type { ColumnInfo } from '@/models';

interface SchemaViewProps {
	tableName: string;
	columns: ColumnInfo[];
}

export function SchemaView({ tableName, columns }: SchemaViewProps) {
	// Generate SQL CREATE TABLE statement
	const generateCreateTableSQL = () => {
		const lines: string[] = [];

		lines.push(`CREATE TABLE public."${tableName}" (`);

		columns.forEach((column, index) => {
			const parts: string[] = [];
			parts.push(`  "${column.name}"`);
			parts.push(column.dataType);

			if (!column.nullable) {
				parts.push('not null');
			} else {
				parts.push('null');
			}

			const isLast = index === columns.length - 1;
			const constraintExists = columns.some((c) => c.isPrimaryKey);

			if (!isLast || constraintExists) {
				lines.push(parts.join(' ') + ',');
			} else {
				lines.push(parts.join(' '));
			}
		});

		// Add primary key constraint
		const primaryKeys = columns.filter((c) => c.isPrimaryKey);
		if (primaryKeys.length > 0) {
			const pkNames = primaryKeys.map((c) => `"${c.name}"`).join(', ');
			lines.push(
				`  constraint ${tableName}_pkey primary key (${pkNames})`
			);
		}

		lines.push(') TABLESPACE pg_default;');

		return lines.join('\n');
	};

	const sqlCode = generateCreateTableSQL();

	return (
		<div className='flex-1 overflow-auto'>
			<CodeMirror
				value={sqlCode}
				extensions={[
					sql({ dialect: PostgreSQL }),
					EditorView.lineWrapping,
					EditorView.editable.of(false),
				]}
				theme={vscodeDark}
				readOnly={true}
				basicSetup={{
					lineNumbers: true,
					highlightActiveLineGutter: false,
					highlightActiveLine: false,
					foldGutter: false,
				}}
				className='h-full text-duck-sm'
				style={{ height: '100%' }}
			/>
		</div>
	);
}
