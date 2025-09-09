'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { Plus, Folder, LogOut, User, Network, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProjectList from './ProjectList';
import ProjectDetail from './ProjectDetail';
import CreateProjectModal from './CreateProjectModal';
import UpdateProfileModal from './UpdateProfileModal';
import SMTPSettingsModal from './SMTPSettingsModal';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { currentProject } = useProject();
  const router = useRouter();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showUpdateProfile, setShowUpdateProfile] = useState(false);
  const [showSMTPSettings, setShowSMTPSettings] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">
                Email Management
              </h1>
              
              {/* Navigation Tabs */}
              <nav className="flex space-x-4">
                <button
                  onClick={() => router.push('/')}
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-500 hover:text-gray-700"
                >
                  <Folder className="h-4 w-4 inline mr-2" />
                  Projects
                </button>
                <button
                  onClick={() => {
                    console.log('Navigating to proxy dashboard...');
                    router.push('/proxy');
                  }}
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-500 hover:text-gray-700"
                >
                  <Network className="h-4 w-4 inline mr-2" />
                  Proxy Dashboard
                </button>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateProject(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </button>
              
              {/* SMTP Settings Button */}
              <button
                onClick={() => setShowSMTPSettings(true)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="SMTP Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              
              {/* User Profile Area - Clickable for editing */}
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <button
                  onClick={() => setShowUpdateProfile(true)}
                  className="text-sm text-gray-700 hover:text-gray-900 cursor-pointer"
                  title="Click to edit profile"
                >
                  {user?.displayName || user?.email}
                </button>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentProject ? (
          <ProjectDetail />
        ) : (
          <ProjectList />
        )}
      </main>

      {/* Modals */}
      {showCreateProject && (
        <CreateProjectModal onClose={() => setShowCreateProject(false)} />
      )}
      
      {showUpdateProfile && (
        <UpdateProfileModal onClose={() => setShowUpdateProfile(false)} />
      )}
      
      {showSMTPSettings && (
        <SMTPSettingsModal onClose={() => setShowSMTPSettings(false)} />
      )}
    </div>
  );
}
