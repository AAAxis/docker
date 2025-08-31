import { Suspense } from 'react'
import Login from '../../components/Login'
import Loading from '../../components/Loading'

export const metadata = {
  title: 'Login - eSIM Plans',
  description: 'Sign in to your eSIM Plans account to manage your data plans and settings.',
  keywords: ['login', 'sign in', 'eSIM account', 'authentication'],
  openGraph: {
    title: 'Login - eSIM Plans',
    description: 'Sign in to your eSIM Plans account to manage your data plans and settings.',
    url: '/login',
  },
  alternates: {
    canonical: '/login',
  },
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Login />
    </Suspense>
  )
}
