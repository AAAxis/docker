'use client';

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const EsimPlans = dynamic(() => import('../components/EsimPlans'), {
  loading: () => <div className="animate-pulse">Loading plans...</div>,
  ssr: false
})

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-24 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-float"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-indigo-300 rounded-full opacity-20 animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-purple-200 rounded-full opacity-20 animate-float"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Global eSIM
            <span className="text-gradient block mt-2"> Data Plans</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
            Get instant mobile data in 200+ countries including <span className="font-semibold text-blue-600">South Korea</span>. 
            No physical SIM needed. Activate anywhere, anytime with our global eSIM network.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button 
              onClick={() => document.getElementById('esim-plans').scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary text-lg px-8 py-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              View Plans
            </button>
            <a 
              href="/blog"
              className="btn-secondary text-lg px-8 py-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 inline-block text-center"
            >
              Learn More
            </a>
          </div>
          
          {/* Hero Image/Illustration */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="text-white text-center">
                  <div className="text-4xl mb-2">🌍</div>
                  <h3 className="font-semibold">200+ Countries</h3>
                  <p className="text-blue-100 text-sm">Global Coverage</p>
                </div>
                <div className="text-white text-center">
                  <div className="text-4xl mb-2">⚡</div>
                  <h3 className="font-semibold">Instant Activation</h3>
                  <p className="text-blue-100 text-sm">No Waiting</p>
                </div>
                <div className="text-white text-center">
                  <div className="text-4xl mb-2">💰</div>
                  <h3 className="font-semibold">Best Prices</h3>
                  <p className="text-blue-100 text-sm">Affordable Plans</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* Main Content */}
      <section id="esim-plans" className="py-16 scroll-mt-20">
        <div className="container mx-auto px-4">
          <Suspense fallback={<div className="animate-pulse">Loading plans...</div>}>
            <EsimPlans />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
