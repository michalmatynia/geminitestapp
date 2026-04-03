import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import React from 'react';
import { expect } from 'vitest';

export const createProductSettingsTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export const createProductSettingsTestWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

export const expectInvalidationSubset = async ({
  invalidateSpy,
  queryKeys,
  totalCalls,
}: {
  invalidateSpy: ReturnType<typeof expect.getState> extends never ? never : {
    mock?: unknown;
  };
  queryKeys: readonly unknown[];
  totalCalls: number;
}): Promise<void> => {
  await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(totalCalls));
  queryKeys.forEach((queryKey) => {
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
  });
};
