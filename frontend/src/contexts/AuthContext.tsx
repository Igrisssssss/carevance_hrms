import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, Organization } from '@/types';
import { authApi } from '@/services/api';
import { apiUrl } from '@/lib/runtimeConfig';

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
const API_URL = apiUrl;

const getResponseStatus = (error: unknown): number | null => {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return null;
  }

  const response = (error as { response?: { status?: number } }).response;
  return typeof response?.status === 'number' ? response.status : null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isActiveRef = useRef(true);

  const clearStoredAuth = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('organization');
  };

  const clearAuthState = () => {
    setUser(null);
    setToken(null);
    setOrganization(null);
    clearStoredAuth();
  };

  const storeAuthState = (nextToken: string, nextUser: User, nextOrganization?: Organization | null) => {
    setToken(nextToken);
    setUser(nextUser);
    setOrganization(nextOrganization ?? null);

    sessionStorage.setItem('token', nextToken);
    sessionStorage.setItem('user', JSON.stringify(nextUser));

    if (nextOrganization) {
      sessionStorage.setItem('organization', JSON.stringify(nextOrganization));
      return;
    }

    sessionStorage.removeItem('organization');
  };

  const extractUserFromMeResponse = (payload: unknown): User | null => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    if ('data' in payload && payload.data && typeof payload.data === 'object') {
      return payload.data as User;
    }

    if ('id' in payload && 'email' in payload) {
      return payload as User;
    }

    const userPayload = { ...(payload as Record<string, unknown>) };
    delete userPayload.success;
    delete userPayload.message;
    if ('id' in userPayload && 'email' in userPayload) {
      return userPayload as unknown as User;
    }

    return null;
  };

  useEffect(() => {
    isActiveRef.current = true;

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
              if (isActiveRef.current) {
                storeAuthState(nextToken, nextUser, nextOrg);
              } else {
                sessionStorage.setItem('token', nextToken);
                sessionStorage.setItem('user', JSON.stringify(nextUser));
                if (nextOrg) {
                  sessionStorage.setItem('organization', JSON.stringify(nextOrg));
                } else {
                  sessionStorage.removeItem('organization');
                }
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
        if (isActiveRef.current) {
          setToken(storedToken);
        }
        if (storedUser) {
          try {
            if (isActiveRef.current) {
              setUser(JSON.parse(storedUser));
            }
          } catch {
            sessionStorage.removeItem('user');
          }
        }
        if (storedOrg) {
          try {
            if (isActiveRef.current) {
              setOrganization(JSON.parse(storedOrg));
            }
          } catch {
            sessionStorage.removeItem('organization');
          }
        }
        if (!DEMO_MODE) {
          await fetchUser();
        }
      }

      if (isActiveRef.current) {
        setIsLoading(false);
      }
    };

    bootstrapAuth();

    const handleAuthCleared = () => {
      if (isActiveRef.current) {
        clearAuthState();
        setIsLoading(false);
      }
    };

    window.addEventListener('app:auth-cleared', handleAuthCleared);

    return () => {
      isActiveRef.current = false;
      window.removeEventListener('app:auth-cleared', handleAuthCleared);
    };
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authApi.me();
      const nextUser = extractUserFromMeResponse(response.data);

      if (!nextUser) {
        throw new Error('Invalid auth payload');
      }

      if (!isActiveRef.current) {
        return;
      }

      setUser(nextUser);
      sessionStorage.setItem('user', JSON.stringify(nextUser));
    } catch (error) {
      console.error('Failed to fetch user:', error);
      if (isActiveRef.current) {
        clearAuthState();
      }
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

      storeAuthState('demo-token-12345', demoUser, demoOrg);
      return;
    }

    const response = await authApi.login({ email, password });
    const { user: userData, token: authToken, organization: org } = response.data;

    storeAuthState(authToken, userData, org);
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

      storeAuthState('demo-token-12345', demoUser, demoOrg);
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

    storeAuthState(authToken, userData, org);
  };

  const logout = async () => {
    if (!DEMO_MODE) {
      try {
        await authApi.logout();
      } catch (error) {
        const status = getResponseStatus(error);
        if (status !== 401 && status !== 403) {
          console.error('Logout error:', error);
        }
      }
    }
    clearAuthState();
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
