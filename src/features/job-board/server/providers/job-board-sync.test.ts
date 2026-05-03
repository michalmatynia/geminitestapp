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
  collectJobBoardOfferUrlsDeterministically,
  collectJobBoardOfferUrls,
  detectJobBoardProviderFromUrl,
  extractJobBoardStructuredSnapshot,
  extractJobBoardExternalIdFromUrl,
  fetchJobBoardPage,
  isJobBoardOfferUrl,
} from './job-board-sync';

describe('job-board-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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

  it('keeps forcePlaywright false on the deterministic HTTP fetch path', async () => {
    vi.stubEnv('JOB_BOARD_USE_PLAYWRIGHT', 'true');
    const fetchMock = vi.fn(async () => new Response('<html><main>Senior Node</main></html>'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchJobBoardPage('https://justjoin.it/job-offer/acme-senior-node', {
      forcePlaywright: false,
      provider: 'auto',
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.runPlaywrightEngineTaskMock).not.toHaveBeenCalled();
  });

  it('collects offer links through deterministic HTML parsing without the browser runtime', async () => {
    const html = `
      <html>
        <body>
          <a href="/job-offer/acme-senior-node">Senior Node</a>
          <a href="https://justjoin.it/job-offer/acme-frontend">Frontend</a>
          <a href="/companies/acme">Company profile</a>
        </body>
      </html>
    `;
    const fetchMock = vi.fn(async () => new Response(html));
    vi.stubGlobal('fetch', fetchMock);

    const result = await collectJobBoardOfferUrlsDeterministically({
      maxOffers: 10,
      provider: 'auto',
      sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
    });

    expect(result.links).toEqual([
      { title: 'Senior Node', url: 'https://justjoin.it/job-offer/acme-senior-node' },
      { title: 'Frontend', url: 'https://justjoin.it/job-offer/acme-frontend' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.runPlaywrightEngineTaskMock).not.toHaveBeenCalled();
  });

  it('does not treat Pracuj category URLs as deterministic offer links', async () => {
    const html = `
      <html>
        <body>
          <a href="/praca/it;kw">IT category</a>
          <a href="/praca/frontend-developer-warszawa,oferta,1001">Frontend Developer</a>
        </body>
      </html>
    `;
    const fetchMock = vi.fn(async () => new Response(html));
    vi.stubGlobal('fetch', fetchMock);

    const result = await collectJobBoardOfferUrlsDeterministically({
      maxOffers: 10,
      provider: 'auto',
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
    });

    expect(result.links).toEqual([
      {
        title: 'Frontend Developer',
        url: 'https://www.pracuj.pl/praca/frontend-developer-warszawa,oferta,1001',
      },
    ]);
    expect(mocks.runPlaywrightEngineTaskMock).not.toHaveBeenCalled();
  });

  it('builds a deterministic structured snapshot from plain job posting HTML', () => {
    const html = `
      <html>
        <head>
          <title>Senior Node Developer - Acme Tech</title>
          <meta property="og:description" content="Build commerce APIs." />
          <script type="application/ld+json">
            {
              "@type": "JobPosting",
              "title": "Senior Node Developer",
              "description": "<p>Build APIs for merchants.</p>",
              "hiringOrganization": {
                "name": "Acme Tech",
                "url": "https://acme.example",
                "sameAs": [
                  "https://www.linkedin.com/company/acme-tech",
                  "https://github.com/acme-tech"
                ],
                "email": "jobs@acme.example",
                "telephone": "+48 22 123 45 67",
                "logo": "https://cdn.acme.example/logo.png",
                "taxID": "5210123456",
                "description": "Acme builds commerce systems.",
                "industry": "Software",
                "numberOfEmployees": 250,
                "address": {
                  "streetAddress": "Konstruktorska 12A",
                  "postalCode": "02-673",
                  "addressLocality": "Warszawa",
                  "addressCountry": "Poland"
                }
              },
              "datePosted": "2026-04-28T09:00:00.000Z",
              "validThrough": "2026-05-28T23:59:59.000Z",
              "jobLocation": {
                "address": {
                  "streetAddress": "Puławska 180",
                  "postalCode": "02-670",
                  "addressLocality": "Warszawa",
                  "addressRegion": "Masovian",
                  "addressCountry": "Poland"
                }
              }
            }
          </script>
        </head>
        <body><main><h1>Senior Node Developer</h1></main></body>
      </html>
    `;

    const snapshot = extractJobBoardStructuredSnapshot(
      html,
      'https://justjoin.it/job-offer/acme-senior-node'
    );

    expect(snapshot).toMatchObject({
      companyLinks: [
        'https://acme.example',
        'https://www.linkedin.com/company/acme-tech',
        'https://github.com/acme-tech',
      ],
      companyProfile: {
        facts: expect.arrayContaining([
          { label: 'Company', value: 'Acme Tech' },
          { label: 'Website', value: 'https://acme.example' },
          { label: 'Same as', value: 'https://www.linkedin.com/company/acme-tech' },
          { label: 'Same as', value: 'https://github.com/acme-tech' },
          { label: 'Email', value: 'jobs@acme.example' },
          { label: 'Phone', value: '+48 22 123 45 67' },
          { label: 'Logo URL', value: 'https://cdn.acme.example/logo.png' },
          { label: 'Industry', value: 'Software' },
          { label: 'Company size', value: '250' },
          { label: 'NIP', value: '5210123456' },
          {
            label: 'Company Address',
            value: 'Konstruktorska 12A, 02-673 Warszawa, Poland',
          },
        ]),
        plainText: 'Acme builds commerce systems.',
        websiteUrls: [
          'https://acme.example',
          'https://www.linkedin.com/company/acme-tech',
          'https://github.com/acme-tech',
        ],
      },
      facts: expect.arrayContaining([
        { label: 'Company', value: 'Acme Tech' },
        { label: 'Location', value: 'Warszawa' },
        { label: 'Address', value: 'Puławska 180, 02-670 Warszawa, Masovian, Poland' },
        { label: 'Posted at', value: '2026-04-28T09:00:00.000Z' },
        { label: 'Expires at', value: '2026-05-28T23:59:59.000Z' },
      ]),
      headings: ['Senior Node Developer'],
      sections: [{ heading: 'Description', text: 'Build APIs for merchants.' }],
      url: 'https://justjoin.it/job-offer/acme-senior-node',
    });
  });

  it('extracts Pracuj employer name from the exact employer selector', () => {
    const snapshot = extractJobBoardStructuredSnapshot(
      `
        <html>
          <head><title>Backend Developer - oferta pracy</title></head>
          <body>
            <main>
              <h1>Backend Developer</h1>
              <h2 data-scroll-id="employer-name" data-test="text-employerName">
                Real Employer Sp. z o.o.
              </h2>
            </main>
          </body>
        </html>
      `,
      'https://www.pracuj.pl/praca/backend-developer-warszawa,oferta,1001'
    );

    expect(snapshot).toMatchObject({
      employerName: 'Real Employer Sp. z o.o.',
      companyProfile: {
        facts: expect.arrayContaining([
          { label: 'Company', value: 'Real Employer Sp. z o.o.' },
        ]),
      },
      facts: expect.arrayContaining([
        { label: 'Employer', value: 'Real Employer Sp. z o.o.' },
        { label: 'Company', value: 'Real Employer Sp. z o.o.' },
      ]),
    });
  });

  it.each([
    {
      html: `
        <h2 data-scroll-id="employer-name" data-test="text-employerName">
          Sii Sp. z o.o.<a href="#company-details">About the Company</a>
        </h2>
      `,
      label: 'company details anchor',
    },
    {
      html: `
        <h2 data-scroll-id="employer-name" data-test="text-employerName">
          Sii Sp. z o.o.O firmie
        </h2>
      `,
      label: 'Polish section label suffix',
    },
  ])('ignores Pracuj $label in employer identity', ({ html }) => {
    const snapshot = extractJobBoardStructuredSnapshot(
      `
        <html>
          <head><title>Backend Developer - oferta pracy</title></head>
          <body><main><h1>Backend Developer</h1>${html}</main></body>
        </html>
      `,
      'https://www.pracuj.pl/praca/backend-developer-warszawa,oferta,1001'
    );

    expect(snapshot).toMatchObject({
      employerName: 'Sii Sp. z o.o.',
      companyProfile: {
        facts: expect.arrayContaining([{ label: 'Company', value: 'Sii Sp. z o.o.' }]),
      },
      facts: expect.arrayContaining([
        { label: 'Employer', value: 'Sii Sp. z o.o.' },
        { label: 'Company', value: 'Sii Sp. z o.o.' },
      ]),
    });
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

  it('uses the runtime action browser preference when launching the job-board runtime', async () => {
    vi.stubEnv('PLAYWRIGHT_BRAVE_EXECUTABLE_PATH', '/tmp/brave-browser');
    mocks.resolveRuntimeActionExecutionSettingsMock.mockResolvedValueOnce({
      ...defaultPlaywrightActionExecutionSettings,
      browserPreference: 'brave',
      headless: false,
    });

    await collectJobBoardOfferUrls({
      maxOffers: 10,
      provider: 'auto',
      sourceUrl: 'https://it.pracuj.pl/praca?its=frontend%2Cbackend%2Cfullstack',
    });

    const request = mocks.runPlaywrightEngineTaskMock.mock.calls[0][0].request;
    expect(request).toMatchObject({
      runtimeKey: JOB_BOARD_SCRAPE_RUNTIME_KEY,
      launchOptions: {
        executablePath: '/tmp/brave-browser',
        headless: false,
      },
    });
    expect(request.launchOptions).not.toHaveProperty('channel');
  });
});
