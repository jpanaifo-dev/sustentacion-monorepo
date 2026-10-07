import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './app/providers/query-provider';
import { AuthProvider } from './app/providers/auth-provider';
import { router } from './app/router';
import { Toaster } from 'sonner';

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
