import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from '@/components/ui/sonner';

export const Route = createRootRoute({
	component: () => (
		<>
			<Outlet />
			<Toaster
				position='top-right'
				toastOptions={{
					classNames: {
						toast: 'bg-duck-dark-600 border-duck-dark-400/50 text-duck-white-200',
						error: 'bg-red-900/80 border-red-700/50 text-red-100',
						success:
							'bg-duck-primary-900/80 border-duck-primary-700/50 text-duck-primary-100',
					},
				}}
			/>
			<TanStackRouterDevtools />
		</>
	),
});
