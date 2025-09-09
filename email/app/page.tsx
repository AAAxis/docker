'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import Dashboard from '@/components/Dashboard';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { loading: projectLoading } = useProject();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      // User is not authenticated, show login form
    }
  }, [user, authLoading]);

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginForm />;
  }

  return <Dashboard />;
}
