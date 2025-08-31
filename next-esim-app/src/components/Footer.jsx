'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'Home', path: '/' },
    { name: 'Destination', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact Us', path: '/contact' }
  ];

  const usefulLinks = [
    { name: 'Privacy Policy', path: '/privacy-policy' },
    { name: 'Terms of Service', path: '/terms-of-service' },
    { name: 'Cookie Policy', path: '/cookie-policy' },
    { name: 'Support', path: '/support' }
  ];

  const socialLinks = [
    { icon: Facebook, url: '#', name: 'Facebook' },
    { icon: Twitter, url: '#', name: 'Twitter' },
    { icon: Instagram, url: '#', name: 'Instagram' },
    { icon: Linkedin, url: '#', name: 'LinkedIn' }
  ];

  return (
    <footer className="footer-area relative bg-gray-900 text-white overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="footer-area__shape absolute inset-0 pointer-events-none">
        <div className="footer-area__shape-left absolute left-0 top-0 w-32 h-full opacity-5 bg-gradient-to-r from-white to-transparent"></div>
        <div className="footer-area__shape-right absolute right-0 top-0 w-32 h-full opacity-5 bg-gradient-to-l from-white to-transparent"></div>
      </div>

      {/* Footer Top */}
      <div className="footer-area__footer-top relative py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Company Info */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="footer-item"
            >
              <Link href="/" className="footer-item__logo inline-block mb-4">
                <img 
                  src="/images/logo_icon/logo.png" 
                  alt="eSIM Store Logo" 
                  className="h-10 w-auto"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'inline';
                  }}
                />
                <span className="text-2xl font-bold text-white hidden">eSIM Store</span>
              </Link>
              <p className="footer-item__desc text-gray-300 mb-6 leading-relaxed">
                Holylabs Ltd - Your trusted partner for global eSIM solutions. Instant activation, 
                worldwide coverage, and secure connectivity for travelers and businesses.
              </p>
              <ul className="social-list flex space-x-4">
                {socialLinks.map((social, index) => {
                  const IconComponent = social.icon;
                  return (
                    <li key={index} className="social-list__item">
                      <a 
                        href={social.url} 
                        className="social-list__link w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors duration-200"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.name}
                      >
                        <IconComponent className="w-5 h-5" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </motion.div>

            {/* Quick Links */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="footer-item"
            >
              <h5 className="footer-item__title text-xl font-semibold mb-6">Quick Links</h5>
              <ul className="footer-menu space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index} className="footer-menu__item">
                    <Link 
                      href={link.path} 
                      className="footer-menu__link text-gray-300 hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Useful Links */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="footer-item"
            >
              <h5 className="footer-item__title text-xl font-semibold mb-6">Useful Links</h5>
              <ul className="footer-menu space-y-3">
                {usefulLinks.map((link, index) => (
                  <li key={index} className="footer-menu__item">
                    <Link 
                      href={link.path} 
                      className="footer-menu__link text-gray-300 hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Contact Info */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="footer-item"
            >
              <h5 className="footer-item__title text-xl font-semibold mb-6">Contact Us</h5>
              <ul className="footer-contact-menu space-y-4">
                <li className="footer-contact-menu__item flex items-start space-x-3">
                  <div className="footer-contact-menu__item-icon w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="footer-contact-menu__item-content">
                    <p className="footer-contact__desc text-gray-300">
                      Holylabs Ltd<br/>
                      275 New North Road Islington # 1432<br/>
                      London, N1 7AA<br/>
                      United Kingdom
                    </p>
                  </div>
                </li>
                <li className="footer-contact-menu__item flex items-start space-x-3">
                  <div className="footer-contact-menu__item-icon w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="footer-contact-menu__item-content">
                    <a 
                      className="footer-contact__desc text-gray-300 hover:text-white transition-colors duration-200" 
                      href="mailto:support@theholylabs.com"
                    >
                      support@theholylabs.com
                    </a>
                  </div>
                </li>
                <li className="footer-contact-menu__item flex items-start space-x-3">
                  <div className="footer-contact-menu__item-icon w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="footer-contact-menu__item-content">
                    <a 
                      className="footer-contact__desc text-gray-300 hover:text-white transition-colors duration-200" 
                      href="tel:+972515473526"
                    >
                      +972 51 547 3526
                    </a>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="bottom-footer py-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bottom-footer-text text-gray-300">
              &copy; {currentYear} <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">eSIM Store</Link>. 
              All Rights Reserved
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
