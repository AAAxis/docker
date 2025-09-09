'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useProject } from '@/contexts/ProjectContext';
import toast from 'react-hot-toast';

interface ProjectSettingsFormData {
  name: string;
  description: string;
}

export default function ProjectSettings() {
  const { currentProject, updateProject } = useProject();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProjectSettingsFormData>({
    defaultValues: {
      name: currentProject?.name || '',
      description: currentProject?.description || '',
    }
  });

  const onSubmit = async (data: ProjectSettingsFormData) => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      await updateProject(currentProject.id, data);
      toast.success('Project updated successfully!');
    } catch (error) {
      toast.error('Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  if (!currentProject) {
    return null;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Project Settings</h3>
        <p className="text-gray-600">Update your project information</p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Project Name
          </label>
          <input
            {...register('name', { required: 'Project name is required' })}
            type="text"
            className="input-field mt-1"
            placeholder="Enter project name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            {...register('description', { required: 'Description is required' })}
            rows={4}
            className="input-field mt-1"
            placeholder="Enter project description"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
