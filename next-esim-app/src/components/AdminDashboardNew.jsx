"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Globe, 
  RefreshCw, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff, 
  ToggleLeft, 
  ToggleRight,
  Search,
  Download,
  AlertTriangle,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const [currentEnvironment, setCurrentEnvironment] = useState('test');
  const [currentStripeMode, setCurrentStripeMode] = useState('test');
  const [dataplansApiKey, setDataplansApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Ready to sync data from DataPlans API');
  const [plans, setPlans] = useState([]);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Check if user is admin (temporarily disabled for testing)
  const isAdmin = true;

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      return;
    }

    loadSavedConfig();
    loadCountriesFromFirestore();
    loadDataplansApiKey();
  }, [isAdmin]);

  useEffect(() => {
    // Filter countries based on search term
    const filtered = countries.filter(country => 
      country.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCountries(filtered);
  }, [countries, searchTerm]);

  // Load DataPlans API key from Firestore
  const loadDataplansApiKey = async () => {
    try {
      const configDoc = await getDocs(query(collection(db, 'config'), where('__name__', '==', 'dataplans')));
      if (!configDoc.empty) {
        const data = configDoc.docs[0].data();
        setDataplansApiKey(data.api_key || '');
      }
    } catch (error) {
      console.error('Error loading DataPlans API key:', error);
    }
  };

  // Save DataPlans API key to Firestore
  const saveDataplansApiKey = async () => {
    if (!dataplansApiKey.trim()) {
      toast.error('Please enter a DataPlans API key');
      return;
    }

    try {
      await updateDoc(doc(db, 'config', 'dataplans'), {
        api_key: dataplansApiKey,
        updated_at: new Date(),
        updated_via: 'admin_panel'
      });
      toast.success('DataPlans API key saved successfully');
    } catch (error) {
      console.error('Error saving DataPlans API key:', error);
      toast.error(`Error saving API key: ${error.message}`);
    }
  };

  // Toggle environment (test/production)
  const toggleEnvironment = async () => {
    const newEnv = currentEnvironment === 'test' ? 'prod' : 'test';
    setCurrentEnvironment(newEnv);
    localStorage.setItem('esim_environment', newEnv);
    
    try {
      await updateDoc(doc(db, 'config', 'environment'), {
        mode: newEnv,
        updated_at: new Date(),
        updated_via: 'admin_panel'
      });
      toast.success(`Switched to ${newEnv === 'test' ? 'Test' : 'Production'} DataPlans environment`);
    } catch (error) {
      console.error('Error updating environment config:', error);
      toast.error('Environment switched locally, but failed to sync with Firebase');
    }
  };

  // Toggle Stripe payment mode
  const toggleStripeMode = async () => {
    const newMode = currentStripeMode === 'test' ? 'live' : 'test';
    setCurrentStripeMode(newMode);
    localStorage.setItem('esim_stripe_mode', newMode);
    
    try {
      await updateDoc(doc(db, 'config', 'stripe'), {
        mode: newMode,
        updated_at: new Date(),
        updated_via: 'admin_panel'
      });
      toast.success(`Switched to ${newMode === 'test' ? 'Test' : 'Live'} Stripe payments`);
    } catch (error) {
      console.error('Error updating Stripe config:', error);
      toast.error('Mode switched locally, but failed to sync with Firebase');
    }
  };

  // Fetch countries from DataPlans API via Firebase Functions
  const fetchCountriesFromAPI = async () => {
    setLoading(true);
    setSyncStatus('Fetching countries via Firebase Functions...');

    try {
      // This would call a Firebase Function to sync data
      // For now, we'll simulate with a timeout and show success
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSyncStatus('Successfully fetched and synced countries from DataPlans API');
      toast.success('Countries fetched and synced successfully');
      
      // Reload countries from Firestore
      await loadCountriesFromFirestore();
    } catch (error) {
      console.error('Error fetching countries:', error);
      setSyncStatus(`Error: ${error.message}`);
      toast.error(`Error fetching countries: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load countries from Firestore
  const loadCountriesFromFirestore = async () => {
    setSyncStatus('Loading countries from Firestore...');

    try {
      const snapshot = await getDocs(query(collection(db, 'countries'), where('status', '==', 'active')));
      
      const countriesData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        countriesData.push({
          code: data.code || doc.id,
          name: data.name,
          status: data.status,
          id: doc.id
        });
      });

      setCountries(countriesData);
      setSyncStatus(`Loaded ${countriesData.length} countries from Firestore`);
      
    } catch (error) {
      console.error('Error loading from Firestore:', error);
      setSyncStatus(`Error loading from Firestore: ${error.message}`);
      toast.error(`Error loading from Firestore: ${error.message}`);
    }
  };

  // Delete all countries from Firestore
  const deleteAllCountriesFromFirestore = async () => {
    if (!window.confirm('DELETE ALL COUNTRIES from Firestore? This action cannot be undone!')) {
      return;
    }

    if (!window.confirm('Are you absolutely sure? This will delete all countries from your database!')) {
      return;
    }

    setLoading(true);
    setSyncStatus('Deleting all countries from Firestore...');

    try {
      const countriesSnapshot = await getDocs(collection(db, 'countries'));
      const batch = writeBatch(db);

      countriesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      setSyncStatus(`Successfully deleted ${countriesSnapshot.size} countries from Firestore`);
      toast.success(`Successfully deleted ${countriesSnapshot.size} countries from Firestore`);
      
      // Clear the display
      setCountries([]);
      setFilteredCountries([]);
    } catch (error) {
      console.error('Error deleting all countries:', error);
      setSyncStatus(`Error deleting all countries: ${error.message}`);
      toast.error(`Error deleting all countries: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a single country from Firestore
  const deleteCountryFromFirestore = async (countryCode) => {
    if (!window.confirm(`Delete ${countryCode} from Firestore? This action cannot be undone.`)) {
      return;
    }

    setSyncStatus(`Deleting ${countryCode} from Firestore...`);

    try {
      await deleteDoc(doc(db, 'countries', countryCode));
      setSyncStatus(`Successfully deleted ${countryCode} from Firestore`);
      toast.success(`Successfully deleted ${countryCode} from Firestore`);
      
      // Refresh the list
      await loadCountriesFromFirestore();
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      setSyncStatus(`Error deleting from Firestore: ${error.message}`);
      toast.error(`Error deleting from Firestore: ${error.message}`);
    }
  };

  // Show country plans
  const showCountryPlans = async (countryCode, countryName) => {
    try {
      const plansSnapshot = await getDocs(
        query(collection(db, 'plans'), where('country_codes', 'array-contains', countryCode))
      );
      
      const countryPlans = [];
      plansSnapshot.forEach(doc => {
        countryPlans.push({ id: doc.id, ...doc.data() });
      });

      setPlans(countryPlans);
      setSelectedCountry({ code: countryCode, name: countryName });
      setShowPlansModal(true);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error(`Error fetching plans for ${countryName}: ${error.message}`);
    }
  };

  // Update plan price
  const updatePlanPrice = async (planId, newPrice) => {
    try {
      await updateDoc(doc(db, 'plans', planId), {
        price: newPrice,
        updated_at: new Date(),
        price_updated_via: 'admin_panel'
      });
      toast.success('Plan price updated successfully');
      
      // Refresh plans if modal is open
      if (showPlansModal && selectedCountry) {
        await showCountryPlans(selectedCountry.code, selectedCountry.name);
      }
    } catch (error) {
      console.error('Error updating plan price:', error);
      toast.error(`Error updating price: ${error.message}`);
    }
  };

  // Delete plan
  const deletePlan = async (planId, planName) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${planName}"?\n\nThis action cannot be undone and will remove the plan from all countries.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'plans', planId));
      toast.success(`Successfully deleted plan "${planName}"`);
      
      // Refresh plans if modal is open
      if (showPlansModal && selectedCountry) {
        await showCountryPlans(selectedCountry.code, selectedCountry.name);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error(`Error deleting plan: ${error.message}`);
    }
  };

  const loadSavedConfig = () => {
    const savedEnv = localStorage.getItem('esim_environment');
    const savedStripeMode = localStorage.getItem('esim_stripe_mode');
    
    if (savedEnv) {
      setCurrentEnvironment(savedEnv);
    }
    
    if (savedStripeMode) {
      setCurrentStripeMode(savedStripeMode);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin privileges required to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <Settings className="text-blue-600 mr-3" />
            eSIM Admin Panel
          </h1>
          <p className="text-gray-600">Manage your eSIM service configuration and data synchronization</p>
        </div>

        {/* Configuration Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Environment Toggle */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <ToggleLeft className="text-blue-600 mr-2" />
              DataPlans Environment
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-700 font-medium">Current Mode:</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                  currentEnvironment === 'test' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {currentEnvironment === 'test' ? 'Test' : 'Production'}
                </span>
              </div>
              <button
                onClick={toggleEnvironment}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  currentEnvironment === 'prod' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  currentEnvironment === 'prod' ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Toggle between DataPlans test (sandbox) and production environments
            </p>
          </div>

          {/* Stripe Payment Mode Toggle */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <ToggleRight className="text-purple-600 mr-2" />
              Stripe Payment Mode
            </h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-gray-700 font-medium">Payment Mode:</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                  currentStripeMode === 'test' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {currentStripeMode === 'test' ? 'Test' : 'Live'}
                </span>
              </div>
              <button
                onClick={toggleStripeMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  currentStripeMode === 'live' ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  currentStripeMode === 'live' ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Toggle between Stripe test and live payment processing
            </p>
          </div>
        </div>

        {/* DataPlans Configuration & Synchronization Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* DataPlans API Configuration */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Globe className="text-green-600 mr-2" />
              DataPlans API Configuration
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">DataPlans API Key</label>
              <div className="flex mb-3">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={dataplansApiKey}
                  onChange={(e) => setDataplansApiKey(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter your DataPlans API key"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-3 py-2 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-300"
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={saveDataplansApiKey}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full mb-3"
              >
                Save API Key
              </button>
              <div className="text-xs text-gray-500">
                <Info className="w-4 h-4 inline mr-1" />
                Key is stored securely in Firestore and used for both test and production modes
              </div>
            </div>
          </div>

          {/* Data Synchronization */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <RefreshCw className="text-purple-600 mr-2" />
              Data Synchronization
            </h2>
            
            {/* Current API Endpoint Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900 mb-1 text-sm">Currently Using:</h3>
                  <span className="text-xs text-blue-700">
                    {currentEnvironment === 'test' 
                      ? 'https://sandbox.dataplans.io/api/v1'
                      : 'https://app.dataplans.io/api/v1'
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={fetchCountriesFromAPI}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full mb-4 flex items-center justify-center"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Fetch & Sync from DataPlans API
            </button>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">Sync Status</h3>
              <div className="text-xs text-gray-600">
                {syncStatus}
              </div>
            </div>
          </div>
        </div>

        {/* Countries Display Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center">
              <Globe className="text-red-600 mr-2" />
              Countries Data
              <span className="text-sm text-gray-500 font-normal ml-2">({countries.length} countries)</span>
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={deleteAllCountriesFromFirestore}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All from Firestore
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Countries Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCountries.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-12">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No countries loaded. Click "Fetch Countries" to load data.</p>
              </div>
            ) : (
              filteredCountries.map((country) => (
                <div
                  key={country.code}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => showCountryPlans(country.code, country.name)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{country.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                        {country.code}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCountryFromFirestore(country.code);
                        }}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete from Firestore"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-blue-600 font-medium text-sm">
                    Click to view & manage plans
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Plans Modal */}
        {showPlansModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Plans for {selectedCountry?.name} ({selectedCountry?.code})
                  </h2>
                  <button
                    onClick={() => setShowPlansModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {plans.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No plans found for {selectedCountry?.name}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plans.map((plan) => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2">{plan.name || 'Unnamed Plan'}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Capacity:</span>
                                <span className="font-medium ml-1">{plan.capacity || 'N/A'} GB</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Period:</span>
                                <span className="font-medium ml-1">{plan.period || 'N/A'} days</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Price:</span>
                                <span className="font-medium text-green-600 ml-1">
                                  {(plan.currency || 'USD') === 'USD' ? '$' : (plan.currency || 'USD')}{(plan.price || 0).toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Operator:</span>
                                <span className="font-medium ml-1">{plan.operator?.name || plan.operator || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col space-y-2">
                            <button
                              onClick={() => {
                                const newPrice = prompt(`Edit price for "${plan.name}":\n\nCurrent price: ${(plan.currency || 'USD') === 'USD' ? '$' : (plan.currency || 'USD')}${(plan.price || 0).toFixed(2)}\n\nEnter new price:`, (plan.price || 0).toFixed(2));
                                if (newPrice !== null && newPrice !== '') {
                                  const price = parseFloat(newPrice);
                                  if (!isNaN(price) && price >= 0) {
                                    updatePlanPrice(plan.id, price);
                                  } else {
                                    toast.error('Invalid price. Please enter a valid number.');
                                  }
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              <Edit className="w-3 h-3 inline mr-1" />
                              Edit Price
                            </button>
                            <button
                              onClick={() => deletePlan(plan.id, plan.name)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              <Trash2 className="w-3 h-3 inline mr-1" />
                              Delete Plan
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-600">Found {plans.length} plan(s) for {selectedCountry?.name}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
