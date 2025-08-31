'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Check } from 'lucide-react';
import Link from 'next/link';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    }

    // For testing: Add a way to reset cookie consent
    // You can call this in browser console: window.resetCookieConsent()
    window.resetCookieConsent = () => {
      localStorage.removeItem('cookieConsent');
      setShowBanner(true);
      console.log('Cookie consent reset - banner should appear');
    };
  }, []);

  const handleAcceptAll = () => {
    const consent = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(consent));
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const consent = {
      essential: true, // Essential cookies cannot be rejected
      analytics: false,
      marketing: false,
      functional: false,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(consent));
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <>
          {/* Cookie Banner */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-2xl"
          >
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <Cookie className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      We use cookies to enhance your experience
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      We use cookies to provide you with the best possible experience on our website. 
                      Some cookies are essential for the site to function, while others help us improve our services and understand how you use our site.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBanner(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-4 text-sm mb-4">
                <Link 
                  href="/cookies" 
                  className="text-orange-600 hover:text-orange-700 underline transition-colors duration-200"
                >
                  Cookie Policy
                </Link>
                <Link 
                  href="/privacy" 
                  className="text-orange-600 hover:text-orange-700 underline transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleRejectAll}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Reject All
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200 font-medium flex items-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accept All
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;