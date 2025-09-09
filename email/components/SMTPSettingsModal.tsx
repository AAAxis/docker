'use client';

import { useState, useEffect } from 'react';
import { X, Save, TestTube, Mail, Server, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

interface SMTPSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

interface SMTPSettingsModalProps {
  onClose: () => void;
}

export default function SMTPSettingsModal({ onClose }: SMTPSettingsModalProps) {
  const [settings, setSettings] = useState<SMTPSettings>({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('smtp-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to load SMTP settings:', error);
      }
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!settings.host.trim()) {
      newErrors.host = 'SMTP host is required';
    }
    
    if (!settings.port || settings.port < 1 || settings.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }
    
    if (!settings.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!settings.password.trim()) {
      newErrors.password = 'Password is required';
    }
    
    if (!settings.fromEmail.trim()) {
      newErrors.fromEmail = 'From email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.fromEmail)) {
      newErrors.fromEmail = 'Invalid email format';
    }
    
    if (!settings.fromName.trim()) {
      newErrors.fromName = 'From name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem('smtp-settings', JSON.stringify(settings));
      
      // Here you would typically also save to your backend/database
      // await api.saveSMTPSettings(settings);
      
      setTestResult({ success: true, message: 'SMTP settings saved successfully!' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setTestResult(null);
    
    try {
      // Simulate SMTP test - in real implementation, you'd call your backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock test result - replace with actual SMTP test
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      setTestResult({
        success,
        message: success 
          ? 'SMTP connection test successful!' 
          : 'SMTP connection test failed. Please check your settings.'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'SMTP connection test failed. Please check your settings.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SMTPSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">SMTP Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Server Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Server className="h-5 w-5 mr-2" />
              Server Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Host *
                </label>
                <input
                  type="text"
                  value={settings.host}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.host ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.host && (
                  <p className="text-red-500 text-xs mt-1">{errors.host}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port *
                </label>
                <input
                  type="number"
                  value={settings.port}
                  onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 587)}
                  placeholder="587"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.port ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.port && (
                  <p className="text-red-500 text-xs mt-1">{errors.port}</p>
                )}
              </div>
            </div>
            
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.secure}
                  onChange={(e) => handleInputChange('secure', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Use SSL/TLS (secure connection)</span>
              </label>
            </div>
          </div>

          {/* Authentication */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Authentication
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={settings.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.username && (
                  <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={settings.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Your app password"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>
            </div>
          </div>

          {/* From Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              From Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Email *
                </label>
                <input
                  type="email"
                  value={settings.fromEmail}
                  onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                  placeholder="noreply@yourcompany.com"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fromEmail ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.fromEmail && (
                  <p className="text-red-500 text-xs mt-1">{errors.fromEmail}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Name *
                </label>
                <input
                  type="text"
                  value={settings.fromName}
                  onChange={(e) => handleInputChange('fromName', e.target.value)}
                  placeholder="Your Company Name"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fromName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.fromName && (
                  <p className="text-red-500 text-xs mt-1">{errors.fromName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-md flex items-center space-x-2 ${
              testResult.success 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {testResult.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Settings are saved locally in your browser
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleTest}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
            >
              <TestTube className="h-4 w-4" />
              <span>Test Connection</span>
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
