/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

const socialPipelineRunnerTestHoisted = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  toastMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => socialPipelineRunnerTestHoisted.apiGetMock(...args),
    post: (...args: unknown[]) => socialPipelineRunnerTestHoisted.apiPostMock(...args),
  },
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({
    toast: socialPipelineRunnerTestHoisted.toastMock,
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: (...args: unknown[]) =>
    socialPipelineRunnerTestHoisted.logKangurClientErrorMock(...args),
  trackKangurClientEvent: (...args: unknown[]) =>
    socialPipelineRunnerTestHoisted.trackKangurClientEventMock(...args),
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
