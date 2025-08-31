"use client";

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, writeBatch, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
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

// Helper function to get flag emoji from country code
const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return null;
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  
  return String.fromCodePoint(...codePoints);
};

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const { isAdmin, userRole, canManageCountries, canManagePlans, canManageConfig, canDeleteData, canManageAdmins, loading: adminLoading } = useAdmin();

  // State Management - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [activeTab, setActiveTab] = useState('overview');
  const [currentEnvironment, setCurrentEnvironment] = useState('test');
  const [currentStripeMode, setCurrentStripeMode] = useState('test');
  const [dataplansApiKey, setDataplansApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
  const [showAttachPlanModal, setShowAttachPlanModal] = useState(false);
  const [showAttachCountryPlanModal, setShowAttachCountryPlanModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedCountryForAttach, setSelectedCountryForAttach] = useState(null);
  const [newRegion, setNewRegion] = useState({
    name: '',
    code: '',
    description: '',
    countries: [],
    minPrice: 0,
    icon: '🌍'
  });
  
  // User Management
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showRemoveAdminModal, setShowRemoveAdminModal] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState(null);
  
  // Countries Modal Management
  const [showCountriesModal, setShowCountriesModal] = useState(false);
  const [selectedCountryPlans, setSelectedCountryPlans] = useState([]);
  const [selectedCountryName, setSelectedCountryName] = useState('');

  // Initialize data - ALL HOOKS MUST BE BEFORE CONDITIONAL RETURNS
  useEffect(() => {
    if (currentUser) {
      loadSavedConfig();
      loadCountriesFromFirestore();
      loadRegionsFromFirestore();
      loadDataplansApiKey();
      loadUsersFromFirestore();
    }
  }, [currentUser]);

  // Filter countries based on search
  useEffect(() => {
    const filtered = countries.filter(country => 
      country.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCountries(filtered);
  }, [countries, searchTerm]);

  // Filter users based on search
  useEffect(() => {
    const filtered = users.filter(user => 
      user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.id?.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, userSearchTerm]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAttachPlanModal && !event.target.closest('.dropdown-container')) {
        setShowAttachPlanModal(false);
      }
      if (showAttachCountryPlanModal && !event.target.closest('.dropdown-container')) {
        setShowAttachCountryPlanModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachPlanModal, showAttachCountryPlanModal]);

  // Error handling - AFTER ALL HOOKS
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to access the admin dashboard</p>
        </div>
      </div>
    );
  }

  // Configuration Functions
  const loadSavedConfig = async () => {
    try {
      // Try to load environment from Firestore first
      try {
        const envRef = doc(db, 'config', 'environment');
        const envDoc = await getDocs(query(collection(db, 'config'), where('__name__', '==', 'environment')));
        if (!envDoc.empty) {
          const envData = envDoc.docs[0].data();
          if (envData.mode) {
            setCurrentEnvironment(envData.mode);
            console.log('✅ Environment loaded from Firestore:', envData.mode);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not load environment from Firestore, using localStorage');
      }
      
      // Fallback to localStorage
      const savedEnv = localStorage.getItem('esim_environment');
      const savedStripeMode = localStorage.getItem('esim_stripe_mode');
      
      if (savedEnv) setCurrentEnvironment(savedEnv);
      if (savedStripeMode) setCurrentStripeMode(savedStripeMode);
    } catch (error) {
      console.error('Error loading saved config:', error);
    }
  };

  const loadDataplansApiKey = async () => {
    try {
      // Try to load from Firestore first
      try {
        const configRef = doc(db, 'config', 'dataplans');
        const configDoc = await getDocs(query(collection(db, 'config'), where('__name__', '==', 'dataplans')));
        if (!configDoc.empty) {
          const configData = configDoc.docs[0].data();
          if (configData.api_key) {
            setDataplansApiKey(configData.api_key);
            console.log('✅ DataPlans API key loaded from Firestore');
            return;
          }
        }
      } catch (error) {
        console.log('⚠️ Could not load API key from Firestore, trying localStorage');
      }
      
      // Fallback to localStorage
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
      
      // Save to localStorage
      localStorage.setItem('dataplans_api_key', dataplansApiKey);
      
      // Save to Firestore so Firebase Functions can access it
      const configRef = doc(db, 'config', 'dataplans');
      await updateDoc(configRef, {
        api_key: dataplansApiKey,
        updated_at: new Date(),
        updated_by: currentUser?.uid || 'admin'
      }, { merge: true });
      
      toast.success('DataPlans API key saved successfully!');
      console.log('✅ DataPlans API key saved to localStorage and Firestore');
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error(`Error saving API key: ${error.message}`);
    }
  };

  const toggleEnvironment = async () => {
    const newEnv = currentEnvironment === 'test' ? 'production' : 'test';
    setCurrentEnvironment(newEnv);
    localStorage.setItem('esim_environment', newEnv);
    
    // Also save to Firestore so Firebase Functions can access it
    try {
      const envRef = doc(db, 'config', 'environment');
      await updateDoc(envRef, {
        mode: newEnv,
        updated_at: new Date(),
        updated_by: currentUser?.uid || 'admin'
      }, { merge: true });
      console.log('✅ Environment saved to Firestore:', newEnv);
    } catch (error) {
      console.error('⚠️ Could not save environment to Firestore:', error);
    }
    
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
      const countriesData = countriesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          flagEmoji: data.flagEmoji || getFlagEmoji(data.code)
        };
      });
      
      // Now load plans to calculate real minPrice for each country
      console.log('🔄 Loading plans to calculate country minPrice...');
      const plansSnapshot = await getDocs(collection(db, 'plans'));
      const allPlans = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calculate minPrice for each country based on actual plans
      const countriesWithPlans = countriesData.map(country => {
        // Find plans for this country (check both mobile and web formats)
        const countryPlans = allPlans.filter(plan => {
          const hasMobilePlans = plan.country_codes && plan.country_codes.includes(country.code);
          const hasWebPlans = plan.country_ids && plan.country_ids.includes(country.code);
          return hasMobilePlans || hasWebPlans;
        });
        
        if (countryPlans.length > 0) {
          // Calculate minPrice from actual plans
          const minPrice = Math.min(...countryPlans.map(plan => plan.price || 0));
          const planCount = countryPlans.length;
          console.log(`📊 ${country.name}: ${planCount} plans, minPrice: $${minPrice}`);
          
          return {
            ...country,
            minPrice: Math.round(minPrice),
            planCount: planCount,
            hasPlans: true
          };
        } else {
          return {
            ...country,
            minPrice: null,
            planCount: 0,
            hasPlans: false
          };
        }
      });
      
      setCountries(countriesWithPlans);
      setFilteredCountries(countriesWithPlans);
      console.log('✅ Loaded', countriesWithPlans.length, 'countries with plan counts from Firestore');
    } catch (error) {
      console.error('❌ Error loading countries:', error);
      toast.error(`Error loading countries: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountriesFromAPI = async () => {
    try {
      setLoading(true);
      setSyncStatus('Syncing countries via Firebase Functions...');
      console.log('🔄 Starting to sync countries via Firebase Functions...');

      // Call Firebase Cloud Function instead of direct API
      const syncCountriesFunction = httpsCallable(functions, 'sync_countries_from_api');
      const result = await syncCountriesFunction();
      
      if (result.data.success) {
        const count = result.data.countries_synced || 0;
        console.log(`✅ Successfully synced ${count} countries via Firebase Functions`);
        setSyncStatus(`Successfully synced ${count} countries from DataPlans API`);
        toast.success(`Successfully synced ${count} countries from DataPlans API`);
      } else {
        throw new Error(result.data.error || 'Unknown error occurred');
      }

      // Reload countries from Firestore
      await loadCountriesFromFirestore();

    } catch (error) {
      console.error('❌ Error fetching countries from API:', error);
      setSyncStatus(`Error: ${error.message}`);
      toast.error(`Error fetching countries: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Currency conversion helper
  const convertToUSD = (amount, fromCurrency) => {
    const exchangeRates = {
      'CNY': 0.14,  // 1 CNY = 0.14 USD
      'THB': 0.028, // 1 THB = 0.028 USD
      'EUR': 1.08,  // 1 EUR = 1.08 USD
      'GBP': 1.27,  // 1 GBP = 1.27 USD
      'JPY': 0.0067, // 1 JPY = 0.0067 USD
      'USD': 1.0    // 1 USD = 1 USD
    };
    
    const rate = exchangeRates[fromCurrency.toUpperCase()] || 1.0;
    return parseFloat(amount) * rate;
  };

  const syncAllDataFromAPI = async () => {
    try {
      setLoading(true);
      
      if (!dataplansApiKey.trim()) {
        toast.error('Please configure DataPlans API key first');
        return;
      }

      setSyncStatus('Fetching raw data from DataPlans API...');
      
      // Get raw plans from Firebase Functions (no processing)
      console.log('🔄 Getting raw plans from DataPlans API...');
      const getPlansFunction = httpsCallable(functions, 'fetch_plans');
      const result = await getPlansFunction();
      
      if (result.data.success) {
        console.log('🔍 API response:', result.data);
        
        const countries = result.data.countries || [];
        const plans = result.data.plans || [];
        
        console.log(`✅ Got ${countries.length} countries and ${plans.length} plans`);
        console.log('🔍 First plan:', plans[0]);
        
        setSyncStatus('Converting prices and saving to Firebase...');
        
        // Process and save countries + plans
        const batch = writeBatch(db);
        
        // Save countries
        countries.forEach(country => {
          if (country.countryCode && country.countryName) {
            const countryRef = doc(db, 'countries', country.countryCode);
            batch.set(countryRef, {
              name: country.countryName,
              code: country.countryCode,
              status: 'active',
              updated_at: new Date(),
              synced_at: new Date().toISOString()
            }, { merge: true });
          }
        });
        
        // Save plans with price conversion
        plans.forEach(plan => {
          if (plan.slug && plan.name) {
            // Extract price and currency from raw data
            const rawPrice = plan.retailPrice || plan.price || '0';
            const rawCurrency = plan.priceCurrency || plan.currency || 'USD';
            
            // Convert to USD
            const priceFloat = parseFloat(rawPrice) || 0;
            const usdPrice = rawCurrency === 'USD' ? priceFloat : convertToUSD(priceFloat, rawCurrency);
            
            console.log(`💰 Plan: ${plan.name} - ${rawPrice} ${rawCurrency} → $${usdPrice.toFixed(2)} USD`);
            
            const planRef = doc(db, 'plans', plan.slug);
            const countryData = plan.countries || [];
            const countryCodes = countryData.map(c => c.countryCode || c.code || c).filter(Boolean);
            
            batch.set(planRef, {
              slug: plan.slug,
              name: plan.name,
              description: plan.description || '',
              price: usdPrice, // Converted USD price
              currency: 'USD', // Always USD now
              originalPrice: priceFloat, // Keep original for reference
              originalCurrency: rawCurrency, // Keep original currency
              capacity: plan.capacity === -1 ? 'Unlimited' : (plan.capacity || 0),
              period: plan.period || 0,
              country_codes: countryCodes,
              operator: plan.operator || '',
              status: 'active',
              updated_at: new Date(),
              synced_at: new Date().toISOString()
            }, { merge: true });
          }
        });
        
        await batch.commit();
        console.log('✅ Successfully saved all data to Firebase');
        
        toast.success(`Successfully synced ${countries.length} countries and ${plans.length} plans`);
        setSyncStatus(`Successfully synced ${countries.length + plans.length} items from DataPlans API`);
        
        // Refresh local data
        await loadCountriesFromFirestore();
        await loadAvailablePlans();
        
      } else {
        throw new Error(result.data.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error('❌ Error syncing data:', error);
      toast.error(`Error syncing data: ${error.message}`);
      setSyncStatus(`Error syncing data: ${error.message}`);
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
      
      // Load plans from the plans collection for this country (mobile app compatible)
      // Try both mobile app format (country_codes) and web app format (country_ids)
      const mobilePlansQuery = query(
        collection(db, 'plans'), 
        where('country_codes', 'array-contains', countryCode)
      );
      const webPlansQuery = query(
        collection(db, 'plans'), 
        where('status', '==', 'active'),
        where('country_ids', 'array-contains', countryCode)
      );
      
      // Get both query results
      const [mobilePlansSnapshot, webPlansSnapshot] = await Promise.all([
        getDocs(mobilePlansQuery),
        getDocs(webPlansQuery)
      ]);
      
      // Combine and deduplicate plans
      const allPlans = new Map();
      
      // Add mobile app plans
      mobilePlansSnapshot.docs.forEach(doc => {
        const data = doc.data();
        allPlans.set(doc.id, {
          id: doc.id,
          ...data,
          source: 'mobile',
          data: data.capacity || data.data || 'N/A',
          duration: data.period || data.duration || 'N/A'
        });
      });
      
      // Add web app plans (overwrite if same ID)
      webPlansSnapshot.docs.forEach(doc => {
        const data = doc.data();
        allPlans.set(doc.id, {
          id: doc.id,
          ...data,
          source: 'web',
          data: data.data || data.capacity || 'N/A',
          duration: data.duration || data.period || 'N/A'
        });
      });
      
      const countryPlans = Array.from(allPlans.values());
      console.log('📱📊 Combined plans for', countryName, ':', countryPlans);
      
      setSelectedCountryPlans(countryPlans);
      setSelectedCountryName(countryName);
      setSelectedCountryForAttach({ code: countryCode, name: countryName });
      setShowCountriesModal(true);
      
      // Load available plans for this country
      await loadAvailablePlansForCountry();
    } catch (error) {
      console.error('❌ Error loading country plans:', error);
      toast.error(`Error loading plans for ${countryName}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllCountries = async () => {
    if (!window.confirm('Delete ALL countries? This will remove all countries and their plans from the database. DataPlans can then fetch fresh data.')) return;

    try {
      setIsDeleting(true);
      console.log('🗑️ Starting deletion of all countries...');
      
      // Get all countries
      const countriesSnapshot = await getDocs(collection(db, 'countries'));
      console.log(`Found ${countriesSnapshot.docs.length} countries to delete`);
      
      // Get all plans 
      const plansSnapshot = await getDocs(collection(db, 'plans'));
      console.log(`Found ${plansSnapshot.docs.length} plans to delete`);
      
      // Create batch operations
      const batch = writeBatch(db);
      
      // Add all countries to deletion batch
      countriesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Add all plans to deletion batch
      plansSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Execute batch deletion
      await batch.commit();
      
      // Clear local state
      setCountries([]);
      setFilteredCountries([]);
      
      toast.success(`Successfully deleted ${countriesSnapshot.docs.length} countries and ${plansSnapshot.docs.length} plans!`);
      console.log('✅ All countries and plans deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting all countries:', error);
      toast.error(`Error deleting countries: ${error.message}`);
    } finally {
      setIsDeleting(false);
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

  const updateRegionalPlanPrice = async (planId, newPrice) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'regionalPlans', planId), {
        price: newPrice,
        updatedAt: new Date(),
        priceUpdatedVia: 'admin_panel'
      });
      toast.success('Regional plan price updated successfully!');
      
      // Refresh plans if modal is open
      if (showRegionalPlansModal && selectedRegion) {
        await showRegionalPlans(selectedRegion.id, selectedRegion.name);
      }
    } catch (error) {
      console.error('❌ Error updating regional plan price:', error);
      toast.error(`Error updating price: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteRegionalPlan = async (planId, planName) => {
    if (!window.confirm(`Are you sure you want to delete the ${planName} plan? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'regionalPlans', planId));
      toast.success(`${planName} plan deleted successfully!`);
      
      // Refresh plans if modal is open
      if (showRegionalPlansModal && selectedRegion) {
        await showRegionalPlans(selectedRegion.id, selectedRegion.name);
      }
    } catch (error) {
      console.error('❌ Error deleting regional plan:', error);
      toast.error(`Error deleting plan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteCountryPlan = async (planId, planName) => {
    console.log('🗑️ deleteCountryPlan called with:', { planId, planName });
    
    try {
      setLoading(true);
      console.log('🗑️ Deleting document from Firestore:', planId);
      await deleteDoc(doc(db, 'plans', planId));
      console.log('✅ Document deleted successfully');
      toast.success(`${planName} plan detached successfully!`);
      
      // Refresh country plans if modal is open (mobile app compatible)
      if (showCountriesModal && selectedCountryForAttach) {
        console.log('🔄 Refreshing country plans after delete for:', selectedCountryForAttach.code);
        await showCountryPlans(selectedCountryForAttach.code, selectedCountryForAttach.name);
      } else {
        console.log('⚠️ Cannot refresh after delete: showCountriesModal:', showCountriesModal, 'selectedCountryForAttach:', selectedCountryForAttach);
      }
      
      // Refresh countries to update plan counts
      await loadCountriesFromFirestore();
    } catch (error) {
      console.error('❌ Error deleting country plan:', error);
      toast.error(`Error detaching plan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateCountryPlanPrice = async (planId, newPrice) => {
    console.log('🔧 updateCountryPlanPrice called with:', { planId, newPrice });
    
    try {
      setLoading(true);
      console.log('🔧 Updating plan price:', { planId, newPrice, selectedCountryForAttach });
      
      console.log('🔧 Updating document in Firestore:', planId);
      await updateDoc(doc(db, 'plans', planId), {
        price: Math.round(newPrice), // Store as whole number
        updatedAt: new Date(),
        priceUpdatedVia: 'admin_panel'
      });
      console.log('✅ Document updated successfully');
      toast.success('Plan price updated successfully!');
      
      // Refresh country plans if modal is open (mobile app compatible)
      if (showCountriesModal && selectedCountryForAttach) {
        console.log('🔄 Refreshing country plans for:', selectedCountryForAttach.code);
        await showCountryPlans(selectedCountryForAttach.code, selectedCountryForAttach.name);
      } else {
        console.log('⚠️ Cannot refresh: showCountriesModal:', showCountriesModal, 'selectedCountryForAttach:', selectedCountryForAttach);
      }
      
      // Refresh countries to update plan counts
      await loadCountriesFromFirestore();
    } catch (error) {
      console.error('❌ Error updating plan price:', error);
      toast.error(`Error updating price: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePlans = async () => {
    try {
      setLoading(true);
      
      // Load plans from Firebase directly (normal display)
      console.log('📱 Loading plans from Firebase...');
      const plansSnapshot = await getDocs(collection(db, 'plans'));
      const allPlans = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (allPlans.length > 0) {

        
        // Transform plans to match expected format
        const transformedPlans = allPlans.map(plan => ({
          id: plan.slug || plan.id,
          name: plan.name,
          data: (plan.capacity === 'Unlimited' || plan.capacity === -1) ? 'Unlimited GB' : (plan.capacity ? `${plan.capacity} GB` : 'N/A'),
          duration: plan.period ? `${plan.period} days` : 'N/A',
          price: plan.price || 0,
          currency: plan.currency || 'USD',
          country: plan.country_codes?.[0] || 'Multiple Countries',
          description: plan.description || '',
          capacity: plan.capacity === -1 ? 'Unlimited' : plan.capacity,
          period: plan.period,
          operator: plan.operator || '',
          country_codes: plan.country_codes || []
        }));
        
        // Filter out plans already attached to this region
        const alreadyAttached = regionalPlans.map(rp => rp.originalPlanId);
        const available = transformedPlans.filter(plan => !alreadyAttached.includes(plan.id));
        
        setAvailablePlans(available);

        
        // Debug: Log the first few plans to see their structure
        if (available.length > 0) {
          console.log('🔍 First plan data:', available[0]);
          console.log('🔍 All plans price data:', available.map(p => ({ name: p.name, price: p.price, currency: p.currency })));
        }
        

        
      } else {
        // If no plans in Firebase, show message to sync first
        setAvailablePlans([]);
        toast('No plans found in Firebase. Click "Sync All Data from DataPlans" to load plans.', { icon: 'ℹ️' });
      }
      
    } catch (error) {
      console.error('❌ Error loading plans from Firebase:', error);
      toast.error(`Error loading plans: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const attachPlanToRegion = async (plan) => {
    if (!selectedRegion) {
      toast.error('No region selected');
      return;
    }

    try {
      setLoading(true);
      
      // Attach the plan to the region
      await addDoc(collection(db, 'regionalPlans'), {
        name: plan.name,
        data: plan.data,
        duration: plan.duration,
        price: plan.price,
        currency: plan.currency || 'USD',
        description: plan.description || '',
        regionId: selectedRegion.id,
        regionName: selectedRegion.name,
        originalPlanId: plan.id,
        originalCountry: plan.country,
        attachedAt: new Date(),
        attachedVia: 'admin_panel'
      });
      
      toast.success(`Plan "${plan.name}" attached to ${selectedRegion.name}!`);
      setShowAttachPlanModal(false);
      
      // Refresh both modals
      if (showRegionalPlansModal && selectedRegion) {
        await showRegionalPlans(selectedRegion.id, selectedRegion.name);
      }
    } catch (error) {
      console.error('❌ Error attaching plan:', error);
      toast.error(`Error attaching plan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // User Management Functions
  const loadUsersFromFirestore = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      setFilteredUsers(usersData);
      console.log('✅ Loaded', usersData.length, 'users from Firestore');
    } catch (error) {
      console.error('❌ Error loading users:', error);
      toast.error(`Error loading users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeUserFromAdmin = async (userId, userEmail) => {
    if (!window.confirm(`Remove admin privileges from ${userEmail}? This user will lose access to admin features.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Update user role to 'user' (remove admin privileges)
      await updateDoc(doc(db, 'users', userId), {
        role: 'user',
        adminRemovedAt: new Date(),
        adminRemovedBy: currentUser.email,
        updatedAt: new Date()
      });
      
      toast.success(`Admin privileges removed from ${userEmail}`);
      
      // Refresh users list
      await loadUsersFromFirestore();
      
      // Close modal if open
      setShowRemoveAdminModal(false);
      setSelectedUserForAction(null);
    } catch (error) {
      console.error('❌ Error removing admin privileges:', error);
      toast.error(`Error removing admin privileges: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Delete user ${userEmail}? This action cannot be undone and will remove all user data.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Delete user document
      await deleteDoc(doc(db, 'users', userId));
      
      toast.success(`User ${userEmail} deleted successfully`);
      
      // Refresh users list
      await loadUsersFromFirestore();
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      toast.error(`Error deleting user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePlansForCountry = async () => {
    try {
      setLoading(true);
      
      // Load plans from Firebase directly (normal display)
      console.log('📱 Loading plans from Firebase...');
      const plansSnapshot = await getDocs(collection(db, 'plans'));
      const allPlans = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (allPlans.length > 0) {

        
        // Transform plans to match expected format (support both mobile and web formats)
        const transformedPlans = allPlans.map(plan => {
          // Handle mobile app format (capacity/period) vs web format (data/duration)
          const data = plan.capacity || plan.data;
          const duration = plan.period || plan.duration;
          
          return {
            id: plan.slug || plan.id,
            name: plan.name,
            data: (data === 'Unlimited' || data === -1) ? 'Unlimited GB' : (data ? `${data} GB` : 'N/A'),
            duration: duration ? `${duration} days` : 'N/A',
            price: plan.price || 0,
            currency: plan.currency || 'USD',
            country: plan.country_codes?.[0] || plan.country_ids?.[0] || 'Multiple Countries',
            description: plan.description || '',
            capacity: plan.capacity === -1 ? 'Unlimited' : plan.capacity,
            period: plan.period,
            operator: plan.operator || '',
            country_codes: plan.country_codes || plan.country_ids || []
          };
        });
        
        // Filter out plans already attached to this country (if we have selectedCountryForAttach)
        let available = transformedPlans;
        if (selectedCountryForAttach) {
          const existingCountryPlans = selectedCountryPlans.map(cp => cp.originalPlanId || cp.id);
          available = transformedPlans.filter(plan => !existingCountryPlans.includes(plan.id));
        }
        
        setAvailablePlans(available);

        
        // Debug: Log the first few plans to see their structure
        if (available.length > 0) {
          console.log('🔍 First plan data:', available[0]);
          console.log('🔍 All plans price data:', available.map(p => ({ name: p.name, price: p.price, currency: p.currency })));
        }
        

        
      } else {
        // If no plans in Firebase, show message to sync first
        setAvailablePlans([]);
        toast('No plans found in Firebase. Click "Sync All Data from DataPlans" to load plans.', { icon: 'ℹ️' });
      }
      
    } catch (error) {
      console.error('❌ Error loading plans from Firebase:', error);
      toast.error(`Error loading plans: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const syncAllDataFromDataPlans = async () => {
    try {
      setLoading(true);
      
      if (!dataplansApiKey.trim()) {
        toast.error('Please configure DataPlans API key first');
        return;
      }

      setSyncStatus('Syncing all data via Firebase Functions...');
      
      // Use your existing working Firebase Functions to sync ALL data
      console.log('🔄 Starting to sync all data via Firebase Functions...');
      const syncAllFunction = httpsCallable(functions, 'sync_all_data_from_api');
      const result = await syncAllFunction();
      
      if (result.data.success) {
        console.log(`✅ Successfully synced all data via Firebase Functions`);
        toast.success(`Successfully synced all data: ${result.data.total_synced} items`);
        
        // Refresh local data
        await loadCountriesFromFirestore();
        await loadRegionsFromFirestore();
        
        // Reload plans from Firebase (now with updated data)
        await loadAvailablePlans();
        
      } else {
        throw new Error(result.data.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error('❌ Error syncing data via Firebase Functions:', error);
      toast.error(`Error syncing data: ${error.message}`);
      setSyncStatus(`Error syncing data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const attachPlanToCountry = async (plan) => {
    if (!selectedCountryForAttach) {
      toast.error('No country selected');
      return;
    }

    try {
      setLoading(true);
      
      // Check if plan already exists for this country
      const existingPlanQuery = query(
        collection(db, 'plans'),
        where('name', '==', plan.name),
        where('country_codes', 'array-contains', selectedCountryForAttach.code)
      );
      const existingPlanSnapshot = await getDocs(existingPlanQuery);
      
      if (!existingPlanSnapshot.empty) {
        toast.error(`Plan "${plan.name}" is already available for ${selectedCountryForAttach.name}`);
        return;
      }
      
      // Attach the plan to the country (BOTH mobile and web app compatible)
      const planData = {
        name: plan.name,
        data: plan.capacity || plan.data || 'N/A',
        duration: plan.period || plan.duration || 'N/A',
        price: Math.round(plan.price), // Store as whole number
        currency: plan.currency || 'USD',
        description: plan.description || '',
        country: selectedCountryForAttach.name,
        countryCode: selectedCountryForAttach.code, // Web compatibility
        country_ids: [selectedCountryForAttach.code], // Web compatibility
        country_codes: [selectedCountryForAttach.code], // Mobile app compatibility
        status: 'active', // Web compatibility
        originalPlanId: plan.id,
        originalCountry: plan.country,
        attachedAt: new Date(),
        attachedVia: 'admin_panel'
      };
      
      // If it's a mobile app plan, preserve original fields
      if (plan.capacity && plan.period) {
        planData.capacity = plan.capacity;
        planData.period = plan.period;
      }
      
      await addDoc(collection(db, 'plans'), planData);
      
      toast.success(`Plan "${plan.name}" attached to ${selectedCountryForAttach.name}!`);
      setShowAttachCountryPlanModal(false);
      
      // Refresh the country plans in the current modal
      if (showCountriesModal && selectedCountryForAttach) {
        await showCountryPlans(selectedCountryForAttach.code, selectedCountryForAttach.name);
      }
      
      // Refresh plans modal if open
      if (showPlansModal && selectedCountry) {
        await showCountryPlans(selectedCountry.code, selectedCountry.name);
      }
      
      // Refresh countries to update plan counts
      await loadCountriesFromFirestore();
    } catch (error) {
      console.error('❌ Error attaching plan to country:', error);
      toast.error(`Error attaching plan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Overview Stats
  const statsData = [
    { label: 'Total Countries', value: countries.length, icon: Globe, color: 'blue' },
    { label: 'Regional Plans', value: regions.length, icon: MapPin, color: 'green' },
    { label: 'Environment', value: currentEnvironment, icon: Settings, color: 'gray' },
    { label: 'Status', value: 'Active', icon: Activity, color: 'emerald' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Professional Header */}
        <div className="py-8 mb-8 border-b border-gray-200 bg-white/80 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
                <Settings className="text-blue-600 mr-3" />
                Admin Panel
              </h1>
              <p className="text-gray-600 text-lg">Comprehensive eSIM service management and configuration</p>
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
                { id: 'users', label: 'Manage Users', icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-black text-white shadow-lg'
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
                                                  <div className={`p-3 rounded-lg ${
                          stat.color === 'blue' ? 'bg-blue-100' :
                          stat.color === 'green' ? 'bg-green-100' :
                          stat.color === 'gray' ? 'bg-gray-100' :
                          stat.color === 'emerald' ? 'bg-emerald-100' :
                          'bg-gray-100'
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            stat.color === 'blue' ? 'text-blue-600' :
                            stat.color === 'green' ? 'text-green-600' :
                            stat.color === 'gray' ? 'text-gray-600' :
                            stat.color === 'emerald' ? 'text-emerald-600' :
                            'text-gray-600'
                          }`} />
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
                      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                    >
                      <MapPin className="w-8 h-8 text-gray-600 mb-2" />
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
                      <DollarSign className="text-black mr-2" />
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
                        className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 bg-gray-200"
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

                {/* Data Synchronization */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <RefreshCw className="text-black mr-2" />
                    Data Synchronization
                  </h2>
                  
                  {/* Current API Endpoint Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-blue-900 mb-1 text-sm">Currently Using:</h3>
                        <span className="text-sm text-blue-700">
                          {currentEnvironment === 'test' 
                            ? 'https://sandbox.dataplans.io/api/v1' 
                            : 'https://api.dataplans.io/api/v1'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <button
                      onClick={syncAllDataFromAPI}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
                    >
                      {loading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
                      Sync All Data from DataPlans API
                    </button>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2 text-sm">Sync Status</h3>
                      <div className="text-sm text-gray-600">
                        {syncStatus}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dangerous Operations */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <AlertTriangle className="text-red-600 mr-2" />
                    Dangerous Operations
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    These operations are irreversible and will permanently delete data from your database.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-semibold text-red-800 mb-2">Delete All Countries & Plans</h3>
                      <p className="text-sm text-red-700 mb-3">
                        This will remove ALL countries and their associated plans from the database. 
                        DataPlans can then fetch fresh data. This action cannot be undone.
                      </p>
                      <button
                        onClick={deleteAllCountries}
                        disabled={loading || isDeleting}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
                      >
                        {isDeleting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 mr-2"
                          >
                            <Trash2 className="w-5 h-5" />
                          </motion.div>
                        ) : (
                          <Trash2 className="w-5 h-5 mr-2" />
                        )}
                        {isDeleting ? 'Deleting...' : 'Delete All Countries & Plans'}
                      </button>
                    </div>
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
                    <div className="flex space-x-3">
                      {/* Delete All Countries button moved to Configuration tab */}
                    </div>
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
                        <span className="text-2xl">{country.flagEmoji || getFlagEmoji(country.code) || '🏳️'}</span>
                      </div>
                      <div className="space-y-2 mb-4">
                        {country.hasPlans ? (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              From ${country.minPrice}
                            </p>
                            <p className="text-xs text-gray-500">
                              {country.planCount} plan{country.planCount !== 1 ? 's' : ''} available
                            </p>
                          </div>
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
                          className="flex-1 bg-black hover:bg-gray-800 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
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
                      className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
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
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              From ${region.minPrice}
                            </p>
                            <p className="text-xs text-gray-500">
                              Plans available
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            <i className="fas fa-info-circle w-4 h-4 inline mr-1" />
                            No plans assigned
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => showRegionalPlans(region.id, region.name)}
                          className="flex-1 bg-black hover:bg-gray-800 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
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
                    <p className="text-gray-600">No regional plans created yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Manage Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">User Management</h2>
                      <p className="text-gray-600">Manage users and their permissions</p>
                    </div>
                  </div>
                </div>

                {/* Users Search and Actions */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users by email, role, or user ID..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>

                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-700">
                                        {user.email.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {user.email}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      User ID: {user.id}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.role === 'admin' || user.role === 'super_admin'
                                    ? 'bg-red-100 text-red-800'
                                    : user.role === 'moderator'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {user.role || 'user'}
                                </span>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  {(user.role === 'admin' || user.role === 'super_admin') && (
                                    <button
                                      onClick={() => {
                                        setSelectedUserForAction(user);
                                        setShowRemoveAdminModal(true);
                                      }}
                                      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-xs transition-colors"
                                      title="Remove admin privileges"
                                    >
                                      Remove Admin
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteUser(user.id, user.email)}
                                    className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-xs transition-colors"
                                    title="Delete user"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-sm">No users found</p>
                              {userSearchTerm && (
                                <p className="text-xs mt-1">Try adjusting your search terms</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region Code*</label>
                  <input
                    type="text"
                    value={newRegion.code}
                    onChange={(e) => setNewRegion({...newRegion, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., EUR"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newRegion.description}
                    onChange={(e) => setNewRegion({...newRegion, description: e.target.value})}
                    placeholder="Description of the regional coverage"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <input
                    type="text"
                    value={newRegion.icon}
                    onChange={(e) => setNewRegion({...newRegion, icon: e.target.value})}
                    placeholder="🌍"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
                  className="flex-1 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Region'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Country Plans Modal */}
        {showCountriesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">Plans for {selectedCountryName}</h3>
                    <p className="text-sm text-gray-600 mt-1">Manage country eSIM plans</p>
                  </div>
                  <div className="flex space-x-3">
                    <div className="relative dropdown-container" style={{ position: 'relative', zIndex: 9999 }}>
                      <button
                        onClick={async () => {
                          const newState = !showAttachCountryPlanModal;
                          setShowAttachCountryPlanModal(newState);
                          if (newState) {
                            // Load available plans when opening the modal
                            await loadAvailablePlansForCountry();
                          }
                        }}
                        className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Attach Plan
                      </button>
                      
                      {/* Dropdown Menu */}
                                                {showAttachCountryPlanModal && (
                        <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] overflow-hidden" style={{ 
                          minWidth: '400px', 
                          maxWidth: '90vw',
                          maxHeight: '400px',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}>
                          <div className="p-3 border-b border-gray-200 bg-gray-50">
                            <h4 className="font-semibold text-gray-900">Select Plan to Attach</h4>
                            <p className="text-sm text-gray-600">Available plans from DataPlans</p>
                          </div>
                          
                          <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                          {availablePlans.length > 0 ? (
                            <div className="p-2">
                              {availablePlans.map((plan) => (
                                <div
                                  key={plan.id}
                                  onClick={() => {
                                    attachPlanToCountry(plan);
                                    setShowAttachCountryPlanModal(false);
                                  }}
                                  className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-gray-900 text-sm truncate">{plan.name}</h5>
                                      <p className="text-xs text-gray-600">{plan.data} • {plan.duration}</p>
                                      <p className="text-xs text-gray-500">Country: {plan.country}</p>
                                    </div>
                                    <div className="text-right ml-2 flex-shrink-0">
                                      <p className="text-sm font-bold text-green-600">{plan.currency === 'USD' ? '$' : plan.currency}{Math.round(plan.price)}</p>
                                      <p className="text-xs text-gray-500">{plan.currency}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center">
                              <p className="text-gray-500">No plans available</p>
                              <p className="text-xs text-gray-400">Sync plans from config section first</p>
                            </div>
                          )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowCountriesModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-96">
                {selectedCountryPlans.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCountryPlans.map((plan) => {
                      console.log('📋 Rendering plan:', plan);
                      return (
                        <div key={plan.id} className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                                {plan.source && (
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    plan.source === 'mobile' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {plan.source === 'mobile' ? '📱 Mobile' : '🌐 Web'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{plan.data} • {plan.duration}</p>
                              <p className="text-sm text-gray-500">Country: {plan.country}</p>
                              <div className="mt-2">
                                <div>
                                  <p className="text-gray-500">Price</p>
                                  <p className="text-lg font-bold text-black">{plan.currency === 'USD' ? '$' : plan.currency}{Math.round(plan.price)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  console.log('🔧 Edit button clicked for plan:', plan);
                                  const newPrice = prompt(`Edit price for "${plan.name}"\n\nCurrent price: ${plan.currency === 'USD' ? '$' : plan.currency}${Math.round(plan.price)}\n\nEnter new price:`, Math.round(plan.price));
                                  if (newPrice && !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) > 0) {
                                    console.log('💰 Updating price for plan:', plan.id, 'to:', newPrice);
                                    updateCountryPlanPrice(plan.id, parseFloat(newPrice));
                                  } else if (newPrice !== null) {
                                    toast.error('Please enter a valid price');
                                  }
                                }}
                                className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit Price
                              </button>
                              <button
                                onClick={() => {
                                  console.log('🗑️ Delete button clicked for plan:', plan);
                                  if (window.confirm(`Remove plan "${plan.name}" from this country?`)) {
                                    console.log('🗑️ Deleting plan:', plan.id, plan.name);
                                    deleteCountryPlan(plan.id, plan.name);
                                  }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No Plans Attached</h4>
                    <p className="text-gray-600">This country doesn't have any plans yet. Use "Attach Plan" to add plans from DataPlans.</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Available Plans: {selectedCountryPlans.length}</span>
                  <span>Country: {selectedCountryName}</span>
                </div>
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
              className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">Plans for {selectedRegion?.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">Manage regional eSIM plans</p>
                  </div>
                  <div className="flex space-x-3">
                    <div className="relative dropdown-container" style={{ position: 'relative', zIndex: 9999 }}>
                      <button
                        onClick={async () => {
                          const newState = !showAttachPlanModal;
                          setShowAttachPlanModal(newState);
                          if (newState) {
                            // Load available plans when opening the dropdown
                            await loadAvailablePlans();
                          }
                        }}
                        className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Attach Plan
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showAttachPlanModal && (
                        <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] overflow-hidden" style={{ 
                          minWidth: '400px', 
                          maxWidth: '90vw',
                          maxHeight: '400px',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}>
                          <div className="p-3 border-b border-gray-200 bg-gray-50">
                            <h4 className="font-semibold text-gray-900">Select Plan to Attach</h4>
                            <p className="text-sm text-gray-600">Available plans from DataPlans</p>
                          </div>
                          
                          <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                          {availablePlans.length > 0 ? (
                            <div className="p-2">
                              {availablePlans.map((plan) => (
                                <div
                                  key={plan.id}
                                  onClick={() => {
                                    attachPlanToRegion(plan);
                                    setShowAttachPlanModal(false);
                                  }}
                                  className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-gray-900 text-sm truncate">{plan.name}</h5>
                                      <p className="text-xs text-gray-600">{plan.data} • {plan.duration}</p>
                                      <p className="text-xs text-gray-500">Country: {plan.country}</p>
                                    </div>
                                    <div className="text-right ml-2 flex-shrink-0">
                                      <p className="text-sm font-bold text-green-600">{plan.currency === 'USD' ? '$' : plan.currency}{Math.round(plan.price)}</p>
                                      <p className="text-xs text-gray-500">{plan.currency}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center">
                              <p className="text-gray-500">No plans available</p>
                              <p className="text-xs text-gray-400">Sync plans from config section first</p>
                            </div>
                          )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowRegionalPlansModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-96">
                {regionalPlans.length > 0 ? (
                  <div className="space-y-4">
                    {regionalPlans.map((plan) => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                              {plan.originalPlanId && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                  Attached
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Data</p>
                                <p className="font-medium">{plan.data}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Duration</p>
                                <p className="font-medium">{plan.duration}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Price</p>
                                <p className="text-lg font-bold text-black">{plan.currency === 'USD' ? '$' : plan.currency}{Math.round(plan.price)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Type</p>
                                <p className="font-medium">{plan.originalPlanId ? 'Attached' : 'Custom'}</p>
                              </div>
                            </div>
                            {plan.description && (
                              <p className="text-sm text-gray-600 mt-3">{plan.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={() => {
                                const newPrice = prompt(`Edit price for "${plan.name}"\n\nCurrent price: ${plan.currency === 'USD' ? '$' : plan.currency}${Math.round(plan.price)}\n\nEnter new price:`, Math.round(plan.price));
                                if (newPrice && !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) > 0) {
                                  updateCountryPlanPrice(plan.id, parseFloat(newPrice));
                                } else if (newPrice !== null) {
                                  toast.error('Please enter a valid price');
                                }
                              }}
                              className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit Price
                            </button>
                            <button
                              onClick={() => deleteCountryPlan(plan.id, plan.name)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              {plan.originalPlanId ? 'Detach' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No Plans Yet</h4>
                    <p className="text-gray-600">No plans attached to {selectedRegion?.name}</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600 text-center">
                  <span>Total Plans: {regionalPlans.length}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}



        {/* Attach Country Plan Modal */}

        {/* Remove Admin Modal */}
        {showRemoveAdminModal && selectedUserForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-red-600">Remove Admin Privileges</h3>
                <button
                  onClick={() => {
                    setShowRemoveAdminModal(false);
                    setSelectedUserForAction(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-800">Warning</span>
                  </div>
                  <p className="text-sm text-red-700 mt-2">
                    You are about to remove admin privileges from <strong>{selectedUserForAction.email}</strong>.
                  </p>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p><strong>What this means:</strong></p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>User will lose access to admin dashboard</li>
                    <li>User will become a regular user</li>
                    <li>This action can be reversed by another admin</li>
                  </ul>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowRemoveAdminModal(false);
                      setSelectedUserForAction(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => removeUserFromAdmin(selectedUserForAction.id, selectedUserForAction.email)}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? 'Removing...' : 'Remove Admin'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
