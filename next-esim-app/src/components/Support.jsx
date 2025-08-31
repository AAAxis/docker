"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HelpCircle, 
  MessageCircle, 
  Phone, 
  Mail, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Smartphone,
  CreditCard,
  Wifi,
  Settings
} from 'lucide-react';

const Support = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const supportOptions = [
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Get instant help from our support team",
      availability: "24/7 Available",
      action: "Start Chat",
      color: "blue"
    },
    {
      icon: Mail,
      title: "Email Support",
      description: "Send us a detailed message",
      availability: "Response within 2 hours",
      action: "Send Email",
      color: "green"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak directly with our experts",
      availability: "Mon-Fri 9AM-6PM GMT",
      action: "Call Now",
      color: "purple"
    }
  ];

  const faqCategories = [
    {
      icon: Smartphone,
      title: "Getting Started",
      faqs: [
        {
          question: "What is an eSIM and how does it work?",
          answer: "An eSIM (embedded SIM) is a digital SIM card that's built into your device. Instead of inserting a physical SIM card, you can download and activate a cellular plan directly onto your device. This allows you to switch between carriers and plans without needing to swap physical cards."
        },
        {
          question: "Which devices support eSIM?",
          answer: "Most modern smartphones support eSIM, including iPhone XS and newer, Google Pixel 3 and newer, Samsung Galaxy S20 and newer, and many others. Check your device settings or contact us to confirm compatibility."
        },
        {
          question: "How do I activate my eSIM?",
          answer: "After purchase, you'll receive a QR code via email. Simply scan this code with your device's camera in the cellular settings, and your eSIM will be activated automatically. Detailed instructions are provided for each device type."
        }
      ]
    },
    {
      icon: CreditCard,
      title: "Billing & Plans",
      faqs: [
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, Google Pay, and various local payment methods depending on your region."
        },
        {
          question: "Can I get a refund if I'm not satisfied?",
          answer: "Yes, we offer a 7-day money-back guarantee for unused data plans. If you haven't activated your eSIM or used any data, you can request a full refund within 7 days of purchase."
        },
        {
          question: "Do your plans include unlimited data?",
          answer: "We offer both limited and unlimited data plans. Unlimited plans may have fair usage policies or speed throttling after certain thresholds, which are clearly stated in the plan details."
        }
      ]
    },
    {
      icon: Wifi,
      title: "Connectivity Issues",
      faqs: [
        {
          question: "My eSIM isn't connecting to the network. What should I do?",
          answer: "First, ensure you're in an area with network coverage. Try restarting your device, toggling airplane mode on/off, or manually selecting the network in your cellular settings. If issues persist, contact our support team."
        },
        {
          question: "Why is my data speed slower than expected?",
          answer: "Data speeds can vary based on network congestion, your location, device capabilities, and plan type. Some plans may have speed limitations or throttling after certain usage thresholds."
        },
        {
          question: "Can I use my eSIM for calls and SMS?",
          answer: "Our eSIM plans are primarily data-only. However, you can use VoIP services like WhatsApp, Skype, or FaceTime for calls and messaging over your data connection."
        }
      ]
    },
    {
      icon: Settings,
      title: "Account Management",
      faqs: [
        {
          question: "How do I check my data usage?",
          answer: "You can monitor your data usage through your device's settings or our mobile app. We also send notifications when you're approaching your data limit."
        },
        {
          question: "Can I top up my data plan?",
          answer: "Yes, you can purchase additional data or extend your plan through our website or mobile app. Top-ups are activated instantly once payment is confirmed."
        },
        {
          question: "How do I delete an eSIM from my device?",
          answer: "Go to your device's cellular settings, select the eSIM plan you want to remove, and choose 'Delete eSIM' or 'Remove Plan'. This will permanently delete the eSIM from your device."
        }
      ]
    }
  ];

  const toggleFaq = (categoryIndex, faqIndex) => {
    const key = `${categoryIndex}-${faqIndex}`;
    setOpenFaq(openFaq === key ? null : key);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <HelpCircle className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How Can We Help?
            </h1>
            <p className="text-xl text-blue-100">
              Get the support you need for your eSIM services
            </p>
          </motion.div>
        </div>
      </section>

      {/* Support Options */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Our Support Team</h2>
            <p className="text-xl text-gray-600">Choose the best way to reach us</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {supportOptions.map((option, index) => {
              const IconComponent = option.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300"
                >
                  <div className={`w-16 h-16 bg-${option.color}-100 rounded-full flex items-center justify-center mx-auto mb-6`}>
                    <IconComponent className={`w-8 h-8 text-${option.color}-600`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{option.title}</h3>
                  <p className="text-gray-600 mb-4">{option.description}</p>
                  <div className="flex items-center justify-center text-sm text-gray-500 mb-6">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{option.availability}</span>
                  </div>
                  <button className={`w-full bg-${option.color}-600 hover:bg-${option.color}-700 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200`}>
                    {option.action}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-16"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Direct Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center">
                <Mail className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Email Support</h4>
                <a href="mailto:support@theholylabs.com" className="text-blue-600 hover:text-blue-700">
                  support@theholylabs.com
                </a>
              </div>
              <div className="text-center">
                <Phone className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Phone Support</h4>
                <a href="tel:+972515473526" className="text-blue-600 hover:text-blue-700">
                  +972 51 547 3526
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Find quick answers to common questions</p>
          </motion.div>

          <div className="space-y-8">
            {faqCategories.map((category, categoryIndex) => {
              const CategoryIcon = category.icon;
              return (
                <motion.div
                  key={categoryIndex}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
                  className="bg-gray-50 rounded-xl p-6"
                >
                  <div className="flex items-center mb-6">
                    <CategoryIcon className="w-6 h-6 text-blue-600 mr-3" />
                    <h3 className="text-xl font-bold text-gray-900">{category.title}</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {category.faqs.map((faq, faqIndex) => {
                      const isOpen = openFaq === `${categoryIndex}-${faqIndex}`;
                      return (
                        <div key={faqIndex} className="bg-white rounded-lg shadow-sm">
                          <button
                            onClick={() => toggleFaq(categoryIndex, faqIndex)}
                            className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                          >
                            <span className="font-medium text-gray-900">{faq.question}</span>
                            {isOpen ? (
                              <ChevronUp className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-6 pb-4">
                              <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Support;
