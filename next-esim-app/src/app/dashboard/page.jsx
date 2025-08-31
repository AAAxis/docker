import { Suspense } from 'react'
import Dashboard from '../../components/Dashboard'
import Loading from '../../components/Loading'

export const metadata = {
  title: 'Dashboard - eSIM Plans',
  description: 'Manage your eSIM plans, view usage, and access your account settings.',
  keywords: ['eSIM dashboard', 'account management', 'usage tracking'],
  openGraph: {
    title: 'Dashboard - eSIM Plans',
    description: 'Manage your eSIM plans, view usage, and access your account settings.',
    url: '/dashboard',
  },
  alternates: {
    canonical: '/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
