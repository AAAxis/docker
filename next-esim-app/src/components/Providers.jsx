'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../contexts/AuthContext'
import { AdminProvider } from '../contexts/AdminContext'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export default function Providers({ children }) {
  // Create a new QueryClient instance for each render to avoid SSR issues
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AdminProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
