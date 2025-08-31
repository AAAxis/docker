"use client";

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { motion } from 'framer-motion';
import { User, CreditCard, Globe, Activity, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

const Dashboard = () => {
  const { currentUser, userProfile, loadUserProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;

      try {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('customerEmail', '==', currentUser.email)
        );
        const querySnapshot = await getDocs(ordersQuery);
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    const ensureUserProfile = async () => {
      if (!currentUser) return;

      try {
        console.log('Checking user profile for:', currentUser.uid);
        // Check if user profile exists
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (!userDoc.exists()) {
          console.log('User profile does not exist, creating...');
          // Create user profile if it doesn't exist
          await setDoc(doc(db, 'users', currentUser.uid), {
            email: currentUser.email,
            displayName: currentUser.displayName || 'Unknown User',
            createdAt: new Date(),
            role: 'customer',
            wallet: {
              balance: 0,
              currency: 'USD'
            }
          });
          console.log('✅ Created missing user profile');
          // Reload user profile after creating it
          await loadUserProfile();
        } else {
          console.log('✅ User profile exists:', userDoc.data());
          // Force reload profile in case it wasn't loaded
          await loadUserProfile();
        }
      } catch (error) {
        console.error('❌ Error ensuring user profile:', error);
      }
    };

    ensureUserProfile();
    fetchOrders();
  }, [currentUser, loadUserProfile]);

  if (!currentUser) {
    router.push('/login');
    return null;
  }

  const activeOrders = orders.filter(order => order.status === 'active');
  const pendingOrders = orders.filter(order => order.status === 'pending');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {currentUser.displayName || currentUser.email}!
              </h1>
              <p className="text-gray-600">
                Manage your eSIM orders and account settings
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active eSIMs</p>
                <p className="text-3xl font-bold text-green-600">{activeOrders.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${userProfile?.wallet?.balance || 0}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            <button
              onClick={() => router.push('/plans')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Buy New eSIM
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No orders yet</p>
              <button
                onClick={() => router.push('/plans')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Browse Plans
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      order.status === 'active' ? 'bg-green-500' :
                      order.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{order.planName}</p>
                      <p className="text-sm text-gray-500">Order #{order.orderId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${Math.round(order.amount)}</p>
                    <p className="text-sm text-gray-500 capitalize">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Account Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="w-6 h-6 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">Account Settings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{currentUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-gray-900">{currentUser.displayName || 'Not set'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Created</label>
                <p className="mt-1 text-gray-900">
                  {userProfile?.createdAt ? 
                    new Date(userProfile.createdAt.toDate()).toLocaleDateString() : 
                    'Unknown'
                  }
                </p>
                {!userProfile?.createdAt && (
                  <button 
                    onClick={async () => {
                      console.log('Manual refresh triggered');
                      await loadUserProfile();
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Refresh Profile
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <p className="mt-1 text-gray-900 capitalize">{userProfile?.role || 'customer'}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
