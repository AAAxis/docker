import { Suspense } from 'react'
import AdminDashboard from '../../components/AdminDashboard'
import Loading from '../../components/Loading'

export const metadata = {
  title: 'Admin Dashboard - eSIM Plans',
  description: 'Administrative dashboard for managing eSIM plans, users, and system configuration.',
  keywords: ['admin dashboard', 'eSIM management', 'system administration'],
  openGraph: {
    title: 'Admin Dashboard - eSIM Plans',
    description: 'Administrative dashboard for managing eSIM plans, users, and system configuration.',
    url: '/admin',
  },
  alternates: {
    canonical: '/admin',
  },
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminDashboard />
    </Suspense>
  )
}
