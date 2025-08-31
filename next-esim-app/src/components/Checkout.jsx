"use client";

'use client';

import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { paymentService } from '../services/paymentService';
import { esimService } from '../services/esimService';
import { configService } from '../services/configService';
import { motion } from 'framer-motion';
import { CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const Checkout = ({ plan, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [stripeMode, setStripeMode] = useState('test');
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    // Load admin's Stripe configuration
    const loadStripeConfig = async () => {
      try {
        setConfigLoading(true);
        const mode = await configService.getStripeMode();
        setStripeMode(mode);
        console.log('✅ Stripe mode loaded:', mode);
        
        // Get the appropriate Stripe publishable key
        const publishableKey = configService.getStripePublishableKey(mode);
        if (!publishableKey) {
          setError('Stripe is not configured for this mode');
          toast.error('Payment system not configured');
          return;
        }
        
        // Create payment intent after config is loaded
        if (plan) {
          await createPaymentIntent();
        }
      } catch (err) {
        console.error('❌ Error loading Stripe config:', err);
        setError('Failed to load payment configuration');
        toast.error('Payment configuration failed');
      } finally {
        setConfigLoading(false);
      }
    };

    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        const intent = await paymentService.createPaymentIntent(
          plan.price * 100, // Convert to cents
          'usd',
          {
            planId: plan.id,
            planName: plan.name,
            customerEmail: 'customer@example.com', // Get from user context
            stripeMode: stripeMode // Pass the mode to the payment service
          }
        );
        setPaymentIntent(intent);
      } catch (err) {
        setError('Failed to initialize payment');
        toast.error('Payment initialization failed');
      } finally {
        setLoading(false);
      }
    };

    loadStripeConfig();
  }, [plan, stripeMode]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create eSIM order first
      const orderData = {
        planId: plan.id,
        customerEmail: 'customer@example.com', // Get from user context
        amount: plan.price,
        currency: 'usd'
      };

      const order = await esimService.createOrder(orderData);

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              email: 'customer@example.com', // Get from user context
            },
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        toast.error(stripeError.message);
      } else if (confirmedIntent.status === 'succeeded') {
        // Payment successful, get eSIM QR code
        const qrCode = await esimService.getEsimQrCode(order.id);
        
        toast.success('Payment successful! Your eSIM is ready.');
        onSuccess({
          order,
          qrCode,
          paymentIntent: confirmedIntent
        });
      }
    } catch (err) {
      setError('Payment failed. Please try again.');
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!plan) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">No plan selected for checkout</p>
      </div>
    );
  }

  // Check if configuration is loading
  if (configLoading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Loading Payment Configuration
          </h3>
          <p className="text-gray-600">
            Please wait while we set up your payment...
          </p>
        </div>
      </div>
    );
  }

  // Check if Stripe is properly configured
  if (error && error.includes('not configured')) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Payment Configuration Required
          </h3>
          <p className="text-gray-600 mb-4">
            Stripe payment processing is not configured. Please contact support.
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Checkout</h2>
        <p className="text-gray-600">Complete your eSIM purchase</p>
        
        {/* Stripe Mode Indicator */}
        <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <span className="mr-2">
            {stripeMode === 'test' ? '🧪' : '🚀'}
          </span>
          {stripeMode === 'test' ? 'Test Mode' : 'Live Mode'}
          {stripeMode === 'test' && (
            <span className="ml-2 text-yellow-600">(No real charges)</span>
          )}
        </div>
      </div>

      {/* Plan Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">{plan.name}</h3>
        <div className="flex justify-between text-sm text-gray-600">
          <span>{plan.data} {plan.dataUnit}</span>
          <span>{plan.validity} days</span>
        </div>
        <div className="text-right mt-2">
          <span className="text-2xl font-bold text-gray-900">${Math.round(plan.price)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div className="border border-gray-300 rounded-lg p-3">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center p-3 mb-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay ${Math.round(plan.price)}
              </>
            )}
          </button>
        </div>
      </form>

      {loading && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">Processing your payment...</p>
        </div>
      )}
    </motion.div>
  );
};

export default Checkout;
