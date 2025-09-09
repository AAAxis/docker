'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateProfile } from 'firebase/auth';

interface UserSettingsProps {
  onClose: () => void;
}

interface UserFormData {
  displayName: string;
}

export default function UserSettings({ onClose }: UserSettingsProps) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<UserFormData>({
    defaultValues: {
      displayName: user?.displayName || ''
    }
  });

  const handleUpdateProfile = async (data: UserFormData) => {
    if (!user) return;
    
    setUpdating(true);
    try {
      await updateProfile(user, {
        displayName: data.displayName
      });
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      toast.success('Logged out successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">User Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(handleUpdateProfile)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
          </div>
          
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Display Name
            </label>
            <input
              {...register('displayName', { required: 'Display name is required' })}
              type="text"
              className="input-field mt-1"
              placeholder="Enter your display name"
            />
            {errors.displayName && (
              <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={updating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center space-x-2"
              disabled={updating}
            >
              <Save className="h-4 w-4" />
              <span>{updating ? 'Updating...' : 'Update Profile'}</span>
            </button>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="w-full btn-danger"
            >
              {loading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
