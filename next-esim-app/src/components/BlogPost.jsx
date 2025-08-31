"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, User, Clock, ArrowLeft, Share2 } from 'lucide-react';

const BlogPost = ({ slug }) => {
  // Convert slug to id for now, or fetch based on slug
  const id = slug || '1';

  const blogPosts = {
    1: {
      title: "The Ultimate Guide to eSIM Technology in 2024",
      author: "Sarah Johnson",
      date: "December 15, 2024",
      readTime: "8 min read",
      image: "/images/frontend/blog/686b70785c4a01751871608.png",
      category: "Technology",
      content: `
        <p>eSIM technology has revolutionized the way we think about mobile connectivity. As we move into 2024, understanding this technology becomes increasingly important for both consumers and businesses.</p>
        
        <h2>What is eSIM Technology?</h2>
        <p>An eSIM (embedded SIM) is a digital SIM card that's built directly into your device. Unlike traditional physical SIM cards, eSIMs can be programmed remotely, allowing you to switch carriers and plans without needing to physically swap cards.</p>
        
        <h2>Key Benefits of eSIM</h2>
        <ul>
          <li><strong>Convenience:</strong> No more fumbling with tiny SIM cards or SIM ejection tools</li>
          <li><strong>Flexibility:</strong> Switch between carriers and plans instantly</li>
          <li><strong>Multiple Profiles:</strong> Store multiple carrier profiles on one device</li>
          <li><strong>Global Connectivity:</strong> Perfect for international travel</li>
          <li><strong>Enhanced Security:</strong> Harder to remove or tamper with compared to physical SIMs</li>
        </ul>
        
        <h2>How eSIM Works</h2>
        <p>The eSIM chip is permanently embedded in your device during manufacturing. When you want to activate a new plan, you simply scan a QR code or use an app to download the carrier profile directly to your device.</p>
        
        <h2>Device Compatibility</h2>
        <p>Most modern smartphones support eSIM technology, including:</p>
        <ul>
          <li>iPhone XS and newer models</li>
          <li>Google Pixel 3 and newer</li>
          <li>Samsung Galaxy S20 and newer</li>
          <li>Many tablets and smartwatches</li>
        </ul>
        
        <h2>The Future of eSIM</h2>
        <p>As we look ahead, eSIM technology will continue to evolve, with improvements in security, easier activation processes, and broader device support. The technology is set to become the standard for mobile connectivity.</p>
      `
    },
    2: {
      title: "Top 10 Countries for eSIM Travel in 2024",
      author: "Michael Chen",
      date: "December 12, 2024",
      readTime: "6 min read",
      image: "/images/frontend/blog/686b71090c13f1751871753.png",
      category: "Travel",
      content: `
        <p>Traveling with eSIM technology has never been easier. Here are the top destinations where eSIM offers the best connectivity and value for money.</p>
        
        <h2>1. United States</h2>
        <p>With excellent 5G coverage and competitive pricing, the US offers some of the best eSIM experiences for travelers. Major carriers provide comprehensive coverage across all states.</p>
        
        <h2>2. United Kingdom</h2>
        <p>The UK's advanced mobile infrastructure makes it ideal for eSIM users. London and major cities offer exceptional speeds and reliability.</p>
        
        <h2>3. Germany</h2>
        <p>Germany's robust network infrastructure and EU roaming agreements make it a top choice for European travel with eSIM.</p>
        
        <h2>4. Japan</h2>
        <p>Japan's cutting-edge mobile technology and widespread 5G deployment provide excellent eSIM connectivity for visitors.</p>
        
        <h2>5. Australia</h2>
        <p>Australia's major cities offer excellent eSIM coverage, making it perfect for business travelers and tourists alike.</p>
        
        <h2>6. Canada</h2>
        <p>With extensive coverage across urban and rural areas, Canada provides reliable eSIM connectivity for all types of travelers.</p>
        
        <h2>7. Netherlands</h2>
        <p>The Netherlands offers some of Europe's fastest mobile speeds and excellent eSIM plan options.</p>
        
        <h2>8. Singapore</h2>
        <p>As a tech hub, Singapore provides exceptional eSIM connectivity with competitive pricing.</p>
        
        <h2>9. South Korea</h2>
        <p>Known for its advanced mobile infrastructure, South Korea offers premium eSIM experiences.</p>
        
        <h2>10. France</h2>
        <p>France's comprehensive network coverage and EU roaming benefits make it ideal for eSIM travelers.</p>
        
        <h2>Tips for eSIM Travel</h2>
        <ul>
          <li>Purchase your eSIM plan before departure</li>
          <li>Check device compatibility</li>
          <li>Keep your home SIM active for important calls</li>
          <li>Monitor data usage to avoid overage charges</li>
        </ul>
      `
    },
    3: {
      title: "eSIM vs Physical SIM: Which is Better for Business?",
      author: "Emma Rodriguez",
      date: "December 10, 2024",
      readTime: "7 min read",
      image: "/images/frontend/blog/686b713abd1031751871802.png",
      category: "Business",
      content: `
        <p>For businesses considering mobile connectivity options, the choice between eSIM and physical SIM cards involves several important factors.</p>
        
        <h2>Security Comparison</h2>
        <p><strong>eSIM Advantages:</strong></p>
        <ul>
          <li>Cannot be physically removed or stolen</li>
          <li>Remote provisioning reduces security risks</li>
          <li>Encrypted profile downloads</li>
          <li>Better protection against SIM swapping attacks</li>
        </ul>
        
        <p><strong>Physical SIM Considerations:</strong></p>
        <ul>
          <li>Can be physically removed and transferred</li>
          <li>Vulnerable to theft and loss</li>
          <li>Requires physical access for changes</li>
        </ul>
        
        <h2>Cost Analysis</h2>
        <p>eSIM technology can provide significant cost savings for businesses:</p>
        <ul>
          <li>Reduced logistics costs for SIM distribution</li>
          <li>No physical inventory management</li>
          <li>Instant activation and deactivation</li>
          <li>Bulk management capabilities</li>
        </ul>
        
        <h2>Management and Flexibility</h2>
        <p>eSIM offers superior management capabilities for business deployments:</p>
        <ul>
          <li>Remote provisioning and management</li>
          <li>Instant plan changes</li>
          <li>Centralized control systems</li>
          <li>Real-time monitoring and analytics</li>
        </ul>
        
        <h2>Device Compatibility</h2>
        <p>While eSIM adoption is growing, physical SIMs still have broader device support. Consider your device fleet when making decisions.</p>
        
        <h2>Recommendation</h2>
        <p>For most businesses, eSIM technology offers superior benefits in terms of security, management, and cost-effectiveness. However, ensure your device fleet supports eSIM before making the transition.</p>
      `
    },
    4: {
      title: "How to Set Up Your First eSIM: Step-by-Step Guide",
      author: "David Park",
      date: "December 8, 2024",
      readTime: "5 min read",
      image: "/images/frontend/blog/686b7149f37a11751871817.png",
      category: "Tutorial",
      content: `
        <p>Setting up your first eSIM might seem daunting, but it's actually quite straightforward. Follow this comprehensive guide to get connected.</p>
        
        <h2>Before You Start</h2>
        <p>Ensure your device supports eSIM technology and that you have:</p>
        <ul>
          <li>A compatible device (iPhone XS or newer, recent Android phones)</li>
          <li>A stable internet connection (Wi-Fi recommended)</li>
          <li>Your eSIM QR code or activation details</li>
        </ul>
        
        <h2>Step 1: Purchase Your eSIM Plan</h2>
        <p>Choose a plan that suits your needs from a reputable eSIM provider. You'll receive a QR code via email after purchase.</p>
        
        <h2>Step 2: Access Cellular Settings</h2>
        <p><strong>For iPhone:</strong></p>
        <ol>
          <li>Go to Settings > Cellular</li>
          <li>Tap "Add Cellular Plan"</li>
          <li>Use your camera to scan the QR code</li>
        </ol>
        
        <p><strong>For Android:</strong></p>
        <ol>
          <li>Go to Settings > Network & Internet > Mobile Network</li>
          <li>Tap "Add carrier" or "Add mobile plan"</li>
          <li>Scan the QR code or enter details manually</li>
        </ol>
        
        <h2>Step 3: Configure Your eSIM</h2>
        <p>After scanning the QR code:</p>
        <ol>
          <li>Confirm the carrier information</li>
          <li>Choose a label for your plan (e.g., "Travel" or "Work")</li>
          <li>Select which line to use for calls, texts, and data</li>
          <li>Complete the activation process</li>
        </ol>
        
        <h2>Step 4: Test Your Connection</h2>
        <p>Once activated:</p>
        <ul>
          <li>Check that you have signal bars</li>
          <li>Test data connectivity by browsing the web</li>
          <li>Verify the correct plan is active in settings</li>
        </ul>
        
        <h2>Troubleshooting Tips</h2>
        <ul>
          <li>Restart your device if the eSIM doesn't activate immediately</li>
          <li>Ensure you have a strong internet connection during setup</li>
          <li>Contact your eSIM provider if you encounter issues</li>
          <li>Check that your device isn't carrier-locked</li>
        </ul>
        
        <h2>Managing Multiple eSIMs</h2>
        <p>Most devices can store multiple eSIM profiles. You can switch between them in your cellular settings without needing to re-download.</p>
      `
    },
    5: {
      title: "eSIM Security: Protecting Your Digital Identity",
      author: "Lisa Thompson",
      date: "December 5, 2024",
      readTime: "9 min read",
      image: "/images/frontend/blog/686b716eeb7c11751871854.png",
      category: "Security",
      content: `
        <p>As eSIM technology becomes more prevalent, understanding its security implications is crucial for protecting your digital identity and personal data.</p>
        
        <h2>eSIM Security Architecture</h2>
        <p>eSIM technology incorporates several layers of security:</p>
        <ul>
          <li><strong>Hardware Security:</strong> Embedded secure element chip</li>
          <li><strong>Cryptographic Protection:</strong> End-to-end encryption</li>
          <li><strong>Remote Provisioning Security:</strong> Authenticated profile downloads</li>
          <li><strong>Access Control:</strong> Multi-factor authentication</li>
        </ul>
        
        <h2>Advantages Over Physical SIMs</h2>
        <p>eSIMs offer several security benefits compared to traditional SIM cards:</p>
        
        <h3>Physical Security</h3>
        <ul>
          <li>Cannot be physically removed or stolen</li>
          <li>No risk of SIM card cloning through physical access</li>
          <li>Tamper-resistant embedded design</li>
        </ul>
        
        <h3>SIM Swapping Protection</h3>
        <p>eSIMs provide better protection against SIM swapping attacks because:</p>
        <ul>
          <li>Require device-level authentication</li>
          <li>Use encrypted provisioning protocols</li>
          <li>Maintain audit trails of all changes</li>
        </ul>
        
        <h2>Potential Security Risks</h2>
        <p>While eSIMs are generally more secure, some risks remain:</p>
        
        <h3>Remote Attacks</h3>
        <ul>
          <li>Potential for remote provisioning attacks</li>
          <li>Dependency on secure communication channels</li>
          <li>Risk of compromised carrier systems</li>
        </ul>
        
        <h3>Device Security</h3>
        <ul>
          <li>Reliance on device security measures</li>
          <li>Vulnerability to device compromise</li>
          <li>Importance of keeping devices updated</li>
        </ul>
        
        <h2>Best Practices for eSIM Security</h2>
        
        <h3>For Users</h3>
        <ul>
          <li>Only download eSIM profiles from trusted sources</li>
          <li>Keep your device software updated</li>
          <li>Use strong device authentication (PIN, biometrics)</li>
          <li>Monitor your account for unauthorized changes</li>
          <li>Enable two-factor authentication where available</li>
        </ul>
        
        <h3>For Businesses</h3>
        <ul>
          <li>Implement mobile device management (MDM) solutions</li>
          <li>Regular security audits of eSIM deployments</li>
          <li>Employee training on eSIM security practices</li>
          <li>Establish incident response procedures</li>
        </ul>
        
        <h2>Future Security Enhancements</h2>
        <p>The eSIM ecosystem continues to evolve with enhanced security features:</p>
        <ul>
          <li>Improved authentication mechanisms</li>
          <li>Enhanced encryption protocols</li>
          <li>Better integration with device security features</li>
          <li>Advanced threat detection capabilities</li>
        </ul>
        
        <h2>Conclusion</h2>
        <p>eSIM technology represents a significant advancement in mobile security. While no technology is completely risk-free, eSIMs offer substantial security improvements over traditional SIM cards when properly implemented and managed.</p>
      `
    },
    6: {
      title: "The Future of Mobile Connectivity: eSIM Trends 2025",
      author: "Alex Kumar",
      date: "December 3, 2024",
      readTime: "10 min read",
      image: "/images/frontend/blog/686b7268210a31751872104.png",
      category: "Innovation",
      content: `
        <p>As we approach 2025, eSIM technology is poised to transform mobile connectivity in unprecedented ways. Let's explore the trends that will shape the future.</p>
        
        <h2>Market Growth Projections</h2>
        <p>Industry analysts predict explosive growth in eSIM adoption:</p>
        <ul>
          <li>Over 3.4 billion eSIM connections by 2025</li>
          <li>90% of new smartphones to support eSIM by 2025</li>
          <li>Significant growth in IoT device adoption</li>
          <li>Enterprise adoption accelerating rapidly</li>
        </ul>
        
        <h2>Emerging Technologies</h2>
        
        <h3>iSIM Integration</h3>
        <p>Integrated SIM (iSIM) technology will further miniaturize connectivity:</p>
        <ul>
          <li>SIM functionality integrated directly into device processors</li>
          <li>Even smaller form factors for IoT devices</li>
          <li>Reduced manufacturing costs</li>
          <li>Enhanced security through hardware integration</li>
        </ul>
        
        <h3>5G and Beyond</h3>
        <p>eSIM technology will be crucial for next-generation networks:</p>
        <ul>
          <li>Dynamic network slicing capabilities</li>
          <li>Seamless handover between network types</li>
          <li>Enhanced support for edge computing</li>
          <li>Preparation for 6G networks</li>
        </ul>
        
        <h2>IoT Revolution</h2>
        <p>eSIM will drive massive IoT expansion:</p>
        
        <h3>Smart Cities</h3>
        <ul>
          <li>Connected infrastructure management</li>
          <li>Real-time traffic optimization</li>
          <li>Environmental monitoring systems</li>
          <li>Public safety enhancements</li>
        </ul>
        
        <h3>Industrial IoT</h3>
        <ul>
          <li>Predictive maintenance systems</li>
          <li>Supply chain optimization</li>
          <li>Remote equipment monitoring</li>
          <li>Automated quality control</li>
        </ul>
        
        <h2>Consumer Experience Evolution</h2>
        
        <h3>Seamless Connectivity</h3>
        <p>Future eSIM implementations will offer:</p>
        <ul>
          <li>Automatic carrier switching based on coverage</li>
          <li>AI-driven plan optimization</li>
          <li>Predictive data allocation</li>
          <li>Context-aware connectivity preferences</li>
        </ul>
        
        <h3>Enhanced Travel Experience</h3>
        <ul>
          <li>Instant local connectivity upon arrival</li>
          <li>Automatic roaming optimization</li>
          <li>Integrated travel services</li>
          <li>Real-time cost management</li>
        </ul>
        
        <h2>Business Transformation</h2>
        
        <h3>Enterprise Mobility</h3>
        <p>Businesses will benefit from:</p>
        <ul>
          <li>Centralized connectivity management</li>
          <li>Dynamic workforce connectivity</li>
          <li>Enhanced security protocols</li>
          <li>Cost optimization through AI</li>
        </ul>
        
        <h3>New Business Models</h3>
        <ul>
          <li>Connectivity-as-a-Service offerings</li>
          <li>Dynamic pricing models</li>
          <li>Partnership ecosystems</li>
          <li>Value-added services integration</li>
        </ul>
        
        <h2>Regulatory and Standards Evolution</h2>
        <p>The regulatory landscape will continue evolving:</p>
        <ul>
          <li>Global standardization efforts</li>
          <li>Enhanced consumer protection measures</li>
          <li>Privacy regulation compliance</li>
          <li>Cross-border connectivity frameworks</li>
        </ul>
        
        <h2>Challenges and Opportunities</h2>
        
        <h3>Challenges</h3>
        <ul>
          <li>Legacy device compatibility</li>
          <li>Carrier ecosystem coordination</li>
          <li>Security standardization</li>
          <li>Consumer education needs</li>
        </ul>
        
        <h3>Opportunities</h3>
        <ul>
          <li>New revenue streams for carriers</li>
          <li>Enhanced customer experiences</li>
          <li>Innovative service offerings</li>
          <li>Global connectivity solutions</li>
        </ul>
        
        <h2>Conclusion</h2>
        <p>The future of mobile connectivity is bright with eSIM technology leading the charge. As we move toward 2025 and beyond, eSIM will become the foundation for a more connected, efficient, and innovative digital world.</p>
      `
    }
  };

  const post = blogPosts[id];

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">The blog post you're looking for doesn't exist.</p>
          <Link 
            href="/blog" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <section className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link 
            href="/blog" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {post.category}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex items-center justify-between text-gray-600 mb-8">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{post.readTime}</span>
                </div>
              </div>
              
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Image */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-64 md:h-96 object-cover rounded-xl"
            />
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </section>


    </div>
  );
};

export default BlogPost;
