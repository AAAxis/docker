import { Suspense } from 'react'
import BlogPost from '../../../components/BlogPost'
import Loading from '../../../components/Loading'

export async function generateMetadata({ params }) {
  // In a real app, you would fetch the blog post data here
  // and generate dynamic metadata based on the content
  return {
    title: 'Blog Post - eSIM Plans',
    description: 'Read our latest insights about eSIM technology and global connectivity.',
    keywords: ['eSIM blog post', 'connectivity insights', 'travel tips'],
    openGraph: {
      title: 'Blog Post - eSIM Plans',
      description: 'Read our latest insights about eSIM technology and global connectivity.',
      url: `/blog/${params.id}`,
    },
    alternates: {
      canonical: `/blog/${params.id}`,
    },
  }
}

export default function BlogPostPage({ params }) {
  return (
    <Suspense fallback={<Loading />}>
      <BlogPost id={params.id} />
    </Suspense>
  )
}
