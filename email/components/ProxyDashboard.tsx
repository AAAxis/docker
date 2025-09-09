'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ProxyService, Device, Analytics } from '@/lib/proxyService';
import { 
  Globe, 
  Smartphone, 
  Monitor, 
  Shield, 
  Users, 
  Activity,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

interface StatusResponse {
  success: boolean;
  status: {
    total_devices: number;
    online_devices: number;
    current_exit_id: string | null;
    analytics: Analytics;
  };
  devices: Device[];
}

export default function ProxyDashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ProxyService.getStatus();
      
      if (data.success) {
        setStatus(data);
        setLastUpdated(new Date());
      } else {
        setError(data.error || 'Failed to fetch status from Firebase');
      }
    } catch (err) {
      setError('Failed to connect to Firebase');
      console.error('Error fetching status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'United States': '🇺🇸',
      'Canada': '🇨🇦',
      'United Kingdom': '🇬🇧',
      'Germany': '🇩🇪',
      'France': '🇫🇷',
      'Japan': '🇯🇵',
      'China': '🇨🇳',
      'Australia': '🇦🇺',
      'Brazil': '🇧🇷',
      'India': '🇮🇳',
      'Russia': '🇷🇺',
      'unknown': '🌍'
    };
    return flags[country] || '🌍';
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'desktop': return <Monitor className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getProxyIcon = (proxyType: string) => {
    switch (proxyType) {
      case 'socks5': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'socks': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'ipsec': return <Wifi className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (online: boolean) => {
    return online ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <WifiOff className="h-4 w-4 text-red-500" />;
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-medium text-red-800">Connection Error</h3>
        </div>
        <p className="mt-2 text-red-600">{error}</p>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const { status: statusData, devices } = status;
  const { analytics } = statusData;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proxy Dashboard</h1>
          <p className="text-gray-600">Real-time analytics and device monitoring</p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Devices */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.total_devices}</p>
            </div>
          </div>
        </div>

        {/* Online Devices */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Online Devices</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.online_devices}</p>
            </div>
          </div>
        </div>

        {/* Mobile Devices */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Smartphone className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Mobile Devices</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.device_breakdown.mobile}</p>
            </div>
          </div>
        </div>

        {/* Desktop Devices */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Monitor className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Desktop Devices</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.device_breakdown.desktop}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Proxy Type Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Proxy Type Distribution</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">SOCKS5</p>
                <p className="text-xl font-bold text-gray-900">{(analytics.proxy_breakdown.socks5 || 0) + (analytics.proxy_breakdown.socks || 0)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Wifi className="h-6 w-6 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">IPSec VPN</p>
                <p className="text-xl font-bold text-gray-900">
                  {devices.filter(d => d.proxy_type === 'ipsec').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Country Distribution */}
      {Object.keys(analytics.traffic_stats.countries).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Country Distribution</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {Object.entries(analytics.traffic_stats.countries)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([country, count]) => (
                  <div key={country} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getCountryFlag(country)}</span>
                      <span className="font-medium text-gray-900">{country}</span>
                    </div>
                    <span className="text-sm text-gray-500">{count} devices</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Device List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Connected Devices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proxy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device.client_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        {getDeviceIcon(device.device_type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {device.platform || 'Unknown Platform'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {device.client_id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {device.device_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getProxyIcon(device.proxy_type)}
                      <span className="text-sm text-gray-900">{device.proxy_type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getCountryFlag(device.country)}</span>
                      <span className="text-sm text-gray-900">{device.country}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">
                      {device.original_ip || device.vpn_ip || 'Unknown'}
                    </div>
                    {device.original_ip && device.vpn_ip && device.original_ip !== device.vpn_ip && (
                      <div className="text-xs text-gray-500">
                        VPN: {device.vpn_ip}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(device.online)}
                      <span className="ml-2 text-sm text-gray-900">
                        {device.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}