import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL, MySQL, StandardSQL } from '@codemirror/lang-sql';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { EditorView } from '@codemirror/view';
import type { ColumnInfo, DatabaseType } from '@/models';

interface SchemaViewProps {
	tableName: string;
	columns: ColumnInfo[];
	dbType: DatabaseType;
}

export function SchemaView({ tableName, columns, dbType }: SchemaViewProps) {
	// Generate SQL CREATE TABLE statement
	const generateCreateTableSQL = () => {
		const lines: string[] = [];
		const q = dbType === 'mysql' ? '`' : '"'; // Quote character

		// Table creation line
		if (dbType === 'postgres') {
			lines.push(`CREATE TABLE public.${q}${tableName}${q} (`);
		} else {
			lines.push(`CREATE TABLE ${q}${tableName}${q} (`);
		}

		columns.forEach((column, index) => {
			const parts: string[] = [];
			parts.push(`  ${q}${column.name}${q}`);
			parts.push(column.data_type);

			if (!column.nullable) {
				parts.push('NOT NULL');
			} else {
				parts.push('NULL');
			}

			// Add constraints inline for simplicity in view, though PK is usually separate
			if (dbType === 'mysql' && column.is_primary_key) {
				parts.push('AUTO_INCREMENT');
			}

			const isLast = index === columns.length - 1;
			const constraintExists = columns.some((c) => c.is_primary_key);

			// Logic for comma differs slightly if we add constraints at the end
			// For this simple view, we'll always add PK at the end if it exists
			if (!isLast || constraintExists) {
				lines.push(parts.join(' ') + ',');
			} else {
				lines.push(parts.join(' '));
			}
		});

		// Add primary key constraint
		const primaryKeys = columns.filter((c) => c.is_primary_key);
		if (primaryKeys.length > 0) {
			const pkNames = primaryKeys
				.map((c) => `${q}${c.name}${q}`)
				.join(', ');
			if (dbType === 'mysql') {
				lines.push(`  PRIMARY KEY (${pkNames})`);
			} else {
				lines.push(
					`  CONSTRAINT ${tableName}_pkey PRIMARY KEY (${pkNames})`,
				);
			}
		}

		// Close table definition
		if (dbType === 'postgres') {
			lines.push(') TABLESPACE pg_default;');
		} else if (dbType === 'mysql') {
			lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;');
		} else {
			lines.push(');');
		}

		return lines.join('\n');
	};

	const sqlCode = generateCreateTableSQL();

	// Select appropriate dialect for syntax highlighting
	const dialect =
		dbType === 'postgres'
			? PostgreSQL
			: dbType === 'mysql'
				? MySQL
				: StandardSQL;

	return (
		<div className='flex-1 overflow-auto'>
			<CodeMirror
				value={sqlCode}
				extensions={[
					sql({ dialect }),
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
