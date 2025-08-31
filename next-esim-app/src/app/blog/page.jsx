import { Suspense } from 'react'
import Blog from '../../components/Blog'
import Loading from '../../components/Loading'

export const metadata = {
  title: 'Blog - eSIM Plans',
  description: 'Latest news, tips, and insights about eSIM technology, travel connectivity, and global data plans.',
  keywords: ['eSIM blog', 'travel tips', 'connectivity news', 'data plans guide'],
  openGraph: {
    title: 'Blog - eSIM Plans',
    description: 'Latest news, tips, and insights about eSIM technology, travel connectivity, and global data plans.',
    url: '/blog',
  },
  alternates: {
    canonical: '/blog',
  },
}

export default function BlogPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Blog />
    </Suspense>
  )
}
