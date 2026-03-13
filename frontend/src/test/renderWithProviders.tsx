import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

export function renderWithProviders(
  ui: ReactElement,
  options?: {
    route?: string;
    wrapper?: ({ children }: { children: ReactNode }) => JSX.Element;
  }
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const BaseWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={routerFuture} initialEntries={[options?.route || '/']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  const Wrapper = options?.wrapper
    ? ({ children }: { children: ReactNode }) => options.wrapper!({ children: <BaseWrapper>{children}</BaseWrapper> })
    : BaseWrapper;

  return render(ui, { wrapper: Wrapper });
}
