import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { loadStripe } from '@stripe/stripe-js';

// Firebase Functions for payment operations
const createPaymentIntent = httpsCallable(functions, 'createPaymentIntent');
const processWalletPayment = httpsCallable(functions, 'processWalletPayment');
const confirmPayment = httpsCallable(functions, 'confirmPayment');

// Load Stripe (only if API key is provided)
const stripePromise = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

export const paymentService = {
  // Create payment intent
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const result = await createPaymentIntent({
        amount,
        currency,
        metadata
      });
      return result.data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  },

  // Process wallet payment
  async processWalletPayment(orderId, amount) {
    try {
      const result = await processWalletPayment({
        orderId,
        amount
      });
      return result.data;
    } catch (error) {
      console.error('Error processing wallet payment:', error);
      throw error;
    }
  },

  // Confirm payment
  async confirmPayment(paymentIntentId) {
    try {
      const result = await confirmPayment({ paymentIntentId });
      return result.data;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  },

  // Get Stripe instance
  async getStripe() {
    return await stripePromise;
  },

  // Create checkout session
  async createCheckoutSession(orderData) {
    try {
      const stripe = await this.getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const result = await createPaymentIntent({
        amount: orderData.amount,
        currency: orderData.currency || 'usd',
        metadata: {
          orderId: orderData.orderId,
          planId: orderData.planId,
          customerEmail: orderData.customerEmail
        }
      });

      return result.data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }
};
