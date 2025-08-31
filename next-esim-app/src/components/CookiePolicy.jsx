import React from 'react';
import { motion } from 'framer-motion';
import { Cookie, Settings, BarChart, Shield, Globe, Trash2 } from 'lucide-react';

const CookiePolicy = () => {
  const cookieTypes = [
    {
      icon: Shield,
      title: "Essential Cookies",
      description: "Required for basic website functionality",
      examples: [
        "Authentication and login sessions",
        "Security and fraud prevention",
        "Shopping cart and checkout process",
        "Language and region preferences"
      ],
      canDisable: false
    },
    {
      icon: BarChart,
      title: "Analytics Cookies",
      description: "Help us understand how visitors use our website",
      examples: [
        "Google Analytics for traffic analysis",
        "Page views and user behavior tracking",
        "Performance monitoring and optimization",
        "A/B testing and feature improvements"
      ],
      canDisable: true
    },
    {
      icon: Settings,
      title: "Functional Cookies",
      description: "Enhance your experience with personalized features",
      examples: [
        "Remember your preferences and settings",
        "Personalized content recommendations",
        "Chat widget and customer support",
        "Social media integration features"
      ],
      canDisable: true
    },
    {
      icon: Globe,
      title: "Marketing Cookies",
      description: "Used to deliver relevant advertisements",
      examples: [
        "Targeted advertising campaigns",
        "Social media advertising pixels",
        "Retargeting and remarketing",
        "Conversion tracking and attribution"
      ],
      canDisable: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <Cookie className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Cookie Policy
            </h1>
            <p className="text-xl text-orange-100">
              Learn about how we use cookies to improve your browsing experience
            </p>
            <p className="text-sm text-orange-200 mt-4">
              Last updated: December 15, 2024
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Introduction */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What Are Cookies?</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Cookies are small text files that are stored on your device when you visit our website. 
              They help us provide you with a better browsing experience by remembering your preferences, 
              analyzing how you use our site, and personalizing content.
            </p>
            <p className="text-gray-600 leading-relaxed">
              This Cookie Policy explains what cookies we use, why we use them, and how you can manage 
              your cookie preferences. By continuing to use our website, you consent to our use of cookies 
              as described in this policy.
            </p>
          </motion.div>

          {/* Cookie Types */}
          <div className="space-y-8">
            {cookieTypes.map((type, index) => {
              const IconComponent = type.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg p-8"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                        <IconComponent className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{type.title}</h3>
                        <p className="text-gray-600">{type.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {type.canDisable ? (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          Optional
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 mb-3">Examples:</h4>
                  <ul className="space-y-2">
                    {type.examples.map((example, exampleIndex) => (
                      <li key={exampleIndex} className="flex items-start">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-600">{example}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>

          {/* Third-Party Cookies */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-8 mt-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Cookies</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We may also use third-party cookies from trusted partners to enhance our services:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Analytics Partners</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Google Analytics</li>
                  <li>• Firebase Analytics</li>
                  <li>• Hotjar (heatmaps)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Marketing Partners</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Google Ads</li>
                  <li>• Facebook Pixel</li>
                  <li>• LinkedIn Insight Tag</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Managing Cookies */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-8 mt-8"
          >
            <div className="flex items-center mb-6">
              <Trash2 className="w-8 h-8 text-orange-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Managing Your Cookie Preferences</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Browser Settings</h4>
                <p className="text-gray-600 mb-3">
                  You can control cookies through your browser settings. Here's how to manage cookies in popular browsers:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li>• <strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
                  <li>• <strong>Firefox:</strong> Preferences → Privacy & Security → Cookies and Site Data</li>
                  <li>• <strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                  <li>• <strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Cookie Preferences</h4>
                <p className="text-gray-600">
                  Your cookie preferences are managed when you first visit our website. 
                  A cookie consent banner will appear, allowing you to customize your 
                  preferences and control which types of cookies are stored on your device.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-8 mt-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions About Cookies?</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you have any questions about our use of cookies, please don't hesitate to contact us:
            </p>
            <div className="space-y-2 text-gray-700">
              <p>Email: <a href="mailto:support@theholylabs.com" className="text-orange-600 hover:text-orange-700">support@theholylabs.com</a></p>
              <p>Phone: <a href="tel:+972515473526" className="text-orange-600 hover:text-orange-700">+972 51 547 3526</a></p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default CookiePolicy;
