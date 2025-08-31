import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';

const PrivacyPolicy = () => {
  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: [
        "Personal information you provide when creating an account (name, email, phone number)",
        "Payment information processed securely through our payment partners",
        "Device information and eSIM activation data",
        "Usage data and analytics to improve our services",
        "Communication preferences and support interactions"
      ]
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      content: [
        "Provide and maintain our eSIM services",
        "Process transactions and send service notifications",
        "Improve our products and customer experience",
        "Comply with legal obligations and prevent fraud",
        "Send marketing communications (with your consent)"
      ]
    },
    {
      icon: Lock,
      title: "Data Protection & Security",
      content: [
        "Industry-standard encryption for all data transmission",
        "Secure data centers with 24/7 monitoring",
        "Regular security audits and vulnerability assessments",
        "Limited access to personal data on a need-to-know basis",
        "Compliance with GDPR, CCPA, and other privacy regulations"
      ]
    },
    {
      icon: UserCheck,
      title: "Your Rights",
      content: [
        "Access and review your personal information",
        "Request correction of inaccurate data",
        "Delete your account and associated data",
        "Opt-out of marketing communications",
        "Data portability and export options"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <Shield className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Privacy Policy
            </h1>
            <p className="text-xl text-blue-100">
              Your privacy is important to us. Learn how we collect, use, and protect your information.
            </p>
            <p className="text-sm text-blue-200 mt-4">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              At Holylabs Ltd ("we," "our," or "us"), we are committed to protecting your privacy and ensuring 
              the security of your personal information. This Privacy Policy explains how we collect, use, 
              disclose, and safeguard your information when you use our eSIM services and website.
            </p>
            <p className="text-gray-600 leading-relaxed">
              By using our services, you agree to the collection and use of information in accordance with 
              this Privacy Policy. If you do not agree with our policies and practices, please do not use our services.
            </p>
          </motion.div>

          {/* Main Sections */}
          {sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg p-8 mb-8"
              >
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                </div>
                <ul className="space-y-3">
                  {section.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-600 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}

          {/* Data Sharing */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Sharing and Disclosure</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties without 
              your consent, except in the following circumstances:
            </p>
            <ul className="space-y-3 mb-4">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span className="text-gray-600">Service providers who assist in our operations (payment processors, cloud storage)</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span className="text-gray-600">Legal compliance and law enforcement requests</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span className="text-gray-600">Business transfers (mergers, acquisitions)</span>
              </li>
            </ul>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8"
          >
            <div className="flex items-center mb-6">
              <Mail className="w-8 h-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="space-y-2 text-gray-700">
              <p><strong>Holylabs Ltd</strong></p>
              <p>275 New North Road Islington # 1432</p>
              <p>London, N1 7AA, United Kingdom</p>
              <p>Email: <a href="mailto:support@theholylabs.com" className="text-blue-600 hover:text-blue-700">support@theholylabs.com</a></p>
              <p>Phone: <a href="tel:+972515473526" className="text-blue-600 hover:text-blue-700">+972 51 547 3526</a></p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
