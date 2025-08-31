import React from 'react';
import QRCode from 'react-qr-code';
import { motion } from 'framer-motion';
import { Download, Share2, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const EsimQrCode = ({ qrCodeData, orderDetails }) => {
  const handleDownload = () => {
    // Create a canvas element to convert QR code to image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Download the image
      const link = document.createElement('a');
      link.download = `esim-qr-${orderDetails?.orderId || 'code'}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = qrCodeData.qr_code_url || qrCodeData.qr_code;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Your eSIM QR Code',
          text: 'Scan this QR code to activate your eSIM',
          url: qrCodeData.qr_code_url || qrCodeData.qr_code
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      handleCopy();
    }
  };

  const handleCopy = () => {
    const qrCodeUrl = qrCodeData.qr_code_url || qrCodeData.qr_code;
    navigator.clipboard.writeText(qrCodeUrl).then(() => {
      toast.success('QR code URL copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy QR code URL');
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6"
    >
      <div className="text-center mb-6">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your eSIM is Ready!
        </h2>
        <p className="text-gray-600">
          Scan the QR code below to activate your eSIM
        </p>
      </div>

      {/* Order Details */}
      {orderDetails && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Order ID:</span>
              <span className="font-mono">{orderDetails.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span>Plan:</span>
              <span>{orderDetails.planName}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>${Math.round(orderDetails.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-green-600 font-semibold">Active</span>
            </div>
          </div>
        </div>
      )}

      {/* QR Code */}
      <div className="flex justify-center mb-6">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
          <QRCode
            value={qrCodeData.qr_code_url || qrCodeData.qr_code}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">How to activate:</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Open your phone's camera app</li>
          <li>2. Point it at the QR code above</li>
          <li>3. Follow the prompts to add the eSIM</li>
          <li>4. Your eSIM will be activated automatically</li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </button>
      </div>

      {/* Additional Info */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Your eSIM will be valid for {orderDetails?.validity || '30'} days from activation
        </p>
      </div>
    </motion.div>
  );
};

export default EsimQrCode;
