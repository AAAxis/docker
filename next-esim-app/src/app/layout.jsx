import { Inter } from 'next/font/google'
import Providers from '../components/Providers'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import CookieConsent from '../components/CookieConsent'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: {
    default: 'eSIM Plans - Global Data Connectivity',
    template: '%s | eSIM Plans'
  },
  description: 'Get affordable eSIM data plans for 200+ countries. Instant activation, no physical SIM needed. Perfect for travelers and international connectivity.',
  keywords: ['eSIM', 'data plans', 'international roaming', 'travel internet', 'global connectivity', 'mobile data'],
  authors: [{ name: 'eSIM Plans Team' }],
  creator: 'eSIM Plans',
  publisher: 'eSIM Plans',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://esimplans.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'eSIM Plans - Global Data Connectivity',
    description: 'Get affordable eSIM data plans for 200+ countries. Instant activation, no physical SIM needed.',
    siteName: 'eSIM Plans',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'eSIM Plans - Global Data Connectivity',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM Plans - Global Data Connectivity',
    description: 'Get affordable eSIM data plans for 200+ countries. Instant activation, no physical SIM needed.',
    images: ['/images/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
            <Footer />
            <CookieConsent />
          </div>
        </Providers>
      </body>
    </html>
  )
}
