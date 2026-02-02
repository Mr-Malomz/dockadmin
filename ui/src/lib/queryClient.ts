import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client with sensible defaults for caching
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
        },
    },
});

export { QueryClientProvider };
