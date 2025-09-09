'use client';

import { useProject } from '@/contexts/ProjectContext';
import { Mail, Bell, FileText, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function TemplateList() {
  const { templates, loading, currentProject, deleteTemplate } = useProject();
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'email':
        return Mail;
      case 'notification':
        return Bell;
      case 'form':
        return FileText;
      default:
        return Mail;
    }
  };

  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'notification':
        return 'bg-green-100 text-green-800';
      case 'form':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (window.confirm(`Are you sure you want to delete "${templateName}"? This action cannot be undone.`)) {
      try {
        await deleteTemplate(templateId);
        toast.success('Template deleted successfully');
      } catch (error) {
        toast.error('Failed to delete template');
      }
    }
    setShowMenu(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first template.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => {
        const Icon = getTemplateIcon(template.type);
        return (
          <div key={template.id} className="card hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Icon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500">{template.subject || 'No subject'}</p>
                </div>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowMenu(showMenu === template.id ? null : template.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                
                {showMenu === template.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          // TODO: Implement template preview
                          setShowMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Eye className="h-4 w-4 mr-3" />
                        Preview
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Implement template edit
                          setShowMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4 mr-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <Trash2 className="h-4 w-4 mr-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTemplateTypeColor(template.type)}`}>
                {template.type}
              </span>
              <span className="text-xs text-gray-500">
                {template.variables.length} variables
              </span>
            </div>
            
            <div className="mt-4">
              <div className="text-sm text-gray-600 line-clamp-2">
                {template.content.substring(0, 100)}...
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
