import { Suspense } from 'react'
import CheckoutPageClient from './CheckoutPageClient'
import Loading from '../../components/Loading'

export const metadata = {
  title: 'Checkout - eSIM Plans',
  description: 'Complete your eSIM purchase securely. Choose your payment method and get instant activation.',
  keywords: ['eSIM checkout', 'payment', 'purchase', 'activation'],
  openGraph: {
    title: 'Checkout - eSIM Plans',
    description: 'Complete your eSIM purchase securely. Choose your payment method and get instant activation.',
    url: '/checkout',
  },
  alternates: {
    canonical: '/checkout',
  },
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CheckoutPageClient />
    </Suspense>
  )
}
