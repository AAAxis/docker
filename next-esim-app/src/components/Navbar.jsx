'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Menu, X, Globe } from 'lucide-react';

const Navbar = () => {
  const { currentUser, logout, userProfile } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
                    <Link href="/" className="relative flex items-center">
            <img
              src="/images/logo_icon/logo.png"
              alt="eSIM Store Logo"
              className="h-8 w-auto"
            />
            <span className="text-2xl font-bold text-gray-900 absolute left-8">eSIM</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
            >
              Plans
            </Link>
            {currentUser && (
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
              >
                Dashboard
              </Link>
            )}
            {(currentUser?.email === 'admin@example.com' || userProfile?.role === 'admin') && (
              <Link
                href="/admin"
                className="text-red-600 hover:text-red-700 transition-colors duration-200 font-semibold"
              >
                Admin
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  Welcome, {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Plans
              </Link>
              {currentUser && (
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              {(currentUser?.email === 'admin@example.com' || userProfile?.role === 'admin') && (
                <Link
                  href="/admin"
                  className="block px-3 py-2 text-red-600 hover:text-red-700 transition-colors duration-200 font-semibold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              {currentUser ? (
                <div className="px-3 py-2">
                  <span className="text-gray-700 block mb-2">
                    Welcome, {currentUser.displayName || currentUser.email}
                  </span>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="block px-3 py-2 bg-blue-600 text-white rounded-lg hover:text-blue-700 transition-colors duration-200 mx-3"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
