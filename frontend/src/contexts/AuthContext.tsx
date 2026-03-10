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
  register: (name: string, email: string, password: string, options?: { role?: 'admin' | 'employee'; organizationName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  updateOrganization: (organization: Organization | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo mode - set to true to use mock data without backend
const DEMO_MODE = false;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const cleanDesktopTokenFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.has('desktop_token')) return;
      params.delete('desktop_token');
      const cleanSearch = params.toString();
      const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', cleanUrl);
    };

    const bootstrapAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const desktopToken = params.get('desktop_token');

      if (desktopToken && !DEMO_MODE) {
        try {
          const response = await fetch(`${API_URL}/auth/handoff`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${desktopToken}`,
            },
          });

          if (response.ok) {
            const payload = await response.json();
            const nextToken = payload?.token;
            const nextUser = payload?.user;
            const nextOrg = payload?.organization;

            if (nextToken && nextUser) {
              sessionStorage.setItem('token', nextToken);
              sessionStorage.setItem('user', JSON.stringify(nextUser));
              if (nextOrg) {
                sessionStorage.setItem('organization', JSON.stringify(nextOrg));
              } else {
                sessionStorage.removeItem('organization');
              }
            }
          }
        } catch (error) {
          console.error('Desktop handoff failed:', error);
        } finally {
          cleanDesktopTokenFromUrl();
        }
      } else if (desktopToken) {
        cleanDesktopTokenFromUrl();
      }

      const storedToken = sessionStorage.getItem('token');
      const storedUser = sessionStorage.getItem('user');
      const storedOrg = sessionStorage.getItem('organization');

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            sessionStorage.removeItem('user');
          }
        }
        if (storedOrg) {
          try {
            setOrganization(JSON.parse(storedOrg));
          } catch {
            sessionStorage.removeItem('organization');
          }
        }
        if (!DEMO_MODE) {
          await fetchUser();
        }
      }

      if (active) {
        setIsLoading(false);
      }
    };

    bootstrapAuth();

    return () => {
      active = false;
    };
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authApi.me();
      setUser(response.data);
      sessionStorage.setItem('user', JSON.stringify(response.data));
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
      
      sessionStorage.setItem('token', 'demo-token-12345');
      sessionStorage.setItem('user', JSON.stringify(demoUser));
      sessionStorage.setItem('organization', JSON.stringify(demoOrg));
      return;
    }

    const response = await authApi.login({ email, password });
    const { user: userData, token: authToken, organization: org } = response.data;
    
    setUser(userData);
    setToken(authToken);
    if (org) {
      setOrganization(org);
      sessionStorage.setItem('organization', JSON.stringify(org));
    }
    
    sessionStorage.setItem('token', authToken);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const register = async (name: string, email: string, password: string, options?: { role?: 'admin' | 'employee'; organizationName?: string }) => {
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
      
      sessionStorage.setItem('token', 'demo-token-12345');
      sessionStorage.setItem('user', JSON.stringify(demoUser));
      sessionStorage.setItem('organization', JSON.stringify(demoOrg));
      return;
    }

    const response = await authApi.register({
      name,
      email,
      password,
      password_confirmation: password,
      role: options?.role || 'admin',
      organization_name: options?.organizationName,
    });
    
    const { user: userData, token: authToken, organization: org } = response.data;
    
    setUser(userData);
    setToken(authToken);
    if (org) {
      setOrganization(org);
      sessionStorage.setItem('organization', JSON.stringify(org));
    }
    
    sessionStorage.setItem('token', authToken);
    sessionStorage.setItem('user', JSON.stringify(userData));
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
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('organization');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const updateOrganization = (updatedOrganization: Organization | null) => {
    setOrganization(updatedOrganization);
    if (updatedOrganization) {
      sessionStorage.setItem('organization', JSON.stringify(updatedOrganization));
    } else {
      sessionStorage.removeItem('organization');
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
