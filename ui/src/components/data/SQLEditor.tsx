import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { json } from '@codemirror/lang-json';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { EditorView } from '@codemirror/view';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { TableRow as RowData } from '@/models';

interface QueryResult {
	status: 'success' | 'error' | 'idle';
	time: number | null;
	size: string | null;
	columns: string[];
	rows: RowData[];
	error?: string;
	// For non-data operations (INSERT, UPDATE, DELETE)
	message?: string;
	rowsAffected?: number;
}

interface SQLEditorProps {
	onRun: (query: string) => Promise<QueryResult>;
}

export function SQLEditor({ onRun }: SQLEditorProps) {
	const [query, setQuery] = useState('select * from "user"');
	const [isRunning, setIsRunning] = useState(false);
	const [result, setResult] = useState<QueryResult>({
		status: 'idle',
		time: null,
		size: null,
		columns: [],
		rows: [],
	});

	const handleRun = async () => {
		setIsRunning(true);
		try {
			const queryResult = await onRun(query);
			setResult(queryResult);
		} catch (error) {
			setResult({
				status: 'error',
				time: null,
				size: null,
				columns: [],
				rows: [],
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		} finally {
			setIsRunning(false);
		}
	};

	// Check if this is a non-data result (INSERT, UPDATE, DELETE)
	const isMessageResult =
		result.status === 'success' &&
		result.message &&
		result.rows.length === 0;

	// Format the message result as JSON for display
	const messageResultJson = isMessageResult
		? JSON.stringify(
				{
					message: result.message,
					...(result.rowsAffected !== undefined && {
						rows_affected: result.rowsAffected,
					}),
				},
				null,
				2
			)
		: '';

	return (
		<div className='flex-1 flex flex-col min-h-0 overflow-hidden'>
			{/* Header */}
			<div className='flex items-center justify-between px-6 pt-8 pb-3 shrink-0 border-b border-duck-dark-400/30'>
				<h1 className='text-duck-lg font-normal text-duck-white-500'>
					SQL Editor
				</h1>
				<Button
					onClick={handleRun}
					disabled={isRunning}
					className='bg-duck-primary-500 hover:bg-duck-primary-600 text-duck-white-500 text-duck-sm font-normal border border-duck-primary-900 px-6'
				>
					{isRunning ? 'Running...' : 'Run'}
				</Button>
			</div>

			{/* Code Editor */}
			<div className='px-6 shrink-0 mt-3' style={{ height: '300px' }}>
				<div className='h-full border border-duck-dark-400/30 rounded overflow-hidden'>
					<CodeMirror
						value={query}
						onChange={(value) => setQuery(value)}
						extensions={[sql({ dialect: PostgreSQL })]}
						theme={vscodeDark}
						basicSetup={{
							lineNumbers: true,
							highlightActiveLineGutter: true,
							highlightActiveLine: true,
							foldGutter: false,
						}}
						className='h-full'
						style={{ height: '100%' }}
					/>
				</div>
			</div>

			{/* Results Section */}
			<div className='flex-1 flex flex-col min-h-0 mt-4 overflow-hidden border-t border-duck-dark-400/30'>
				{/* Status Bar */}
				{result.status !== 'idle' && (
					<div className='flex items-center gap-6 px-6 py-4 shrink-0 border-b border-duck-dark-400/30'>
						<div className='flex items-center gap-2'>
							<span className='text-duck-xs text-duck-white-700'>
								Status:
							</span>
							<span
								className={`text-duck-xs font-medium ${
									result.status === 'success'
										? 'text-duck-primary-500'
										: 'text-red-400'
								}`}
							>
								{result.status === 'success'
									? 'Success'
									: 'Error'}
							</span>
						</div>
						{result.time !== null && (
							<div className='flex items-center gap-2'>
								<span className='text-duck-xs text-duck-white-700'>
									Time:
								</span>
								<span className='text-duck-xs text-duck-primary-500'>
									{result.time} ms
								</span>
							</div>
						)}
						{result.size && (
							<div className='flex items-center gap-2'>
								<span className='text-duck-xs text-duck-white-700'>
									Size:
								</span>
								<span className='text-duck-xs text-duck-primary-500'>
									{result.size}
								</span>
							</div>
						)}
						{result.rowsAffected !== undefined && (
							<div className='flex items-center gap-2'>
								<span className='text-duck-xs text-duck-white-700'>
									Rows Affected:
								</span>
								<span className='text-duck-xs text-duck-primary-500'>
									{result.rowsAffected}
								</span>
							</div>
						)}
					</div>
				)}

				{/* Error Message */}
				{result.status === 'error' && result.error && (
					<div className='px-6 py-2 text-red-400 text-duck-xs'>
						{result.error}
					</div>
				)}

				{/* Message Result (for INSERT, UPDATE, DELETE) - JSON view */}
				{isMessageResult && (
					<div className='flex-1 overflow-auto px-6 py-4'>
						<CodeMirror
							value={messageResultJson}
							extensions={[
								json(),
								EditorView.editable.of(false),
								EditorView.lineWrapping,
							]}
							theme={vscodeDark}
							readOnly={true}
							basicSetup={{
								lineNumbers: true,
								highlightActiveLineGutter: false,
								highlightActiveLine: false,
								foldGutter: false,
							}}
						/>
					</div>
				)}

				{/* Results Table */}
				{result.status === 'success' && result.rows.length > 0 && (
					<div className='flex-1 overflow-auto'>
						<Table className='w-auto'>
							<TableHeader>
								<TableRow className='border-b border-duck-dark-400/30 bg-duck-dark-500 hover:bg-duck-dark-500'>
									<TableHead className='w-10 px-3 border-l border-duck-dark-400/30'>
										<Checkbox className='border-duck-dark-300 data-[state=checked]:bg-duck-primary-500 data-[state=checked]:border-duck-primary-500' />
									</TableHead>
									{result.columns.map((column) => (
										<TableHead
											key={column}
											className='text-duck-white-700 text-duck-xs font-normal px-3 py-2 whitespace-nowrap border-l border-duck-dark-400/30'
										>
											{column}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{result.rows.map((row, index) => (
									<TableRow
										key={index}
										className='border-b border-duck-dark-400/30 bg-duck-dark-600 hover:bg-duck-dark-500'
									>
										<TableCell className='w-10 px-3 border-l border-duck-dark-400/30'>
											<Checkbox className='border-duck-dark-300 data-[state=checked]:bg-duck-primary-500 data-[state=checked]:border-duck-primary-500' />
										</TableCell>
										{result.columns.map((column) => (
											<TableCell
												key={column}
												className='text-duck-white-500 text-duck-sm px-3 py-2 whitespace-nowrap border-l border-duck-dark-400/30'
											>
												{row[column] !== null &&
												row[column] !== undefined ? (
													String(row[column])
												) : (
													<span className='text-duck-dark-300'>
														NULL
													</span>
												)}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}

				{/* Empty State */}
				{result.status === 'idle' && (
					<div className='flex-1 flex items-center justify-center text-duck-white-700 text-duck-sm'>
						Run a query to see results
					</div>
				)}
			</div>
		</div>
	);
}

export type { QueryResult };
