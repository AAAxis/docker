import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Users, CreditCard, Shield, AlertTriangle, Scale } from 'lucide-react';

const TermsOfService = () => {
  const sections = [
    {
      icon: Users,
      title: "Acceptance of Terms",
      content: [
        "By accessing and using our eSIM services, you accept and agree to be bound by these Terms of Service",
        "If you do not agree to these terms, you may not use our services",
        "We reserve the right to modify these terms at any time with notice to users",
        "Continued use of our services after changes constitutes acceptance of new terms"
      ]
    },
    {
      icon: CreditCard,
      title: "Service Description & Payments",
      content: [
        "We provide eSIM data plans for mobile connectivity in various countries and regions",
        "All prices are displayed in the applicable currency and include applicable taxes",
        "Payment is required before service activation and is processed securely",
        "Refunds may be available according to our refund policy within specified timeframes",
        "We reserve the right to modify pricing with advance notice to customers"
      ]
    },
    {
      icon: Shield,
      title: "User Responsibilities",
      content: [
        "You must provide accurate and complete information when creating an account",
        "You are responsible for maintaining the confidentiality of your account credentials",
        "You agree to use our services only for lawful purposes and in compliance with local laws",
        "You must not attempt to circumvent security measures or access unauthorized areas",
        "Any misuse of our services may result in account suspension or termination"
      ]
    },
    {
      icon: AlertTriangle,
      title: "Service Limitations & Disclaimers",
      content: [
        "Service availability depends on network coverage and may vary by location",
        "Data speeds and quality may be affected by network conditions and device compatibility",
        "We do not guarantee uninterrupted or error-free service at all times",
        "Emergency services may not be available through our eSIM services",
        "You acknowledge that mobile services have inherent technical limitations"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <FileText className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Terms of Service
            </h1>
            <p className="text-xl text-purple-100">
              Please read these terms carefully before using our eSIM services
            </p>
            <p className="text-sm text-purple-200 mt-4">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Agreement Overview</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              These Terms of Service ("Terms") govern your use of the eSIM services provided by 
              Holylabs Ltd ("Company," "we," "our," or "us"). These Terms constitute a legally 
              binding agreement between you and Holylabs Ltd.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Our services include the provision of eSIM data plans, mobile connectivity solutions, 
              and related digital services accessible through our website and mobile applications.
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
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <IconComponent className="w-6 h-6 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                </div>
                <ul className="space-y-3">
                  {section.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-600 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}

          {/* Intellectual Property */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Intellectual Property Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              All content, features, and functionality of our services, including but not limited to 
              text, graphics, logos, images, and software, are owned by Holylabs Ltd or our licensors 
              and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <ul className="space-y-2 text-gray-600">
              <li>• You may not reproduce, distribute, or create derivative works without permission</li>
              <li>• Our trademarks and service marks may not be used without prior written consent</li>
              <li>• Any feedback or suggestions you provide may be used by us without compensation</li>
            </ul>
          </motion.div>

          {/* Limitation of Liability */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <div className="flex items-center mb-4">
              <Scale className="w-8 h-8 text-purple-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Limitation of Liability</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              To the maximum extent permitted by law, Holylabs Ltd shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages, including but 
              not limited to loss of profits, data, or business opportunities.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-yellow-800 text-sm">
                <strong>Important:</strong> Our total liability for any claims related to our services 
                shall not exceed the amount paid by you for the specific service in question during 
                the twelve months preceding the claim.
              </p>
            </div>
          </motion.div>

          {/* Governing Law */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law & Dispute Resolution</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of 
                England and Wales, without regard to conflict of law principles.
              </p>
              <p>
                Any disputes arising from these Terms or our services shall be resolved through 
                binding arbitration in London, United Kingdom, except where prohibited by local law.
              </p>
              <p>
                You agree to first attempt to resolve any disputes through our customer support 
                team before pursuing formal legal action.
              </p>
            </div>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2 text-gray-700">
              <p><strong>Holylabs Ltd</strong></p>
              <p>275 New North Road Islington # 1432</p>
              <p>London, N1 7AA, United Kingdom</p>
              <p>Email: <a href="mailto:support@theholylabs.com" className="text-purple-600 hover:text-purple-700">support@theholylabs.com</a></p>
              <p>Phone: <a href="tel:+972515473526" className="text-purple-600 hover:text-purple-700">+972 51 547 3526</a></p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
