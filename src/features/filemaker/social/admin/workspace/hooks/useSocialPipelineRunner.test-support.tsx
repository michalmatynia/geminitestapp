/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

const socialPipelineRunnerTestHoisted = vi.hoisted(() => {
  const apiGetMock = vi.fn();
  const apiPostMock = vi.fn();
  const logSocialPublishingClientErrorMock = vi.fn();
  const toastMock = vi.fn();
  const trackSocialPublishingClientEventMock = vi.fn();

  return {
    apiGetMock,
    apiPostMock,
    logSocialPublishingClientErrorMock,
    toastMock,
    trackSocialPublishingClientEventMock,
    runApiGetMock: (...args: unknown[]): Promise<unknown> =>
      apiGetMock(...args) as Promise<unknown>,
    runApiPostMock: (...args: unknown[]): Promise<unknown> =>
      apiPostMock(...args) as Promise<unknown>,
    runLogKangurClientErrorMock: (...args: unknown[]): void => {
      logSocialPublishingClientErrorMock(...args);
    },
    runTrackKangurClientEventMock: (...args: unknown[]): void => {
      trackSocialPublishingClientEventMock(...args);
    },
  };
});

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: socialPipelineRunnerTestHoisted.runApiGetMock,
    post: socialPipelineRunnerTestHoisted.runApiPostMock,
  },
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: socialPipelineRunnerTestHoisted.toastMock,
  }),
}));

vi.mock('@/features/filemaker/social/client-observability', () => ({
  logSocialPublishingClientError: socialPipelineRunnerTestHoisted.runLogKangurClientErrorMock,
  trackSocialPublishingClientEvent: socialPipelineRunnerTestHoisted.runTrackKangurClientEventMock,

  isRecoverableSocialPublishingClientFetchError: vi.fn().mockReturnValue(false),}));

import { useSocialPipelineRunner as importedUseSocialPipelineRunner } from './useSocialPipelineRunner';

export const useSocialPipelineRunner = importedUseSocialPipelineRunner;
export const apiGetMock = socialPipelineRunnerTestHoisted.apiGetMock;
export const apiPostMock = socialPipelineRunnerTestHoisted.apiPostMock;
export const logSocialPublishingClientErrorMock =
  socialPipelineRunnerTestHoisted.logSocialPublishingClientErrorMock;
export const toastMock = socialPipelineRunnerTestHoisted.toastMock;
export const trackSocialPublishingClientEventMock =
  socialPipelineRunnerTestHoisted.trackSocialPublishingClientEventMock;

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
