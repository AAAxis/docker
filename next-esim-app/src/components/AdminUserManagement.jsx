"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { adminService, ADMIN_ROLES } from '../services/adminService';
import { 
  Users, 
  Shield, 
  Edit, 
  Trash2, 
  Plus, 
  Search,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUserManagement = () => {
  const { currentUser } = useAuth();
  const { canManageAdmins, userRole } = useAdmin();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [adminLogs, setAdminLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadUsers();
    loadAdminLogs();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(user => 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await adminService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminLogs = async () => {
    try {
      const logs = await adminService.getAdminLogs(100);
      setAdminLogs(logs);
    } catch (error) {
      console.error('Error loading admin logs:', error);
    }
  };

  const handleRoleChange = async (newRole) => {
    if (!selectedUser) {
      toast.error('No user selected');
      return;
    }

    try {
      await adminService.setUserRole(selectedUser.id, newRole, currentUser.uid);
      toast.success(`Successfully updated ${selectedUser.email} to ${newRole}`);
      
      // Refresh users list
      await loadUsers();
      await loadAdminLogs();
      
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error(`Failed to update user role: ${error.message}`);
    }
  };

  const handleRemoveAdmin = async (userId, userEmail) => {

    if (!window.confirm(`Remove admin privileges from ${userEmail}?`)) {
      return;
    }

    try {
      await adminService.removeAdminRole(userId, currentUser.uid);
      toast.success(`Removed admin privileges from ${userEmail}`);
      
      // Refresh users list
      await loadUsers();
      await loadAdminLogs();
    } catch (error) {
      console.error('Error removing admin role:', error);
      toast.error(`Failed to remove admin role: ${error.message}`);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case ADMIN_ROLES.SUPER_ADMIN:
        return 'bg-red-100 text-red-800';
      case ADMIN_ROLES.ADMIN:
        return 'bg-blue-100 text-blue-800';
      case ADMIN_ROLES.MODERATOR:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case ADMIN_ROLES.SUPER_ADMIN:
        return <Shield className="w-4 h-4" />;
      case ADMIN_ROLES.ADMIN:
        return <Shield className="w-4 h-4" />;
      case ADMIN_ROLES.MODERATOR:
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  // Open access - no permission checks needed

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <Users className="text-blue-600 mr-3" />
            User Management
          </h1>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Super Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === ADMIN_ROLES.SUPER_ADMIN).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === ADMIN_ROLES.ADMIN).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Moderators</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === ADMIN_ROLES.MODERATOR).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
            >
              <Clock className="w-4 h-4 mr-2" />
              {showLogs ? 'Hide' : 'Show'} Admin Logs
            </button>
          </div>
        </div>

        {/* Admin Logs */}
        {showLogs && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Clock className="text-gray-600 mr-2" />
              Recent Admin Actions
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {adminLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    <p className="text-xs text-gray-500">
                      Admin: {log.adminId} | {log.timestamp?.toDate?.()?.toLocaleString() || 'Unknown time'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {JSON.stringify(log.details)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center">
              <Users className="text-blue-600 mr-2" />
              All Users
              <span className="text-sm text-gray-500 font-normal ml-2">({filteredUsers.length} users)</span>
            </h2>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Users Table */}
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
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.displayName || user.email}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role || ADMIN_ROLES.USER)}`}>
                          {getRoleIcon(user.role || ADMIN_ROLES.USER)}
                          <span className="ml-1">{user.role || ADMIN_ROLES.USER}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRoleModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user.role && user.role !== ADMIN_ROLES.USER && user.role !== ADMIN_ROLES.SUPER_ADMIN && (
                            <button
                              onClick={() => handleRemoveAdmin(user.id, user.email)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role Change Modal */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Change Role for {selectedUser.email}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Current role: <span className="font-medium">{selectedUser.role || ADMIN_ROLES.USER}</span>
                </p>
                
                <div className="space-y-3">
                  {Object.values(ADMIN_ROLES).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedUser.role === role 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        {getRoleIcon(role)}
                        <span className="ml-2 font-medium">{role}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {role === ADMIN_ROLES.SUPER_ADMIN && 'Full access to all features including user management'}
                        {role === ADMIN_ROLES.ADMIN && 'Access to countries, plans, and configuration management'}
                        {role === ADMIN_ROLES.MODERATOR && 'Access to countries and plans management'}
                        {role === ADMIN_ROLES.USER && 'Regular user with no admin privileges'}
                      </p>
                    </button>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserManagement;
