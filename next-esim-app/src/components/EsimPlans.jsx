"use client";

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

// Helper function to get flag emoji from country code
const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return null;
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  
  return String.fromCodePoint(...codePoints);
};

// Standard 8 countries list
const getStandardCountries = () => {
  return [
    { id: '1', name: 'Germany', code: 'DE', minPrice: 2.99, flagEmoji: getFlagEmoji('DE') },
    { id: '2', name: 'Netherlands', code: 'NL', minPrice: 2.79, flagEmoji: getFlagEmoji('NL') },
    { id: '3', name: 'United Kingdom', code: 'GB', minPrice: 3.99, flagEmoji: getFlagEmoji('GB') },
    { id: '4', name: 'United States', code: 'US', minPrice: 4.99, flagEmoji: getFlagEmoji('US') },
    { id: '5', name: 'Canada', code: 'CA', minPrice: 3.99, flagEmoji: getFlagEmoji('CA') },
    { id: '6', name: 'Australia', code: 'AU', minPrice: 4.49, flagEmoji: getFlagEmoji('AU') },
    { id: '7', name: 'China', code: 'CN', minPrice: 8.99, flagEmoji: getFlagEmoji('CN') },
    { id: '8', name: 'South Korea', code: 'KR', minPrice: 6.99, flagEmoji: getFlagEmoji('KR') }
  ];
};

// Enhanced regional data with better structure
const getStandardRegions = () => {
  return [
    { 
      id: 'europe', 
      name: 'Europe', 
      code: 'EUR',
      minPrice: 14.99, 
      icon: '🇪🇺',
      description: 'Coverage across 30+ European countries',
      countries: ['Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'United Kingdom', 'Switzerland', 'Austria'],
      planTypes: ['1GB/7days', '3GB/15days', '5GB/30days', '10GB/30days']
    },
    { 
      id: 'asia-pacific', 
      name: 'Asia Pacific', 
      code: 'APAC',
      minPrice: 19.99, 
      icon: '🌏',
      description: 'Coverage across Asia and Pacific regions',
      countries: ['Japan', 'South Korea', 'Singapore', 'Thailand', 'Australia', 'New Zealand', 'Hong Kong', 'Taiwan'],
      planTypes: ['1GB/7days', '3GB/15days', '5GB/30days', '8GB/30days']
    },
    { 
      id: 'americas', 
      name: 'Americas', 
      code: 'AMR',
      minPrice: 16.99, 
      icon: '🌎',
      description: 'Coverage across North and South America',
      countries: ['United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru'],
      planTypes: ['2GB/7days', '5GB/15days', '10GB/30days', '15GB/30days']
    },
    { 
      id: 'mea', 
      name: 'Middle East & Africa', 
      code: 'MEA',
      minPrice: 22.99, 
      icon: '🌍',
      description: 'Coverage across Middle East and Africa',
      countries: ['UAE', 'Saudi Arabia', 'South Africa', 'Egypt', 'Turkey', 'Israel', 'Kenya', 'Nigeria'],
      planTypes: ['1GB/7days', '3GB/15days', '5GB/30days', '7GB/30days']
    },
    { 
      id: 'global', 
      name: 'Global', 
      code: 'GLB',
      minPrice: 29.99, 
      icon: '🌐',
      description: 'Worldwide coverage in 150+ countries',
      countries: ['Worldwide Coverage'],
      planTypes: ['1GB/7days', '3GB/15days', '5GB/30days', '10GB/30days', '20GB/30days']
    }
  ];
};

const EsimPlans = () => {
  const [activeTab, setActiveTab] = useState('local');
  const [searchTerm, setSearchTerm] = useState('');
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [filteredRegions, setFilteredRegions] = useState([]);
  
  // Plan selection and checkout state
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch only the 6 standard countries
  const { data: countriesData, isLoading: countriesLoading, error: countriesError } = useQuery({
    queryKey: ['standard-countries'],
    queryFn: async () => {
      try {
        console.log('Fetching standard 8 countries from Firebase...');
        const standardCountryNames = ['Germany', 'Netherlands', 'United Kingdom', 'United States', 'Canada', 'Australia', 'China', 'South Korea'];
        const countriesWithPlans = [];
        
        // Fetch only the 7 standard countries
        for (const countryName of standardCountryNames) {
          try {
            // Query for this specific country
            const countryQuery = query(collection(db, 'countries'), where('name', '==', countryName));
            const countrySnapshot = await getDocs(countryQuery);
            
            if (!countrySnapshot.empty) {
              const countryDoc = countrySnapshot.docs[0];
              const countryData = { id: countryDoc.id, ...countryDoc.data() };
              
              // Get plans for this country to find minimum price
              const plansQuery = query(collection(db, 'plans'), where('country', '==', countryName));
              const plansSnapshot = await getDocs(plansQuery);
              const plans = plansSnapshot.docs.map(planDoc => planDoc.data());
              
              const minPrice = plans.length > 0 
                ? Math.min(...plans.map(plan => parseFloat(plan.price) || 9.99))
                : 9.99;
              
              countriesWithPlans.push({
                ...countryData,
                minPrice: minPrice,
                flagEmoji: getFlagEmoji(countryData.code)
              });
            }
          } catch (error) {
            console.log(`Could not fetch ${countryName}:`, error);
          }
        }
        
        console.log('Fetched standard countries:', countriesWithPlans.length);
        return countriesWithPlans.length > 0 ? countriesWithPlans : getStandardCountries();
      } catch (error) {
        console.error('Firebase error:', error);
        return getStandardCountries();
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (cacheTime renamed to gcTime in v5)
  });

  // Fetch regions
  const { data: regionsData, isLoading: regionsLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'regions'));
        return querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          minPrice: 19.99 // Default regional price
        }));
      } catch (error) {
        console.error('Firebase regions error:', error);
        // Return enhanced fallback regional data
        return getStandardRegions();
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // cacheTime renamed to gcTime in v5
  });

  useEffect(() => {
    console.log('useEffect triggered:', { 
      countriesData: countriesData?.length, 
      countriesLoading, 
      countriesError,
      regionsData: regionsData?.length 
    });
    
    if (countriesData) {
      console.log('Setting countries data:', countriesData);
      setCountries(countriesData);
      setFilteredCountries(countriesData);
    } else if (countriesError) {
      console.log('Using standard countries due to error:', countriesError);
      // Use standard countries on error
      const standardData = getStandardCountries();
      setCountries(standardData);
      setFilteredCountries(standardData);
    }
    
    if (regionsData) {
      setRegions(regionsData);
      setFilteredRegions(regionsData);
    }
  }, [countriesData, regionsData, countriesError, countriesLoading]);

  // Search function to fetch countries from Firebase
  const searchCountries = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      console.log('Searching for countries:', term);
      const querySnapshot = await getDocs(collection(db, 'countries'));
      const searchResults = [];
      
      for (const doc of querySnapshot.docs) {
        const countryData = { id: doc.id, ...doc.data() };
        
        // Check if country name matches search term
        if (countryData.name.toLowerCase().includes(term.toLowerCase())) {
          // Get plans for this country to find minimum price
          const plansQuery = query(collection(db, 'plans'), where('country', '==', countryData.name));
          const plansSnapshot = await getDocs(plansQuery);
          const plans = plansSnapshot.docs.map(planDoc => planDoc.data());
          
          const minPrice = plans.length > 0 
            ? Math.min(...plans.map(plan => parseFloat(plan.price) || 9.99))
            : 9.99;
          
          searchResults.push({
            ...countryData,
            minPrice: minPrice,
            flagEmoji: getFlagEmoji(countryData.code)
          });
        }
      }
      
      console.log('Search results:', searchResults.length);
      setSearchResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchCountries(searchTerm);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Filter countries and regions based on search term
  useEffect(() => {
    if (searchTerm) {
      // Show search results when searching
      setFilteredCountries(searchResults);
      
      // Filter regions based on search term
      const filteredRegionalResults = regions.filter(region => 
        region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        region.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        region.countries?.some(country => 
          country.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredRegions(filteredRegionalResults);
    } else {
      // Show standard data when not searching
      setFilteredCountries(countries);
      setFilteredRegions(regions);
    }
  }, [searchTerm, countries, regions, searchResults]);

  const handleCountrySelect = async (country) => {
    setSelectedPlan({
      ...country,
      type: 'country'
    });
    setShowCheckoutModal(true);
    await loadAvailablePlansForCountry(country.code);
  };

  const handleRegionSelect = async (region) => {
    setSelectedPlan({
      ...region,
      type: 'region'
    });
    setShowCheckoutModal(true);
    await loadAvailablePlansForRegion(region.id);
  };

  // Load available plans for a specific country
  const loadAvailablePlansForCountry = async (countryCode) => {
    setLoadingPlans(true);
    try {
      // Query for plans that include this country
      const plansQuery = query(
        collection(db, 'plans'),
        where('country_codes', 'array-contains', countryCode)
      );
      const querySnapshot = await getDocs(plansQuery);
      
      const plans = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAvailablePlans(plans);
    } catch (error) {
      console.error('Error loading plans for country:', error);
      setAvailablePlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  // Load available plans for a specific region
  const loadAvailablePlansForRegion = async (regionId) => {
    setLoadingPlans(true);
    try {
      // Query for regional plans
      const plansQuery = query(
        collection(db, 'plans'),
        where('region_id', '==', regionId)
      );
      const querySnapshot = await getDocs(plansQuery);
      
      const plans = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAvailablePlans(plans);
    } catch (error) {
      console.error('Error loading plans for region:', error);
      setAvailablePlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  // Show fallback data immediately if no countries are loaded after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!countriesData && !countriesError && countries.length === 0) {
        console.log('Timeout reached, using standard countries');
        const standardData = getStandardCountries();
        setCountries(standardData);
        setFilteredCountries(standardData);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [countriesData, countriesError, countries.length]);

  return (
    <>
      {/* Hero/Banner Section - Show immediately */}
      <section className="hero-banner relative text-white overflow-hidden min-h-[500px] flex items-center">
        <div className="absolute inset-0">
          <img 
            src="/images/frontend/banner/67fe50cfd1fe51744720079.png" 
            alt="eSIM Banner"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              Global eSIM Plans
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl mb-8 text-blue-100"
            >
              Stay connected worldwide with our flexible data plans
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-4 text-sm md:text-base"
            >
              <div className="flex items-center bg-white/10 rounded-full px-4 py-2">
                <span className="mr-2">🌍</span>
                <span>200+ Countries</span>
              </div>
              <div className="flex items-center bg-white/10 rounded-full px-4 py-2">
                <span className="mr-2">⚡</span>
                <span>Instant Activation</span>
              </div>
              <div className="flex items-center bg-white/10 rounded-full px-4 py-2">
                <span className="mr-2">💳</span>
                <span>Secure Payment</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="destination py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="destination-top mb-8">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="esim-plan-tab bg-white rounded-lg p-1 shadow-lg" role="tablist">
              <button
                className={`esim-plan-tab__btn px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                  activeTab === 'local'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
                onClick={() => setActiveTab('local')}
                type="button"
                role="tab"
              >
                Local eSIMs
              </button>
              <button
                className={`esim-plan-tab__btn px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                  activeTab === 'regional'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
                onClick={() => setActiveTab('regional')}
                type="button"
                role="tab"
              >
                Regional eSIMs
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="search-box max-w-md mx-auto mb-8">
            <div className="search-box-field relative">
              <input
                className="search-box-field__input w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                type="text"
                placeholder="Search your destination"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="search-box-field__icon absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search className="w-5 h-5" />
              </span>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Local eSIMs Tab */}
          {activeTab === 'local' && (
            <div className="tab-pane fade show active">
              {/* Loading state for countries */}
              {countriesLoading && countries.length === 0 ? (
                <div className="flex justify-center items-center min-h-64">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                  <p className="ml-4 text-gray-600">Loading countries...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-center">
                  {filteredCountries.map((country, index) => (
                  <motion.div
                    key={country.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="col-span-1"
                  >
                    <button
                      className="esim-plan-card w-full bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-left border border-gray-100 hover:border-blue-200"
                      onClick={() => handleCountrySelect(country)}
                    >
                      <div className="country-flag-display text-center mb-4">
                        {country.flagEmoji ? (
                          <span className="country-flag-emoji text-5xl">
                            {country.flagEmoji}
                          </span>
                        ) : (
                          <div className="country-code-avatar w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-lg">
                              {country.code || '??'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="esim-plan-card__content text-center">
                        <h5 className="esim-plan-card__title text-lg font-semibold text-gray-900 mb-2">
                          {country.name}
                        </h5>
                        <span className="esim-plan-card__price text-blue-600 font-medium">
                          From ${country.minPrice ? Math.round(country.minPrice) : '10'}
                        </span>
                      </div>
                    </button>
                  </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Regional eSIMs Tab */}
          {activeTab === 'regional' && (
            <div className="tab-pane fade show active">
              {/* Loading state for regions */}
              {regionsLoading && regions.length === 0 ? (
                <div className="flex justify-center items-center min-h-64">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                  <p className="ml-4 text-gray-600">Loading regional plans...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-center">
                  {filteredRegions.length > 0 ? (
                    filteredRegions.map((region, index) => (
                      <motion.div
                        key={region.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="col-span-1"
                      >
                        <button
                          className="esim-plan-card w-full bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-left border border-gray-100 hover:border-blue-200 group"
                          onClick={() => handleRegionSelect(region)}
                        >
                          <div className="country-flag-display text-center mb-4">
                            <span className="region-icon text-5xl group-hover:scale-110 transition-transform duration-200">
                              {region.icon || '🌍'}
                            </span>
                          </div>

                          <div className="esim-plan-card__content text-center">
                            <h5 className="esim-plan-card__title text-lg font-semibold text-gray-900 mb-2">
                              {region.name}
                            </h5>
                            {region.description && (
                              <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                                {region.description}
                              </p>
                            )}
                                                          <div className="space-y-1">
                                <span className="esim-plan-card__price text-blue-600 font-medium block">
                                  From ${region.minPrice ? Math.round(region.minPrice) : '20'}
                                </span>
                                {region.countries && region.countries.length > 0 && (
                                  <p className="text-xs text-gray-400 mb-3">
                                    {region.countries.length === 1 && region.countries[0] === 'Worldwide Coverage' 
                                      ? 'Worldwide Coverage'
                                      : `${region.countries.length}+ countries`
                                    }
                                  </p>
                                )}

                              </div>
                            </div>
                          </button>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <div className="max-w-md mx-auto">
                        <span className="text-6xl mb-4 block">🌐</span>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Regional Plans Coming Soon</h3>
                        <p className="text-gray-500">
                          We're preparing amazing regional eSIM plans for you. Check back soon!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>



        {/* Empty State */}
        {filteredCountries.length === 0 && !countriesLoading && searchTerm && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No countries found matching "{searchTerm}"
            </p>
          </div>
        )}
      </div>
    </section>

    {/* Features Section */}
    <section className="features py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Our eSIM?
          </h2>
          <p className="text-xl text-gray-600">
            Experience seamless connectivity with our premium eSIM solutions
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🌍</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Global Coverage</h3>
            <p className="text-gray-600">Access to 200+ countries and regions worldwide</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Activation</h3>
            <p className="text-gray-600">Get connected immediately after purchase</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h3>
            <p className="text-gray-600">Safe and encrypted payment processing</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Setup</h3>
            <p className="text-gray-600">Simple QR code activation process</p>
          </motion.div>
        </div>
      </div>
    </section>

    {/* Checkout Modal */}
    {showCheckoutModal && selectedPlan && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Complete Your Purchase</h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          
                    <div className="p-6 overflow-y-auto max-h-96">
            <div className="space-y-6">
              {/* Available Plans */}
              {availablePlans.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Available Plans</h4>
                  <div className="space-y-3">
                    {availablePlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowCheckoutModal(false);
                          // Navigate to checkout page with selected plan
                          window.location.href = `/checkout?plan=${plan.id}&type=${selectedPlan.type || 'country'}`;
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium text-gray-900">{plan.name}</h5>
                            <p className="text-sm text-gray-600">{plan.data} • {plan.duration}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600">${Math.round(plan.price)}</p>
                            <p className="text-xs text-gray-500">{plan.currency}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingPlans && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading available plans...</p>
                </div>
              )}

              {!loadingPlans && availablePlans.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">No plans available for this selection</p>
                  <p className="text-sm text-gray-500">Please try another country or region</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default EsimPlans;
