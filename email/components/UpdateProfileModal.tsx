'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateProfile } from 'firebase/auth';

interface UpdateProfileFormData {
  displayName: string;
}

interface UpdateProfileModalProps {
  onClose: () => void;
}

export default function UpdateProfileModal({ onClose }: UpdateProfileModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<UpdateProfileFormData>({
    defaultValues: {
      displayName: user?.displayName || ''
    }
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || ''
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UpdateProfileFormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      await updateProfile(user, {
        displayName: data.displayName
      });
      toast.success('Profile updated successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Update Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border">
              {user?.email}
            </p>
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
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
              autoFocus
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
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center space-x-2"
              disabled={loading}
            >
              <Check className="h-4 w-4" />
              <span>{loading ? 'Updating...' : 'Update Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
