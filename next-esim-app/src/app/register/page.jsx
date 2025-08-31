import { Suspense } from 'react'
import Register from '../../components/Register'
import Loading from '../../components/Loading'

export const metadata = {
  title: 'Register - eSIM Plans',
  description: 'Create your eSIM Plans account to start buying and managing data plans worldwide.',
  keywords: ['register', 'sign up', 'create account', 'eSIM plans'],
  openGraph: {
    title: 'Register - eSIM Plans',
    description: 'Create your eSIM Plans account to start buying and managing data plans worldwide.',
    url: '/register',
  },
  alternates: {
    canonical: '/register',
  },
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Register />
    </Suspense>
  )
}
