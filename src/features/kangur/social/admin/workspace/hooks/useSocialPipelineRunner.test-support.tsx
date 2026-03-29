/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

const socialPipelineRunnerTestHoisted = vi.hoisted(() => {
  const apiGetMock = vi.fn();
  const apiPostMock = vi.fn();
  const logKangurClientErrorMock = vi.fn();
  const toastMock = vi.fn();
  const trackKangurClientEventMock = vi.fn();

  return {
    apiGetMock,
    apiPostMock,
    logKangurClientErrorMock,
    toastMock,
    trackKangurClientEventMock,
    runApiGetMock: (...args: unknown[]): Promise<unknown> =>
      apiGetMock(...args) as Promise<unknown>,
    runApiPostMock: (...args: unknown[]): Promise<unknown> =>
      apiPostMock(...args) as Promise<unknown>,
    runLogKangurClientErrorMock: (...args: unknown[]): void => {
      logKangurClientErrorMock(...args);
    },
    runTrackKangurClientEventMock: (...args: unknown[]): void => {
      trackKangurClientEventMock(...args);
    },
  };
});

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: socialPipelineRunnerTestHoisted.runApiGetMock,
    post: socialPipelineRunnerTestHoisted.runApiPostMock,
  },
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({
    toast: socialPipelineRunnerTestHoisted.toastMock,
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: socialPipelineRunnerTestHoisted.runLogKangurClientErrorMock,
  trackKangurClientEvent: socialPipelineRunnerTestHoisted.runTrackKangurClientEventMock,
}));

import { useSocialPipelineRunner as importedUseSocialPipelineRunner } from './useSocialPipelineRunner';

export const useSocialPipelineRunner = importedUseSocialPipelineRunner;
export const apiGetMock = socialPipelineRunnerTestHoisted.apiGetMock;
export const apiPostMock = socialPipelineRunnerTestHoisted.apiPostMock;
export const logKangurClientErrorMock =
  socialPipelineRunnerTestHoisted.logKangurClientErrorMock;
export const toastMock = socialPipelineRunnerTestHoisted.toastMock;
export const trackKangurClientEventMock =
  socialPipelineRunnerTestHoisted.trackKangurClientEventMock;

export const completedVisualAnalysis = {
  summary: 'The hero now shows a larger student card and clearer CTA.',
  highlights: ['Larger student card', 'Clearer CTA'],
} as const;

export const createWrapper = (): React.ComponentType<{ children: ReactNode }> => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};
