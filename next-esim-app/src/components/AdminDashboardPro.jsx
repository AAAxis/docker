"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
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
  Info,
  Users,
  Plus,
  MapPin,
  TrendingUp,
  Database,
  Activity,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboardPro = () => {
  const { currentUser } = useAuth();
  const { isAdmin, userRole, canManageCountries, canManagePlans, canManageConfig, canDeleteData, canManageAdmins, loading: adminLoading } = useAdmin();
  
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [currentEnvironment, setCurrentEnvironment] = useState('test');
  const [currentStripeMode, setCurrentStripeMode] = useState('test');
  const [dataplansApiKey, setDataplansApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Ready to sync data from DataPlans API');
  
  // Countries Management
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [plans, setPlans] = useState([]);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  
  // Regional Plans Management
  const [regions, setRegions] = useState([]);
  const [filteredRegions, setFilteredRegions] = useState([]);
  const [showRegionalPlansModal, setShowRegionalPlansModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionalPlans, setRegionalPlans] = useState([]);
  const [showCreateRegionModal, setShowCreateRegionModal] = useState(false);
  const [newRegion, setNewRegion] = useState({
    name: '',
    code: '',
    description: '',
    countries: [],
    minPrice: 0,
    icon: '🌍'
  });

  // Initialize data
  useEffect(() => {
    loadSavedConfig();
    loadCountriesFromFirestore();
    loadRegionsFromFirestore();
    loadDataplansApiKey();
  }, []);

  // Filter countries based on search
  useEffect(() => {
    const filtered = countries.filter(country => 
      country.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCountries(filtered);
  }, [countries, searchTerm]);

  // Configuration Functions
  const loadSavedConfig = () => {
    const savedEnv = localStorage.getItem('esim_environment');
    const savedStripeMode = localStorage.getItem('esim_stripe_mode');
    
    if (savedEnv) setCurrentEnvironment(savedEnv);
    if (savedStripeMode) setCurrentStripeMode(savedStripeMode);
  };

  const loadDataplansApiKey = async () => {
    try {
      const storedKey = localStorage.getItem('dataplans_api_key');
      if (storedKey) {
        setDataplansApiKey(storedKey);
        console.log('✅ DataPlans API key loaded from localStorage');
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const saveDataplansApiKey = async () => {
    try {
      if (!dataplansApiKey.trim()) {
        toast.error('Please enter a valid API key');
        return;
      }
      localStorage.setItem('dataplans_api_key', dataplansApiKey);
      toast.success('DataPlans API key saved successfully!');
      console.log('✅ DataPlans API key saved to localStorage');
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error(`Error saving API key: ${error.message}`);
    }
  };

  const toggleEnvironment = async () => {
    const newEnv = currentEnvironment === 'test' ? 'production' : 'test';
    setCurrentEnvironment(newEnv);
    localStorage.setItem('esim_environment', newEnv);
    toast.success(`Environment switched to ${newEnv}`);
  };

  const toggleStripeMode = async () => {
    const newMode = currentStripeMode === 'test' ? 'production' : 'test';
    setCurrentStripeMode(newMode);
    localStorage.setItem('esim_stripe_mode', newMode);
    toast.success(`Stripe mode switched to ${newMode}`);
  };

  // Countries Management Functions
  const loadCountriesFromFirestore = async () => {
    try {
      setLoading(true);
      const countriesSnapshot = await getDocs(collection(db, 'countries'));
      const countriesData = countriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCountries(countriesData);
      setFilteredCountries(countriesData);
      console.log('✅ Loaded', countriesData.length, 'countries from Firestore');
    } catch (error) {
      console.error('❌ Error loading countries:', error);
      toast.error(`Error loading countries: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteCountryFromFirestore = async (countryCode) => {
    if (!window.confirm(`Delete ${countryCode}? This will also delete all associated plans.`)) return;

    try {
      setLoading(true);
      // Delete country and its plans
      const countryQuery = query(collection(db, 'countries'), where('code', '==', countryCode));
      const countrySnapshot = await getDocs(countryQuery);
      
      const batch = writeBatch(db);
      countrySnapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      toast.success(`${countryCode} deleted successfully!`);
      await loadCountriesFromFirestore();
    } catch (error) {
      console.error('❌ Error deleting country:', error);
      toast.error(`Error deleting ${countryCode}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showCountryPlans = async (countryCode, countryName) => {
    try {
      setLoading(true);
      const plansSnapshot = await getDocs(
        query(collection(db, 'plans'), where('country', '==', countryName))
      );
      
      const countryPlans = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPlans(countryPlans);
      setSelectedCountry({ code: countryCode, name: countryName });
      setShowPlansModal(true);
    } catch (error) {
      console.error('❌ Error fetching plans:', error);
      toast.error(`Error fetching plans for ${countryName}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Regional Plans Management Functions
  const loadRegionsFromFirestore = async () => {
    try {
      setLoading(true);
      const regionsSnapshot = await getDocs(collection(db, 'regions'));
      const regionsData = regionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRegions(regionsData);
      setFilteredRegions(regionsData);
      console.log('✅ Loaded', regionsData.length, 'regions from Firestore');
    } catch (error) {
      console.error('❌ Error loading regions:', error);
      toast.error(`Error loading regions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createRegion = async () => {
    if (!newRegion.name || !newRegion.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'regions'), {
        ...newRegion,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      toast.success('Region created successfully!');
      setShowCreateRegionModal(false);
      setNewRegion({ name: '', code: '', description: '', countries: [], minPrice: 0, icon: '🌍' });
      await loadRegionsFromFirestore();
    } catch (error) {
      console.error('❌ Error creating region:', error);
      toast.error(`Error creating region: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteRegion = async (regionId, regionName) => {
    if (!window.confirm(`Delete ${regionName} region? This action cannot be undone.`)) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'regions', regionId));
      toast.success(`${regionName} region deleted successfully!`);
      await loadRegionsFromFirestore();
    } catch (error) {
      console.error('❌ Error deleting region:', error);
      toast.error(`Error deleting region: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showRegionalPlans = async (regionId, regionName) => {
    try {
      setLoading(true);
      const plansSnapshot = await getDocs(
        query(collection(db, 'regionalPlans'), where('regionId', '==', regionId))
      );
      
      const regionPlans = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRegionalPlans(regionPlans);
      setSelectedRegion({ id: regionId, name: regionName });
      setShowRegionalPlansModal(true);
    } catch (error) {
      console.error('❌ Error fetching regional plans:', error);
      toast.error(`Error fetching plans for ${regionName}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Overview Stats
  const statsData = [
    { label: 'Total Countries', value: countries.length, icon: Globe, color: 'blue' },
    { label: 'Regional Plans', value: regions.length, icon: MapPin, color: 'green' },
    { label: 'Environment', value: currentEnvironment, icon: Settings, color: 'purple' },
    { label: 'Status', value: 'Active', icon: Activity, color: 'emerald' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Professional Header */}
        <div className="py-8 mb-8 border-b border-gray-200 bg-white/80 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 flex items-center">
                <Settings className="text-blue-600 mr-3" />
                eSIM Admin Panel
              </h1>
              <p className="text-gray-600 text-lg">Comprehensive eSIM service management and configuration</p>
            </div>
            <div className="flex space-x-3">
              <a
                href="/admin/users"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Users className="w-5 h-5 mr-2" />
                Manage Users
              </a>
            </div>
          </div>
        </div>

        {/* Professional Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-1">
            <nav className="flex space-x-1">
              {[
                { id: 'overview', label: 'Overview', icon: TrendingUp },
                { id: 'config', label: 'Configuration', icon: Settings },
                { id: 'countries', label: 'Countries', icon: Globe },
                { id: 'regions', label: 'Regional Plans', icon: MapPin },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {statsData.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                          </div>
                          <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                            <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Activity className="text-blue-600 mr-2" />
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('config')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                    >
                      <Settings className="w-8 h-8 text-blue-600 mb-2" />
                      <p className="font-medium">Configuration</p>
                      <p className="text-sm text-gray-600">Manage API keys and environment</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('countries')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                    >
                      <Globe className="w-8 h-8 text-green-600 mb-2" />
                      <p className="font-medium">Manage Countries</p>
                      <p className="text-sm text-gray-600">View and manage country plans</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('regions')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
                    >
                      <MapPin className="w-8 h-8 text-purple-600 mb-2" />
                      <p className="font-medium">Regional Plans</p>
                      <p className="text-sm text-gray-600">Create and manage regional eSIMs</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Tab */}
            {activeTab === 'config' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-gray-200"
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          currentEnvironment === 'production' ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Stripe Mode Toggle */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                      <DollarSign className="text-purple-600 mr-2" />
                      Stripe Payment Mode
                    </h2>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-700 font-medium">Payment Mode:</span>
                        <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                          currentStripeMode === 'test' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {currentStripeMode === 'test' ? 'Test' : 'Production'}
                        </span>
                      </div>
                      <button
                        onClick={toggleStripeMode}
                        className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 bg-gray-200"
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          currentStripeMode === 'production' ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* API Key Management */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Database className="text-green-600 mr-2" />
                    DataPlans API Configuration
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={dataplansApiKey}
                          onChange={(e) => setDataplansApiKey(e.target.value)}
                          placeholder="Enter your DataPlans API key"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={saveDataplansApiKey}
                      disabled={loading || !dataplansApiKey.trim()}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
                    >
                      {loading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Database className="w-5 h-5 mr-2" />}
                      Save API Key
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Countries Tab */}
            {activeTab === 'countries' && (
              <div className="space-y-6">
                {/* Search and Actions */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search countries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={loadCountriesFromFirestore}
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
                    >
                      {loading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <RefreshCw className="w-5 h-5 mr-2" />}
                      Refresh Countries
                    </button>
                  </div>
                </div>

                {/* Countries Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCountries.map((country, index) => (
                    <motion.div
                      key={country.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{country.name}</h3>
                          <p className="text-sm text-gray-500">{country.code}</p>
                        </div>
                        <span className="text-2xl">{country.flag || '🏳️'}</span>
                      </div>
                      <div className="space-y-2 mb-4">
                        {country.minPrice ? (
                          <p className="text-sm text-gray-600">
                            <DollarSign className="w-4 h-4 inline mr-1" />
                            {country.minPrice}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">
                            <i className="fas fa-info-circle w-4 h-4 inline mr-1" />
                            No plans assigned
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => showCountryPlans(country.code, country.name)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          View Plans
                        </button>
                        <button
                          onClick={() => deleteCountryFromFirestore(country.code)}
                          className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Regional Plans Tab */}
            {activeTab === 'regions' && (
              <div className="space-y-6">
                {/* Header with Create Button */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Regional Plans Management</h2>
                      <p className="text-gray-600">Create and manage multi-country eSIM plans</p>
                    </div>
                    <button
                      onClick={() => setShowCreateRegionModal(true)}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Region
                    </button>
                  </div>
                </div>

                {/* Regions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regions.map((region, index) => (
                    <motion.div
                      key={region.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{region.name}</h3>
                          <p className="text-sm text-gray-500">{region.code}</p>
                        </div>
                        <span className="text-2xl">{region.icon || '🌍'}</span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-gray-600">{region.description}</p>
                        {region.minPrice ? (
                          <p className="text-sm text-gray-600">
                            <DollarSign className="w-4 h-4 inline mr-1" />
                            {region.minPrice}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">
                            <i className="fas fa-info-circle w-4 h-4 inline mr-1" />
                            No plans assigned
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          <Globe className="w-4 h-4 inline mr-1" />
                          {region.countries?.length || 0} countries
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => showRegionalPlans(region.id, region.name)}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          View Plans
                        </button>
                        <button
                          onClick={() => deleteRegion(region.id, region.name)}
                          className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Empty State */}
                {regions.length === 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                    <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Regional Plans</h3>
                    <p className="text-gray-600 mb-6">Create your first regional plan to get started</p>
                    <button
                      onClick={() => setShowCreateRegionModal(true)}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center mx-auto"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create First Region
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Create Region Modal */}
        {showCreateRegionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Create New Region</h3>
                <button
                  onClick={() => setShowCreateRegionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region Name*</label>
                  <input
                    type="text"
                    value={newRegion.name}
                    onChange={(e) => setNewRegion({...newRegion, name: e.target.value})}
                    placeholder="e.g., Europe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region Code*</label>
                  <input
                    type="text"
                    value={newRegion.code}
                    onChange={(e) => setNewRegion({...newRegion, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., EUR"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newRegion.description}
                    onChange={(e) => setNewRegion({...newRegion, description: e.target.value})}
                    placeholder="Description of the regional coverage"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starting Price</label>
                  <input
                    type="number"
                    value={newRegion.minPrice}
                    onChange={(e) => setNewRegion({...newRegion, minPrice: parseFloat(e.target.value)})}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <input
                    type="text"
                    value={newRegion.icon}
                    onChange={(e) => setNewRegion({...newRegion, icon: e.target.value})}
                    placeholder="🌍"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateRegionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createRegion}
                  disabled={loading || !newRegion.name || !newRegion.code}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Region'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Country Plans Modal */}
        {showPlansModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Plans for {selectedCountry?.name}</h3>
                  <button
                    onClick={() => setShowPlansModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-96">
                {plans.length > 0 ? (
                  <div className="space-y-4">
                    {plans.map((plan) => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{plan.name}</h4>
                            <p className="text-sm text-gray-600">{plan.data} • {plan.duration}</p>
                            <p className="text-lg font-semibold text-blue-600">{plan.currency === 'USD' ? '$' : plan.currency}{plan.price}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const newPrice = prompt(`Edit price for "${plan.name}"`, plan.price);
                                if (newPrice && !isNaN(parseFloat(newPrice))) {
                                  // Add price update logic here
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete plan "${plan.name}"?`)) {
                                  // Add delete logic here
                                }
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No plans found for {selectedCountry?.name}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Regional Plans Modal */}
        {showRegionalPlansModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Regional Plans for {selectedRegion?.name}</h3>
                  <button
                    onClick={() => setShowRegionalPlansModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-96">
                {regionalPlans.length > 0 ? (
                  <div className="space-y-4">
                    {regionalPlans.map((plan) => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{plan.name}</h4>
                            <p className="text-sm text-gray-600">{plan.data} • {plan.duration}</p>
                            <p className="text-lg font-semibold text-purple-600">{plan.currency === 'USD' ? '$' : plan.currency}{plan.price}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const newPrice = prompt(`Edit price for "${plan.name}"`, plan.price);
                                if (newPrice && !isNaN(parseFloat(newPrice))) {
                                  updateRegionalPlanPrice(plan.id, parseFloat(newPrice));
                                }
                              }}
                              className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteRegionalPlan(plan.id, plan.name)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No regional plans found for {selectedRegion?.name}</p>
                    <p className="text-sm text-gray-500 mt-2">Create plans in your regional plans collection</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPro;
