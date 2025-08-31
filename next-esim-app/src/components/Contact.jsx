"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  User, 
  MessageSquare,
  Building,
  Globe
} from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      content: "support@theholylabs.com",
      description: "Send us an email anytime",
      link: "mailto:support@theholylabs.com"
    },
    {
      icon: Phone,
      title: "Call Us",
      content: "+972 51 547 3526",
      description: "Mon-Fri 9AM-6PM GMT",
      link: "tel:+972515473526"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      content: "275 New North Road Islington # 1432, London, N1 7AA, United Kingdom",
      description: "Our headquarters",
      link: null
    },
    {
      icon: Clock,
      title: "Business Hours",
      content: "Monday - Friday: 9:00 AM - 6:00 PM GMT",
      description: "We're here to help",
      link: null
    }
  ];

  const officeLocations = [
    {
      city: "London",
      country: "United Kingdom",
      address: "275 New North Road Islington # 1432",
      postal: "London, N1 7AA",
      phone: "+972 51 547 3526",
      email: "support@theholylabs.com"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <Mail className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Contact Us
            </h1>
            <p className="text-xl text-green-100">
              Get in touch with our team. We're here to help with all your eSIM needs.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Information Cards */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {contactInfo.map((info, index) => {
              const IconComponent = info.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{info.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">{info.description}</p>
                  {info.link ? (
                    <a 
                      href={info.link}
                      className="text-green-600 hover:text-green-700 font-medium break-words"
                    >
                      {info.content}
                    </a>
                  ) : (
                    <p className="text-gray-700 font-medium">{info.content}</p>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Contact Form and Office Info */}
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="What is this regarding?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={5}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </button>
              </form>
            </motion.div>

            {/* Office Information */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center mb-6">
                  <Building className="w-8 h-8 text-green-600 mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Our Office</h2>
                </div>
                
                {officeLocations.map((office, index) => (
                  <div key={index} className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Holylabs Ltd - {office.city}
                      </h3>
                      <div className="space-y-2 text-gray-600">
                        <p className="flex items-start">
                          <MapPin className="w-5 h-5 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                          <span>
                            {office.address}<br />
                            {office.postal}<br />
                            {office.country}
                          </span>
                        </p>
                        <p className="flex items-center">
                          <Phone className="w-5 h-5 mr-2 text-green-600" />
                          <a href={`tel:${office.phone.replace(/\s/g, '')}`} className="text-green-600 hover:text-green-700">
                            {office.phone}
                          </a>
                        </p>
                        <p className="flex items-center">
                          <Mail className="w-5 h-5 mr-2 text-green-600" />
                          <a href={`mailto:${office.email}`} className="text-green-600 hover:text-green-700">
                            {office.email}
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Business Hours */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center mb-6">
                  <Clock className="w-8 h-8 text-green-600 mr-3" />
                  <h3 className="text-xl font-bold text-gray-900">Business Hours</h3>
                </div>
                <div className="space-y-3 text-gray-600">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span className="font-medium">9:00 AM - 6:00 PM GMT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span className="font-medium">10:00 AM - 4:00 PM GMT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span className="font-medium">Closed</span>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>24/7 Support:</strong> Our online support and live chat are available around the clock for urgent issues.
                  </p>
                </div>
              </div>

              {/* Global Coverage */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-8">
                <div className="flex items-center mb-4">
                  <Globe className="w-8 h-8 text-green-600 mr-3" />
                  <h3 className="text-xl font-bold text-gray-900">Global Coverage</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  While our headquarters is in London, our eSIM services provide global coverage 
                  across 200+ countries and regions worldwide.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>• Europe: Full coverage</div>
                  <div>• North America: Full coverage</div>
                  <div>• Asia Pacific: Full coverage</div>
                  <div>• Middle East: Full coverage</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
