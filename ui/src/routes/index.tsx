import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import Logo from '@/assets/svgs/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import type { ConnectRequest } from '@/types/api';
import {
	type ConnectionForm,
	type DatabaseType,
	DEFAULT_PORTS,
	INITIAL_CONNECTION_FORM,
} from '@/models';

export const Route = createFileRoute('/')({
	component: ConnectionPage,
});

function ConnectionPage() {
	const { isConnected, isLoading, connect } = useAuth();
	const navigate = useNavigate();
	const [form, setForm] = useState<ConnectionForm>(INITIAL_CONNECTION_FORM);
	const [isConnecting, setIsConnecting] = useState(false);

	// Redirect to dashboard if already connected
	if (isConnected && !isLoading) {
		navigate({ to: '/dashboard' });
		return null;
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// validate required fields (SQLite only needs database path)
		if (!form.database) {
			toast.error('Please enter the database name/path');
			return;
		}

		if (form.dbType !== 'sqlite') {
			if (!form.host || !form.port || !form.username || !form.password) {
				toast.error('Please fill in all required fields');
				return;
			}
		}

		setIsConnecting(true);

		try {
			// SQLite sends empty/0 for unused fields
			const credentials: ConnectRequest =
				form.dbType === 'sqlite'
					? {
							host: '',
							port: 0,
							database: form.database,
							username: '',
							password: '',
							db_type: 'sqlite',
						}
					: {
							host: form.host,
							port: parseInt(form.port, 10),
							database: form.database,
							username: form.username,
							password: form.password,
							db_type: form.dbType,
						};

			const result = await connect(credentials);

			if (result.success) {
				toast.success('Connected successfully!');
				navigate({ to: '/dashboard' });
			} else {
				toast.error(result.error || 'Connection failed');
			}
		} catch {
			toast.error('Failed to connect to database');
		} finally {
			setIsConnecting(false);
		}
	};

	const updateForm = (field: keyof ConnectionForm, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));

		// Update default port when database type changes
		if (field === 'dbType') {
			const dbType = value as DatabaseType;
			setForm((prev) => ({
				...prev,
				dbType,
				port: DEFAULT_PORTS[dbType],
			}));
		}
	};

	// show loading spinner while checking auth status
	if (isLoading) {
		return (
			<div className='min-h-screen bg-duck-dark-900 flex items-center justify-center'>
				<Spinner size='lg' />
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-duck-dark-900 flex items-center justify-center p-4'>
			<div className='w-full max-w-[799px] bg-duck-dark-700 rounded-lg border border-duck-dark-400/30 overflow-hidden'>
				<div className='p-6 border-b border-duck-dark-400/30'>
					<Logo />
				</div>

				<form onSubmit={handleSubmit}>
					<div className='grid grid-cols-[1fr_448px] border-b border-duck-dark-400/30'>
						<div className='p-6 flex items-start'>
							<span className='text-duck-white-500 text-duck-sm font-normal'>
								Connection
							</span>
						</div>
						<div className='p-6 space-y-4'>
							<div className='space-y-2'>
								<label className='text-duck-white-700 text-duck-sm font-normal'>
									Database Type
								</label>
								<Select
									value={form.dbType}
									onValueChange={(value) =>
										updateForm('dbType', value)
									}
								>
									<SelectTrigger className='w-full h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 focus:ring-duck-primary-500'>
										<SelectValue placeholder='Select database type' />
									</SelectTrigger>
									<SelectContent className='bg-duck-dark-600 border-duck-dark-400/50'>
										<SelectItem
											value='postgres'
											className='text-duck-white-200 focus:bg-duck-dark-200 text-duck-sm'
										>
											PostgreSQL
										</SelectItem>
										<SelectItem
											value='mysql'
											className='text-duck-white-200 focus:bg-duck-dark-200'
										>
											MySQL
										</SelectItem>
										<SelectItem
											value='sqlite'
											className='text-duck-white-200 focus:bg-duck-dark-200'
										>
											SQLite
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className='space-y-2'>
								<label className='text-duck-white-700 text-duck-sm font-normal'>
									{form.dbType === 'sqlite'
										? 'Database Path'
										: 'Database Name'}
								</label>
								<Input
									type='text'
									placeholder={
										form.dbType === 'sqlite'
											? '/path/to/database.db'
											: 'myapp_production'
									}
									value={form.database}
									onChange={(e) =>
										updateForm('database', e.target.value)
									}
									required
									className='h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 focus:ring-duck-primary-500 focus:border-duck-primary-500'
								/>
							</div>
						</div>
					</div>

					{form.dbType !== 'sqlite' && (
						<div className='grid grid-cols-[1fr_448px] border-b border-duck-dark-400/30'>
							<div className='p-6 flex items-start'>
								<span className='text-duck-white-500 text-duck-sm font-normal'>
									Network
								</span>
							</div>
							<div className='p-6 space-y-4'>
								<div className='space-y-2'>
									<label className='text-duck-white-700 text-duck-sm font-normal'>
										Host
									</label>
									<Input
										type='text'
										placeholder='localhost'
										value={form.host}
										onChange={(e) =>
											updateForm('host', e.target.value)
										}
										required
										className='h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 focus:ring-duck-primary-500 focus:border-duck-primary-500'
									/>
								</div>

								<div className='space-y-2'>
									<label className='text-duck-white-700 text-duck-sm font-normal'>
										Port
									</label>
									<Input
										type='text'
										placeholder='5432'
										value={form.port}
										onChange={(e) =>
											updateForm('port', e.target.value)
										}
										required
										className='h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 focus:ring-duck-primary-500 focus:border-duck-primary-500'
									/>
								</div>
							</div>
						</div>
					)}

					{form.dbType !== 'sqlite' && (
						<div className='grid grid-cols-[1fr_448px] border-b border-duck-dark-400/30'>
							<div className='p-6 flex items-start'>
								<span className='text-duck-white-500 text-duck-sm font-normal'>
									Authentication
								</span>
							</div>
							<div className='p-6 space-y-4'>
								<div className='space-y-2'>
									<label className='text-duck-white-700 text-duck-sm font-normal'>
										Username
									</label>
									<Input
										type='text'
										placeholder='admin'
										value={form.username}
										onChange={(e) =>
											updateForm(
												'username',
												e.target.value,
											)
										}
										required
										className='h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 focus:ring-duck-primary-500 focus:border-duck-primary-500'
									/>
								</div>

								<div className='space-y-2'>
									<label className='text-duck-white-700 text-duck-sm font-normal'>
										Password
									</label>
									<Input
										type='password'
										placeholder='••••••••••'
										value={form.password}
										onChange={(e) =>
											updateForm(
												'password',
												e.target.value,
											)
										}
										required
										className='h-10 bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-800 placeholder:text-duck-dark-300 focus:ring-duck-primary-500 focus:border-duck-primary-500'
									/>
								</div>
							</div>
						</div>
					)}

					<div className='p-6 flex justify-end'>
						<Button
							type='submit'
							disabled={isConnecting}
							className='bg-duck-primary-500 hover:bg-duck-primary-600 text-duck-white-500 text-duck-sm font-medium px-6 border border-duck-primary-900 disabled:opacity-50 disabled:cursor-not-allowed'
						>
							{isConnecting ? (
								<span className='flex items-center gap-2'>
									<Spinner size='sm' />
									Connecting...
								</span>
							) : (
								'Connect'
							)}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
