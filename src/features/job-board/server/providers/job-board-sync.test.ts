import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runPlaywrightEngineTaskMock: vi.fn(),
  resolveRuntimeActionExecutionSettingsMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/playwright/server/runtime', () => ({
  runPlaywrightEngineTask: (...args: unknown[]) => mocks.runPlaywrightEngineTaskMock(...args),
}));

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  resolveRuntimeActionExecutionSettings: (...args: unknown[]) =>
    mocks.resolveRuntimeActionExecutionSettingsMock(...args),
}));

import { defaultPlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';
import { JOB_BOARD_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-board-runtime-constants';

import {
  collectJobBoardOfferUrls,
  detectJobBoardProviderFromUrl,
  extractJobBoardExternalIdFromUrl,
  fetchJobBoardPage,
  isJobBoardOfferUrl,
} from './job-board-sync';

describe('job-board-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveRuntimeActionExecutionSettingsMock.mockResolvedValue({
      ...defaultPlaywrightActionExecutionSettings,
    });
    mocks.runPlaywrightEngineTaskMock.mockResolvedValue({
      status: 'completed',
      runId: 'run-1',
      result: {
        returnValue: {
          finalUrl: 'https://justjoin.it/job-offer/acme-senior-node',
          html: '<html><main><h1>Senior Node</h1></main></html>',
          httpStatus: 200,
          links: [
            {
              title: 'Senior Node',
              url: 'https://justjoin.it/job-offer/acme-senior-node',
            },
          ],
          visitedUrls: ['https://justjoin.it/job-offers/all-locations/javascript'],
          warnings: [],
        },
      },
      logs: [],
    });
  });

  it('detects supported job board providers and offer URL shapes', () => {
    expect(detectJobBoardProviderFromUrl('https://www.pracuj.pl/praca/it;kw')).toBe('pracuj_pl');
    expect(detectJobBoardProviderFromUrl('https://justjoin.it/job-offers/all-locations/javascript')).toBe('justjoin_it');
    expect(detectJobBoardProviderFromUrl('https://nofluffjobs.com/pl/job/backend-dev-acme')).toBe('nofluffjobs');
    expect(isJobBoardOfferUrl('https://justjoin.it/job-offer/acme-senior-node')).toBe(true);
    expect(isJobBoardOfferUrl('https://nofluffjobs.com/pl/job/backend-dev-acme')).toBe(true);
    expect(extractJobBoardExternalIdFromUrl('https://justjoin.it/job-offer/acme-senior-node')).toBe(
      'acme-senior-node'
    );
  });

  it('collects JustJoin offers through the shared runtime key and persona settings', async () => {
    const result = await collectJobBoardOfferUrls({
      headless: false,
      humanizeMouse: true,
      maxOffers: 10,
      personaId: 'persona-search',
      provider: 'auto',
      sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
    });

    expect(result.provider).toBe('justjoin_it');
    expect(result.sourceSite).toBe('justjoin.it');
    expect(result.links).toEqual([
      {
        title: 'Senior Node',
        url: 'https://justjoin.it/job-offer/acme-senior-node',
      },
    ]);
    const request = mocks.runPlaywrightEngineTaskMock.mock.calls[0][0].request;
    expect(request).toMatchObject({
      runtimeKey: JOB_BOARD_SCRAPE_RUNTIME_KEY,
      personaId: 'persona-search',
      launchOptions: { headless: false },
      settingsOverrides: {
        identityProfile: 'search',
        humanizeMouse: true,
      },
      input: {
        mode: 'collect_links',
        provider: 'justjoin_it',
        maxOffers: 10,
      },
    });
    expect(request).not.toHaveProperty('script');
  });

  it('fetches NoFluffJobs offer pages through the same runtime', async () => {
    mocks.runPlaywrightEngineTaskMock.mockResolvedValueOnce({
      status: 'completed',
      runId: 'run-2',
      result: {
        returnValue: {
          finalUrl: 'https://nofluffjobs.com/pl/job/backend-dev-acme',
          html: '<html><main><h1>Backend Dev</h1></main></html>',
          httpStatus: 200,
        },
      },
      logs: [],
    });

    const result = await fetchJobBoardPage('https://nofluffjobs.com/pl/job/backend-dev-acme', {
      forcePlaywright: true,
      provider: 'auto',
    });

    expect(result.ok).toBe(true);
    expect(result.provider).toBe('nofluffjobs');
    expect(result.sourceSite).toBe('nofluffjobs.com');
    const request = mocks.runPlaywrightEngineTaskMock.mock.calls[0][0].request;
    expect(request).toMatchObject({
      runtimeKey: JOB_BOARD_SCRAPE_RUNTIME_KEY,
      input: {
        mode: 'fetch_offer',
        provider: 'nofluffjobs',
      },
    });
    expect(request).not.toHaveProperty('launchOptions');
    expect(request).not.toHaveProperty('script');
  });

  it('uses the runtime action browser mode when no run override is provided', async () => {
    mocks.resolveRuntimeActionExecutionSettingsMock.mockResolvedValueOnce({
      ...defaultPlaywrightActionExecutionSettings,
      headless: false,
      humanizeMouse: false,
      identityProfile: 'marketplace',
    });
    mocks.runPlaywrightEngineTaskMock.mockResolvedValueOnce({
      status: 'completed',
      runId: 'run-3',
      result: {
        returnValue: {
          finalUrl: 'https://it.pracuj.pl/praca?its=frontend%2Cbackend%2Cfullstack',
          html: '<html><main><a href="/praca/frontend,oferta,123">Frontend</a></main></html>',
          httpStatus: 200,
          links: [
            {
              title: 'Frontend',
              url: 'https://www.pracuj.pl/praca/frontend,oferta,123',
            },
          ],
          visitedUrls: ['https://it.pracuj.pl/praca?its=frontend%2Cbackend%2Cfullstack'],
          warnings: [],
        },
      },
      logs: [],
    });

    await collectJobBoardOfferUrls({
      maxOffers: 10,
      provider: 'auto',
      sourceUrl: 'https://it.pracuj.pl/praca?its=frontend%2Cbackend%2Cfullstack',
    });

    const request = mocks.runPlaywrightEngineTaskMock.mock.calls[0][0].request;
    expect(request).toMatchObject({
      runtimeKey: JOB_BOARD_SCRAPE_RUNTIME_KEY,
      launchOptions: { headless: false },
      settingsOverrides: {
        headless: false,
        humanizeMouse: false,
        identityProfile: 'marketplace',
      },
    });
  });
});
