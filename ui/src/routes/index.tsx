import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: Index,
});

function Index() {
	return (
		<div className='p-8'>
			<h1 className='text-3xl font-bold text-primary'>
				Welcome to DockAdmin
			</h1>
			<p className='mt-4 text-muted-foreground'>
				Your project is set up with TailwindCSS, ShadCN UI, and TanStack
				Router.
			</p>
		</div>
	);
}
