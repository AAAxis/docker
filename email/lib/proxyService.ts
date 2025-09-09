import { db } from './firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

export interface Device {
  client_id: string;
  device_type: 'mobile' | 'desktop' | 'unknown';
  proxy_type: 'socks5' | 'socks' | 'ipsec' | 'unknown';
  country: string;
  online: boolean;
  last_seen: string;
  platform: string;
  user_agent: string;
  original_ip?: string;
  vpn_ip?: string;
  registration_time?: number;
  is_chrome_extension?: boolean;
  is_ios_app?: boolean;
  capabilities?: string[];
}

export interface Analytics {
  traffic_stats: {
    socks5_connections: number;
    socks_connections: number;
    ipsec_connections: number;
    mobile_devices: number;
    desktop_devices: number;
    countries: Record<string, number>;
    total_requests: number;
  };
  total_devices: number;
  online_devices: number;
  device_breakdown: {
    mobile: number;
    desktop: number;
  };
  proxy_breakdown: {
    socks5: number;
    socks: number;
    ipsec: number;
  };
}

export class ProxyService {
  static async getDevices(): Promise<Device[]> {
    try {
      const devicesRef = collection(db, 'proxy_clients');
      const snapshot = await getDocs(devicesRef);
      
      const devices: Device[] = [];
      const now = new Date();
      const OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Determine if device is online based on both online field and last_seen timestamp
        let isOnline = data.online || false;
        let lastSeenDate: Date | null = null;
        
        if (data.last_seen) {
          // Handle both timestamp formats (seconds and milliseconds)
          const timestamp = typeof data.last_seen === 'number' 
            ? (data.last_seen > 1000000000000 ? data.last_seen : data.last_seen * 1000)
            : data.last_seen.toDate ? data.last_seen.toDate().getTime() : new Date(data.last_seen).getTime();
          
          lastSeenDate = new Date(timestamp);
          
          // If last_seen is older than 5 minutes, consider offline
          if (now.getTime() - lastSeenDate.getTime() > OFFLINE_THRESHOLD) {
            isOnline = false;
          }
        } else {
          // If no last_seen timestamp, consider offline
          isOnline = false;
        }
        
        devices.push({
          client_id: doc.id,
          device_type: data.device_type || 'unknown',
          proxy_type: data.proxy_type || 'unknown',
          country: data.country || 'unknown',
          online: isOnline,
          last_seen: lastSeenDate ? lastSeenDate.toISOString() : '',
          platform: data.platform || 'Unknown',
          user_agent: data.user_agent || '',
          original_ip: data.original_ip,
          vpn_ip: data.vpn_ip,
          registration_time: data.registration_time,
          is_chrome_extension: data.is_chrome_extension || false,
          is_ios_app: data.is_ios_app || false,
          capabilities: data.capabilities || []
        });
      });
      
      return devices;
    } catch (error) {
      console.error('Error fetching devices from Firebase:', error);
      return [];
    }
  }

  static async getAnalytics(): Promise<Analytics> {
    try {
      const devices = await this.getDevices();
      
      // Calculate analytics from devices
      const deviceTypes = { mobile: 0, desktop: 0 };
      const proxyTypes = { socks5: 0, socks: 0, ipsec: 0 };
      const countries: Record<string, number> = {};
      let onlineDevices = 0;
      
      devices.forEach(device => {
        // Count device types
        if (device.device_type === 'mobile') {
          deviceTypes.mobile++;
        } else if (device.device_type === 'desktop') {
          deviceTypes.desktop++;
        }
        
        // Count proxy types
        if (device.proxy_type === 'socks5') {
          proxyTypes.socks5++;
        } else if (device.proxy_type === 'socks') {
          proxyTypes.socks++;
        } else if (device.proxy_type === 'ipsec') {
          proxyTypes.ipsec++;
        }
        
        // Count countries
        if (device.country && device.country !== 'unknown') {
          countries[device.country] = (countries[device.country] || 0) + 1;
        }
        
        // Count online devices
        if (device.online) {
          onlineDevices++;
        }
      });
      
      return {
        traffic_stats: {
          socks5_connections: proxyTypes.socks5,
          socks_connections: proxyTypes.socks,
          ipsec_connections: proxyTypes.ipsec,
          mobile_devices: deviceTypes.mobile,
          desktop_devices: deviceTypes.desktop,
          countries,
          total_requests: devices.length
        },
        total_devices: devices.length,
        online_devices: onlineDevices,
        device_breakdown: deviceTypes,
        proxy_breakdown: proxyTypes
      };
    } catch (error) {
      console.error('Error calculating analytics:', error);
      return {
        traffic_stats: {
          socks5_connections: 0,
          socks_connections: 0,
          ipsec_connections: 0,
          mobile_devices: 0,
          desktop_devices: 0,
          countries: {},
          total_requests: 0
        },
        total_devices: 0,
        online_devices: 0,
        device_breakdown: { mobile: 0, desktop: 0 },
        proxy_breakdown: { socks5: 0, socks: 0, ipsec: 0 }
      };
    }
  }

  static async getStatus() {
    try {
      const devices = await this.getDevices();
      const analytics = await this.getAnalytics();
      
      return {
        success: true,
        status: {
          total_devices: devices.length,
          online_devices: analytics.online_devices,
          current_exit_id: null,
          analytics
        },
        devices
      };
    } catch (error) {
      console.error('Error getting status:', error);
      return {
        success: false,
        error: 'Failed to fetch status from Firebase'
      };
    }
  }
}