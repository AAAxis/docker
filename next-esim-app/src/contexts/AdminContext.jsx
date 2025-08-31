'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { adminService, ADMIN_ROLES, ADMIN_PERMISSIONS } from '../services/adminService';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userRole, setUserRole] = useState(ADMIN_ROLES.USER);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserRole = async () => {
      if (!currentUser) {
        setUserRole(ADMIN_ROLES.USER);
        setIsAdmin(false);
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get user role
        const role = await adminService.getUserRole(currentUser.uid);
        setUserRole(role);
        
        // Check if user is admin
        const adminStatus = role !== ADMIN_ROLES.USER;
        setIsAdmin(adminStatus);
        
        // Get user permissions
        const userPermissions = ADMIN_PERMISSIONS[role] || [];
        setPermissions(userPermissions);
        
      } catch (error) {
        console.error('Error loading user role:', error);
        setUserRole(ADMIN_ROLES.USER);
        setIsAdmin(false);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserRole();
  }, [currentUser]);

  // Check if user has specific permission
  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  // Check if user can manage admins
  const canManageAdmins = () => {
    return hasPermission('manage_admins');
  };

  // Check if user can manage countries
  const canManageCountries = () => {
    return hasPermission('manage_countries');
  };

  // Check if user can manage plans
  const canManagePlans = () => {
    return hasPermission('manage_plans');
  };

  // Check if user can manage config
  const canManageConfig = () => {
    return hasPermission('manage_config');
  };

  // Check if user can delete data
  const canDeleteData = () => {
    return hasPermission('delete_data');
  };

  // Check if user can view analytics
  const canViewAnalytics = () => {
    return hasPermission('view_analytics');
  };

  // Refresh user role (useful after role changes)
  const refreshRole = async () => {
    if (!currentUser) return;
    
    try {
      const role = await adminService.getUserRole(currentUser.uid);
      setUserRole(role);
      setIsAdmin(role !== ADMIN_ROLES.USER);
      
      const userPermissions = ADMIN_PERMISSIONS[role] || [];
      setPermissions(userPermissions);
    } catch (error) {
      console.error('Error refreshing user role:', error);
    }
  };

  const value = {
    // State
    userRole,
    isAdmin,
    permissions,
    loading,
    
    // Permission checkers
    hasPermission,
    canManageAdmins,
    canManageCountries,
    canManagePlans,
    canManageConfig,
    canDeleteData,
    canViewAnalytics,
    
    // Actions
    refreshRole,
    
    // Constants
    ADMIN_ROLES
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContext;
