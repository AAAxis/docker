'use client';

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import Checkout from '../../components/Checkout'
import Loading from '../../components/Loading'

export default function CheckoutPageClient() {
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const planId = searchParams.get('plan');
        const planType = searchParams.get('type');
        
        if (!planId) {
          setError('No plan selected');
          setLoading(false);
          return;
        }

        // Load plan data from Firestore
        const { collection, doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebase/config');
        
        const planDoc = await getDoc(doc(db, 'plans', planId));
        
        if (planDoc.exists()) {
          const planData = planDoc.data();
          setPlan({
            id: planDoc.id,
            ...planData,
            type: planType || 'country'
          });
        } else {
          setError('Plan not found');
        }
      } catch (err) {
        console.error('Error loading plan:', err);
        setError('Failed to load plan');
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [searchParams]);

  // Load Stripe configuration
  useEffect(() => {
    const loadStripeConfig = async () => {
      try {
        // Import configService dynamically
        const { configService } = await import('../../services/configService');
        const mode = await configService.getStripeMode();
        const publishableKey = configService.getStripePublishableKey(mode);
        
        if (publishableKey) {
          const stripe = await loadStripe(publishableKey);
          setStripePromise(stripe);
        } else {
          console.error('No Stripe publishable key found');
        }
      } catch (err) {
        console.error('Error loading Stripe config:', err);
      }
    };

    loadStripeConfig();
  }, []);

  if (loading) {
    return <Loading />;
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-gray-400 text-6xl mb-4">📱</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Plan Selected
          </h2>
          <p className="text-gray-600 mb-4">
            Please select a plan from the plans page to continue with checkout.
          </p>
          <button
            onClick={() => window.location.href = '/plans'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Plans
          </button>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="text-blue-500 text-6xl mb-4">💳</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading Payment System
          </h2>
          <p className="text-gray-600 mb-4">
            Please wait while we set up your payment...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <Checkout plan={plan} />
    </Elements>
  );
}
