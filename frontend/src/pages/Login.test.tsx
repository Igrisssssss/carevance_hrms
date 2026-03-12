import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '@/pages/Login';
import { renderWithProviders } from '@/test/renderWithProviders';

const loginMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits credentials and navigates to dashboard on success', async () => {
    loginMock.mockResolvedValue(undefined);

    renderWithProviders(<Login />);

    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin@example.com', 'password123');
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows the backend error message when login fails', async () => {
    loginMock.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });

    renderWithProviders(<Login />);

    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});
