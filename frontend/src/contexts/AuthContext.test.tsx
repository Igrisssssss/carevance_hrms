import { waitFor, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { renderWithProviders } from '@/test/renderWithProviders';
import { authApi } from '@/services/api';

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      me: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    },
  };
});

function AuthProbe() {
  const { isLoading, isAuthenticated, user } = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user-email">{user?.email || ''}</span>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('restores auth from session storage and refreshes the user profile', async () => {
    sessionStorage.setItem('token', 'stored-token');
    sessionStorage.setItem('user', JSON.stringify({
      id: 1,
      name: 'Stored User',
      email: 'stored@example.com',
      role: 'admin',
      organization_id: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    vi.mocked(authApi.me).mockResolvedValue({
      data: {
        success: true,
        id: 1,
        name: 'Fresh User',
        email: 'fresh@example.com',
        role: 'admin',
        organization_id: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    } as any);

    renderWithProviders(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-email')).toHaveTextContent('fresh@example.com');
    });
  });
});
