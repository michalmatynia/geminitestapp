import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import React from 'react';

import { ToastProvider } from '@/shared/ui/toast';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity, // Disable garbage collection for tests
      },
      mutations: {
        retry: false,
      },
    },
  });

type CustomRenderOptions = {
  queryClient?: QueryClient;
} & Omit<RenderOptions, 'wrapper'>;

const customRender = (ui: React.ReactElement, options?: CustomRenderOptions): RenderResult => {
  const queryClient = options?.queryClient || createTestQueryClient();
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};

export * from '@testing-library/react';
export { customRender as render };
export { createTestQueryClient };
