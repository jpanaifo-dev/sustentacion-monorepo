import React from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      toast.success('Operación exitosa', {
        description: 'Los cambios se guardaron correctamente.',
      });
    },
    onError: (error) => {
      toast.error('No se pudo guardar', {
        description: error instanceof Error ? error.message : 'La API rechazó la operación.',
      });
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
