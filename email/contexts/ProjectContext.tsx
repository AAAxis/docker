'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

interface Project {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive';
}

interface Template {
  id: string;
  projectId: string;
  name: string;
  type: 'email' | 'notification' | 'form';
  subject?: string;
  content: string;
  variables: string[];
  triggerRoute?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  templates: Template[];
  loading: boolean;
  createProject: (name: string, description: string) => Promise<string>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  createTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTemplate: (id: string, data: Partial<Template>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  loadTemplates: (projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType>({} as ProjectContextType);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  // Load projects when user changes
  useEffect(() => {
    if (user) {
      loadProjects();
    } else {
      setProjects([]);
      setCurrentProject(null);
      setTemplates([]);
    }
  }, [user]);

  // Load templates when current project changes
  useEffect(() => {
    if (currentProject) {
      loadTemplates(currentProject.id);
    } else {
      setTemplates([]);
    }
  }, [currentProject]);

  const loadProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(projectsQuery);
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Project[];
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, description: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const projectData = {
        name,
        description,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active' as const,
      };
      
      console.log('Adding project to Firestore:', projectData);
      const docRef = await addDoc(collection(db, 'projects'), projectData);
      console.log('Project created with ID:', docRef.id);
      
      // Create default templates
      await createDefaultTemplates(docRef.id);
      
      await loadProjects(); // Reload projects
      return docRef.id;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  const createDefaultTemplates = async (projectId: string) => {
    const defaultTemplates = [
      {
        projectId,
        name: 'OTP Verification',
        type: 'email' as const,
        subject: 'Your OTP Code - {{company_name}}',
        content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-code { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .otp-number { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 OTP Verification</h1>
        <p>Secure your account with this one-time password</p>
    </div>
    <div class="content">
        <h2>Hello {{user_name}},</h2>
        <p>You requested a one-time password (OTP) for your {{company_name}} account. Use the code below to complete your verification:</p>
        
        <div class="otp-code">
            <div class="otp-number">{{otp_code}}</div>
            <p><strong>This code expires in 10 minutes</strong></p>
        </div>
        
        <p><strong>Important Security Notes:</strong></p>
        <ul>
            <li>Never share this code with anyone</li>
            <li>Our team will never ask for your OTP code</li>
            <li>If you didn't request this code, please ignore this email</li>
        </ul>
        
        <p>If you have any questions, please contact our support team.</p>
        
        <p>Best regards,<br>{{company_name}} Team</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>&copy; {{current_year}} {{company_name}}. All rights reserved.</p>
    </div>
</body>
</html>`,
        variables: ['user_name', 'otp_code', 'company_name', 'current_year'],
        triggerRoute: '/api/email/otp',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId,
        name: 'Registration Notice',
        type: 'email' as const,
        subject: 'Welcome to {{company_name}} - Account Created Successfully',
        content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{company_name}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .welcome-box { background: #fff; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .features { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .feature { background: #fff; padding: 15px; border-radius: 8px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to {{company_name}}!</h1>
        <p>Your account has been successfully created</p>
    </div>
    <div class="content">
        <div class="welcome-box">
            <h2>Hello {{user_name}},</h2>
            <p>Congratulations! Your account has been successfully created with the email <strong>{{user_email}}</strong>.</p>
        </div>
        
        <h3>What's Next?</h3>
        <div class="features">
            <div class="feature">
                <h4>📧 Verify Email</h4>
                <p>Check your inbox for a verification email to activate your account</p>
            </div>
            <div class="feature">
                <h4>🔐 Secure Login</h4>
                <p>Use your credentials to access your new account</p>
            </div>
        </div>
        
        <p><strong>Account Details:</strong></p>
        <ul>
            <li><strong>Email:</strong> {{user_email}}</li>
            <li><strong>Registration Date:</strong> {{registration_date}}</li>
            <li><strong>Account Status:</strong> Active</li>
        </ul>
        
        <p>If you have any questions or need assistance, our support team is here to help!</p>
        
        <p>Welcome aboard!<br>{{company_name}} Team</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>&copy; {{current_year}} {{company_name}}. All rights reserved.</p>
    </div>
</body>
</html>`,
        variables: ['user_name', 'user_email', 'company_name', 'registration_date', 'current_year'],
        triggerRoute: '/api/email/registration',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId,
        name: 'Change Password Template',
        type: 'email' as const,
        subject: 'Password Changed Successfully - {{company_name}}',
        content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF6B6B 0%, #ee5a52 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .security-tips { background: #fff; border-left: 4px solid #FF6B6B; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; background: #FF6B6B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 Password Changed</h1>
        <p>Your account security has been updated</p>
    </div>
    <div class="content">
        <h2>Hello {{user_name}},</h2>
        
        <div class="alert-box">
            <h3>⚠️ Important Security Notice</h3>
            <p>Your password was successfully changed on <strong>{{change_date}}</strong> at <strong>{{change_time}}</strong>.</p>
        </div>
        
        <p><strong>Account Details:</strong></p>
        <ul>
            <li><strong>Email:</strong> {{user_email}}</li>
            <li><strong>Change Date:</strong> {{change_date}}</li>
            <li><strong>Change Time:</strong> {{change_time}}</li>
            <li><strong>IP Address:</strong> {{ip_address}}</li>
        </ul>
        
        <div class="security-tips">
            <h3>🛡️ Security Tips</h3>
            <ul>
                <li>Use a strong, unique password</li>
                <li>Never share your password with anyone</li>
                <li>Enable two-factor authentication if available</li>
                <li>Log out from all devices if you suspect unauthorized access</li>
            </ul>
        </div>
        
        <p><strong>If you didn't make this change:</strong></p>
        <p>Please contact our support team immediately and change your password again. Your account security is our top priority.</p>
        
        <p>Stay secure!<br>{{company_name}} Security Team</p>
    </div>
    <div class="footer">
        <p>This is an automated security notification. Please do not reply to this email.</p>
        <p>&copy; {{current_year}} {{company_name}}. All rights reserved.</p>
    </div>
</body>
</html>`,
        variables: ['user_name', 'user_email', 'company_name', 'change_date', 'change_time', 'ip_address', 'current_year'],
        triggerRoute: '/api/email/password-change',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    try {
      for (const template of defaultTemplates) {
        await addDoc(collection(db, 'templates'), template);
        console.log(`Created default template: ${template.name}`);
      }
    } catch (error) {
      console.error('Error creating default templates:', error);
      // Don't throw error here to avoid breaking project creation
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    const projectRef = doc(db, 'projects', id);
    await updateDoc(projectRef, {
      ...data,
      updatedAt: new Date(),
    });
    await loadProjects(); // Reload projects
  };

  const deleteProject = async (id: string) => {
    await deleteDoc(doc(db, 'projects', id));
    await loadProjects(); // Reload projects
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  };

  const loadTemplates = async (projectId: string) => {
    setLoading(true);
    try {
      const templatesQuery = query(
        collection(db, 'templates'),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(templatesQuery);
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Template[];
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const templateData = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await addDoc(collection(db, 'templates'), templateData);
    if (currentProject) {
      await loadTemplates(currentProject.id); // Reload templates
    }
    return docRef.id;
  };

  const updateTemplate = async (id: string, data: Partial<Template>) => {
    const templateRef = doc(db, 'templates', id);
    await updateDoc(templateRef, {
      ...data,
      updatedAt: new Date(),
    });
    if (currentProject) {
      await loadTemplates(currentProject.id); // Reload templates
    }
  };

  const deleteTemplate = async (id: string) => {
    await deleteDoc(doc(db, 'templates', id));
    if (currentProject) {
      await loadTemplates(currentProject.id); // Reload templates
    }
  };

  const value = {
    projects,
    currentProject,
    templates,
    loading,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    loadTemplates,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};
