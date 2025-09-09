'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useProject } from '@/contexts/ProjectContext';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateTemplateFormData {
  name: string;
  type: 'email' | 'notification' | 'form';
  subject?: string;
  content: string;
  variables: string;
}

interface CreateTemplateModalProps {
  onClose: () => void;
}

export default function CreateTemplateModal({ onClose }: CreateTemplateModalProps) {
  const [loading, setLoading] = useState(false);
  const { currentProject, createTemplate } = useProject();
  
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<CreateTemplateFormData>({
    defaultValues: {
      type: 'email',
      variables: ''
    }
  });

  const watchedType = watch('type');

  const onSubmit = async (data: CreateTemplateFormData) => {
    if (!currentProject) {
      toast.error('No project selected');
      return;
    }

    setLoading(true);
    try {
      const variables = data.variables ? data.variables.split(',').map(v => v.trim()).filter(v => v) : [];
      
      await createTemplate({
        projectId: currentProject.id,
        name: data.name,
        type: data.type,
        subject: data.subject,
        content: data.content,
        variables,
      });
      
      toast.success('Template created successfully!');
      reset();
      onClose();
    } catch (error) {
      toast.error('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create New Template</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Template Name
              </label>
              <input
                {...register('name', { required: 'Template name is required' })}
                type="text"
                className="input-field mt-1"
                placeholder="Enter template name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Template Type
              </label>
              <select
                {...register('type', { required: 'Template type is required' })}
                className="input-field mt-1"
              >
                <option value="email">Email Template</option>
                <option value="notification">Notification Template</option>
                <option value="form">Form Template</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>
          </div>
          
          {watchedType === 'email' && (
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Email Subject
              </label>
              <input
                {...register('subject')}
                type="text"
                className="input-field mt-1"
                placeholder="Enter email subject"
              />
            </div>
          )}
          
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Template Content
            </label>
            <textarea
              {...register('content', { required: 'Content is required' })}
              rows={8}
              className="input-field mt-1"
              placeholder="Enter template content. Use {variable_name} for dynamic content."
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="variables" className="block text-sm font-medium text-gray-700">
              Variables (comma-separated)
            </label>
            <input
              {...register('variables')}
              type="text"
              className="input-field mt-1"
              placeholder="name, email, message (comma-separated)"
            />
            <p className="mt-1 text-sm text-gray-500">
              List the variables used in your template content
            </p>
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
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
