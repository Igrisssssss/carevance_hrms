import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Organization } from '@/types';
import { authApi } from '@/services/api';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, options?: { role?: 'admin' | 'employee'; organizationName?: string; organizationId?: number }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  updateOrganization: (organization: Organization | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo mode - set to true to use mock data without backend
const DEMO_MODE = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedOrg = localStorage.getItem('organization');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      if (storedOrg) {
        setOrganization(JSON.parse(storedOrg));
      }
      if (!DEMO_MODE) {
        fetchUser();
      }
    }
    setIsLoading(false);
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authApi.me();
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    }
  };

  const login = async (email: string, password: string) => {
    if (DEMO_MODE) {
      const demoUser: User = {
        id: 1,
        name: email.split('@')[0],
        email: email,
        role: 'admin',
        organization_id: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const demoOrg: Organization = {
        id: 1,
        name: 'Demo Company',
        slug: 'demo-company',
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setUser(demoUser);
      setOrganization(demoOrg);
      setToken('demo-token-12345');
      
      localStorage.setItem('token', 'demo-token-12345');
      localStorage.setItem('user', JSON.stringify(demoUser));
      localStorage.setItem('organization', JSON.stringify(demoOrg));
      return;
    }

    const response = await authApi.login({ email, password });
    const { user: userData, token: authToken, organization: org } = response.data;
    
    setUser(userData);
    setToken(authToken);
    if (org) {
      setOrganization(org);
      localStorage.setItem('organization', JSON.stringify(org));
    }
    
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const register = async (name: string, email: string, password: string, options?: { role?: 'admin' | 'employee'; organizationName?: string; organizationId?: number }) => {
    if (DEMO_MODE) {
      const demoUser: User = {
        id: 1,
        name: name,
        email: email,
        role: 'admin',
        organization_id: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const demoOrg: Organization = {
        id: 1,
        name: options?.organizationName || 'My Company',
        slug: (options?.organizationName || 'my-company').toLowerCase().replace(/\s+/g, '-'),
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setUser(demoUser);
      setOrganization(demoOrg);
      setToken('demo-token-12345');
      
      localStorage.setItem('token', 'demo-token-12345');
      localStorage.setItem('user', JSON.stringify(demoUser));
      localStorage.setItem('organization', JSON.stringify(demoOrg));
      return;
    }

    const response = await authApi.register({
      name,
      email,
      password,
      password_confirmation: password,
      role: options?.role || 'admin',
      organization_name: options?.organizationName,
      organization_id: options?.organizationId,
    });
    
    const { user: userData, token: authToken, organization: org } = response.data;
    
    setUser(userData);
    setToken(authToken);
    if (org) {
      setOrganization(org);
      localStorage.setItem('organization', JSON.stringify(org));
    }
    
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    if (!DEMO_MODE) {
      try {
        await authApi.logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    setUser(null);
    setToken(null);
    setOrganization(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const updateOrganization = (updatedOrganization: Organization | null) => {
    setOrganization(updatedOrganization);
    if (updatedOrganization) {
      localStorage.setItem('organization', JSON.stringify(updatedOrganization));
    } else {
      localStorage.removeItem('organization');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        updateUser,
        updateOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
