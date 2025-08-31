import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user'
};

export const ADMIN_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: [
    'manage_users',
    'manage_admins', 
    'manage_countries',
    'manage_plans',
    'manage_config',
    'view_analytics',
    'delete_data'
  ],
  [ADMIN_ROLES.ADMIN]: [
    'manage_countries',
    'manage_plans', 
    'manage_config',
    'view_analytics'
  ],
  [ADMIN_ROLES.MODERATOR]: [
    'manage_countries',
    'manage_plans',
    'view_analytics'
  ],
  [ADMIN_ROLES.USER]: []
};

class AdminService {
  // Check if user has admin role
  async isAdmin(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      return userData.role && userData.role !== ADMIN_ROLES.USER;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Get user role
  async getUserRole(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return ADMIN_ROLES.USER;
      
      const userData = userDoc.data();
      return userData.role || ADMIN_ROLES.USER;
    } catch (error) {
      console.error('Error getting user role:', error);
      return ADMIN_ROLES.USER;
    }
  }

  // Check if user has specific permission
  async hasPermission(userId, permission) {
    try {
      const role = await this.getUserRole(userId);
      const permissions = ADMIN_PERMISSIONS[role] || [];
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // Set user role (only super admin can do this)
  async setUserRole(targetUserId, newRole, adminUserId) {
    try {
      // Check if admin has permission
      const hasPermission = await this.hasPermission(adminUserId, 'manage_admins');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to manage admin roles');
      }

      // Update user role
      await updateDoc(doc(db, 'users', targetUserId), {
        role: newRole,
        roleUpdatedAt: serverTimestamp(),
        roleUpdatedBy: adminUserId
      });

      // Log admin action
      await this.logAdminAction(adminUserId, 'role_change', {
        targetUserId,
        newRole,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error setting user role:', error);
      throw error;
    }
  }

  // Get all admin users
  async getAdminUsers() {
    try {
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', 'in', [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN, ADMIN_ROLES.MODERATOR])
      );
      
      const snapshot = await getDocs(adminsQuery);
      const admins = [];
      
      snapshot.forEach(doc => {
        admins.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return admins;
    } catch (error) {
      console.error('Error getting admin users:', error);
      return [];
    }
  }

  // Get all users (for admin management)
  async getAllUsers() {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const users = [];
      
      snapshot.forEach(doc => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Create initial super admin
  async createSuperAdmin(userId, email) {
    try {
      await setDoc(doc(db, 'users', userId), {
        email,
        role: ADMIN_ROLES.SUPER_ADMIN,
        createdAt: serverTimestamp(),
        isInitialAdmin: true
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error creating super admin:', error);
      throw error;
    }
  }

  // Log admin actions for audit trail
  async logAdminAction(adminId, action, details = {}) {
    try {
      await setDoc(doc(collection(db, 'admin_logs')), {
        adminId,
        action,
        details,
        timestamp: serverTimestamp(),
        ip: 'unknown', // You can add IP tracking if needed
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  // Get admin action logs
  async getAdminLogs(limit = 50) {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'admin_logs'))
      );
      
      const logs = [];
      snapshot.forEach(doc => {
        logs.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by timestamp (newest first)
      return logs.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return b.timestamp.toDate() - a.timestamp.toDate();
      }).slice(0, limit);
    } catch (error) {
      console.error('Error getting admin logs:', error);
      return [];
    }
  }

  // Remove admin role
  async removeAdminRole(targetUserId, adminUserId) {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission(adminUserId, 'manage_admins');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to manage admin roles');
      }

      // Don't allow removing super admin role
      const targetRole = await this.getUserRole(targetUserId);
      if (targetRole === ADMIN_ROLES.SUPER_ADMIN) {
        throw new Error('Cannot remove super admin role');
      }

      // Update to regular user
      await updateDoc(doc(db, 'users', targetUserId), {
        role: ADMIN_ROLES.USER,
        roleUpdatedAt: serverTimestamp(),
        roleUpdatedBy: adminUserId
      });

      // Log action
      await this.logAdminAction(adminUserId, 'role_removed', {
        targetUserId,
        previousRole: targetRole,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing admin role:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
export default adminService;
