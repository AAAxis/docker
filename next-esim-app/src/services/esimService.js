import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

// Firebase Functions for eSIM operations
const createOrder = httpsCallable(functions, 'createOrder');
const getEsimQrCode = httpsCallable(functions, 'getEsimQrCode');
const checkEsimCapacity = httpsCallable(functions, 'checkEsimCapacity');
const syncCountriesFromApi = httpsCallable(functions, 'syncCountriesFromApi');
const syncRegionsFromApi = httpsCallable(functions, 'syncRegionsFromApi');
const syncPlansFromApi = httpsCallable(functions, 'syncPlansFromApi');
const syncAllDataFromApi = httpsCallable(functions, 'syncAllDataFromApi');

export const esimService = {
  // Create eSIM order
  async createOrder(orderData) {
    try {
      const result = await createOrder(orderData);
      return result.data;
    } catch (error) {
      console.error('Error creating eSIM order:', error);
      throw error;
    }
  },

  // Get eSIM QR code
  async getEsimQrCode(orderId) {
    try {
      const result = await getEsimQrCode({ orderId });
      return result.data;
    } catch (error) {
      console.error('Error getting eSIM QR code:', error);
      throw error;
    }
  },

  // Check eSIM capacity
  async checkEsimCapacity(planId) {
    try {
      const result = await checkEsimCapacity({ planId });
      return result.data;
    } catch (error) {
      console.error('Error checking eSIM capacity:', error);
      throw error;
    }
  },

  // Sync countries from API
  async syncCountriesFromApi() {
    try {
      const result = await syncCountriesFromApi();
      return result.data;
    } catch (error) {
      console.error('Error syncing countries:', error);
      throw error;
    }
  },

  // Sync regions from API
  async syncRegionsFromApi() {
    try {
      const result = await syncRegionsFromApi();
      return result.data;
    } catch (error) {
      console.error('Error syncing regions:', error);
      throw error;
    }
  },

  // Sync plans from API
  async syncPlansFromApi() {
    try {
      const result = await syncPlansFromApi();
      return result.data;
    } catch (error) {
      console.error('Error syncing plans:', error);
      throw error;
    }
  },

  // Sync all data from API
  async syncAllDataFromApi() {
    try {
      const result = await syncAllDataFromApi();
      return result.data;
    } catch (error) {
      console.error('Error syncing all data:', error);
      throw error;
    }
  }
};
