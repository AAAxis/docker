"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

const Blog = () => {
  const blogPosts = [
    {
      id: 1,
      title: "The Ultimate Guide to eSIM Technology in 2024",
      excerpt: "Discover everything you need to know about eSIM technology, from basic concepts to advanced features that are revolutionizing mobile connectivity worldwide.",
      author: "Sarah Johnson",
      date: "December 15, 2024",
      readTime: "8 min read",
      image: "/images/frontend/blog/686b70785c4a01751871608.png",
      category: "Technology"
    },
    {
      id: 2,
      title: "Top 10 Countries for eSIM Travel in 2024",
      excerpt: "Planning your next adventure? Here are the best destinations where eSIM technology offers seamless connectivity and the most affordable data plans.",
      author: "Michael Chen",
      date: "December 12, 2024",
      readTime: "6 min read",
      image: "/images/frontend/blog/686b71090c13f1751871753.png",
      category: "Travel"
    },
    {
      id: 3,
      title: "eSIM vs Physical SIM: Which is Better for Business?",
      excerpt: "A comprehensive comparison of eSIM and traditional SIM cards for business users, covering security, flexibility, and cost-effectiveness.",
      author: "Emma Rodriguez",
      date: "December 10, 2024",
      readTime: "7 min read",
      image: "/images/frontend/blog/686b713abd1031751871802.png",
      category: "Business"
    },
    {
      id: 4,
      title: "How to Set Up Your First eSIM: Step-by-Step Guide",
      excerpt: "New to eSIM? This beginner-friendly guide walks you through the entire setup process, from purchase to activation on your device.",
      author: "David Park",
      date: "December 8, 2024",
      readTime: "5 min read",
      image: "/images/frontend/blog/686b7149f37a11751871817.png",
      category: "Tutorial"
    },
    {
      id: 5,
      title: "eSIM Security: Protecting Your Digital Identity",
      excerpt: "Learn about the advanced security features of eSIM technology and how it protects your personal data better than traditional SIM cards.",
      author: "Lisa Thompson",
      date: "December 5, 2024",
      readTime: "9 min read",
      image: "/images/frontend/blog/686b716eeb7c11751871854.png",
      category: "Security"
    },
    {
      id: 6,
      title: "The Future of Mobile Connectivity: eSIM Trends 2025",
      excerpt: "Explore upcoming innovations in eSIM technology and how they will shape the future of global mobile connectivity and IoT devices.",
      author: "Alex Kumar",
      date: "December 3, 2024",
      readTime: "10 min read",
      image: "/images/frontend/blog/686b7268210a31751872104.png",
      category: "Innovation"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              eSIM Blog & Insights
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              Stay updated with the latest trends, guides, and insights in eSIM technology and global connectivity
            </p>
          </motion.div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="relative">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {post.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {post.title}
                  </h2>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{post.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{post.readTime}</span>
                    </div>
                    
                    <Link
                      href={`/blog/${post.id}`}
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                    >
                      <span>Read More</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Stay Updated with eSIM News
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Get the latest eSIM insights, travel tips, and technology updates delivered to your inbox
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors duration-200">
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Blog;
