'use client';

import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { ArrowLeft, Plus, Mail, Bell, FileText, Settings } from 'lucide-react';
import TemplateList from './TemplateList';
import CreateTemplateModal from './CreateTemplateModal';
import ProjectSettings from './ProjectSettings';

export default function ProjectDetail() {
  const { currentProject, setCurrentProject } = useProject();
  const [activeTab, setActiveTab] = useState<'templates' | 'settings'>('templates');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);

  if (!currentProject) {
    return null;
  }

  const tabs = [
    { id: 'templates', label: 'Templates', icon: Mail },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => setCurrentProject(null)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{currentProject.name}</h2>
            <p className="text-gray-600">{currentProject.description}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'templates' | 'settings')}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'templates' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
              <p className="text-gray-600">Create and manage your email templates</p>
            </div>
            <button
              onClick={() => setShowCreateTemplate(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Template</span>
            </button>
          </div>
          <TemplateList />
        </div>
      )}

      {activeTab === 'settings' && (
        <ProjectSettings />
      )}

      {/* Modals */}
      {showCreateTemplate && (
        <CreateTemplateModal onClose={() => setShowCreateTemplate(false)} />
      )}
    </div>
  );
}
