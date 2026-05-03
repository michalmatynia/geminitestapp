import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/playwright/server/runtime', () => ({
  runPlaywrightEngineTask: vi.fn(),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: { captureException: vi.fn() },
}));

import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import { findCompanyEmails } from './email-finder';

type MockFetchResponse = {
  ok: boolean;
  url: string;
  text: () => Promise<string>;
};

const originalPlaywrightEnv = process.env['JOB_BOARD_USE_PLAYWRIGHT'];
const fetchMock = vi.fn();
const runPlaywrightEngineTaskMock = vi.mocked(runPlaywrightEngineTask);

const createHtmlResponse = (url: string, html: string, ok = true): MockFetchResponse => ({
  ok,
  url,
  text: vi.fn().mockResolvedValue(html),
});

describe('email-finder', () => {
  beforeEach(() => {
    delete process.env['JOB_BOARD_USE_PLAYWRIGHT'];
    fetchMock.mockReset();
    runPlaywrightEngineTaskMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalPlaywrightEnv === undefined) {
      delete process.env['JOB_BOARD_USE_PLAYWRIGHT'];
    } else {
      process.env['JOB_BOARD_USE_PLAYWRIGHT'] = originalPlaywrightEnv;
    }
  });

  it('discovers internal contact links and extracts mailto addresses from them', async () => {
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = String(input);
      if (url === 'https://acme.example/') {
        return createHtmlResponse(
          url,
          `<html><body><a href="/contact-us">Contact us</a></body></html>`
        );
      }
      if (url === 'https://acme.example/contact-us') {
        return createHtmlResponse(
          url,
          `<html><body><a href="mailto:info@acme.example?subject=hello">Email</a></body></html>`
        );
      }
      return createHtmlResponse(url, '', false);
    });

    const result = await findCompanyEmails({
      website: 'acme.example',
      domain: null,
    });

    expect(result.visitedUrls).toContain('https://acme.example/');
    expect(result.visitedUrls).toContain('https://acme.example/contact-us');
    expect(result.emails).toEqual([
      expect.objectContaining({
        address: 'info@acme.example',
        source: 'https://acme.example/contact-us',
        isPrimary: true,
      }),
    ]);
  });

  it('decodes obfuscated emails and ranks same-domain corporate addresses above personal inboxes', async () => {
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = String(input);
      if (url === 'https://acme.pl/') {
        return createHtmlResponse(
          url,
          `<html><body>
            <div>Biuro [at] acme [dot] pl</div>
            <div>Founder: founder@gmail.com</div>
          </body></html>`
        );
      }
      return createHtmlResponse(url, '', false);
    });

    const result = await findCompanyEmails({
      website: 'https://acme.pl',
      domain: null,
    });

    expect(result.emails[0]).toEqual(
      expect.objectContaining({
        address: 'biuro@acme.pl',
        isPrimary: true,
      })
    );
    expect(result.emails.map((entry) => entry.address)).toContain('founder@gmail.com');
  });

  it('returns browser scraper steps from the Playwright engine and forwards the headless preference', async () => {
    runPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-1',
      status: 'completed',
      result: {
        returnValue: {
          emails: [
            {
              address: 'contact@acme.example',
              source: 'https://acme.example/contact',
              isPrimary: true,
            },
          ],
          visitedUrls: ['https://acme.example/contact'],
          steps: [
            {
              key: 'browser_open',
              label: 'Open company website',
              status: 'completed',
              durationMs: 820,
            },
          ],
          durationMs: 1640,
        },
      },
    } as never);

    const result = await findCompanyEmails({
      website: 'https://acme.example',
      domain: 'acme.example',
      companyName: 'Acme',
      headless: false,
    });

    expect(runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          startUrl: expect.stringMatching(/^https:\/\/acme\.example\/?$/),
          settingsOverrides: expect.objectContaining({
            headless: false,
          }),
        }),
      })
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'browser_open',
          label: 'Open company website',
          status: 'completed',
        }),
        expect.objectContaining({
          key: 'http_crawl_fallback',
          status: 'skipped',
        }),
      ])
    );
    expect(result.emails).toEqual([
      expect.objectContaining({
        address: 'contact@acme.example',
        isPrimary: true,
      }),
    ]);
    expect(
      result.visitedUrls.some(
        (url) => url === 'https://acme.example' || url === 'https://acme.example/'
      )
    ).toBe(true);
    expect(result.visitedUrls).toContain('https://acme.example/contact');
  });

  it('incorporates the HTTP crawl fallback into the browser scraper step sequence when Playwright finds no emails', async () => {
    runPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-2',
      status: 'completed',
      result: {
        returnValue: {
          emails: [],
          visitedUrls: ['https://acme.example/'],
          steps: [
            {
              key: 'validate_input',
              label: 'Validate company email scrape input',
              status: 'completed',
            },
            {
              key: 'browser_open',
              label: 'Open company website',
              status: 'completed',
            },
            {
              key: 'cookie_consent',
              label: 'Handle cookie consent',
              status: 'completed',
            },
            {
              key: 'scan_current_page',
              label: 'Scan current page for email evidence',
              status: 'completed',
            },
            {
              key: 'discover_contact_paths',
              label: 'Discover contact-related pages',
              status: 'completed',
            },
            {
              key: 'crawl_contact_pages',
              label: 'Crawl candidate contact pages',
              status: 'completed',
            },
            {
              key: 'rank_company_emails',
              label: 'Rank company emails',
              status: 'skipped',
            },
          ],
          durationMs: 1100,
        },
      },
    } as never);

    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = String(input);
      if (url === 'https://acme.example/') {
        return createHtmlResponse(
          url,
          `<html><body><a href="/contact-us">Contact us</a></body></html>`
        );
      }
      if (url === 'https://acme.example/contact-us') {
        return createHtmlResponse(
          url,
          `<html><body><a href="mailto:info@acme.example">Email</a></body></html>`
        );
      }
      return createHtmlResponse(url, '', false);
    });

    const result = await findCompanyEmails({
      website: 'https://acme.example',
      domain: 'acme.example',
      companyName: 'Acme',
    });

    expect(result.emails).toEqual([
      expect.objectContaining({
        address: 'info@acme.example',
        isPrimary: true,
      }),
    ]);
    expect(result.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'http_crawl_fallback',
          status: 'completed',
          message: expect.stringContaining('found 1 ranked email'),
        }),
        expect.objectContaining({
          key: 'rank_company_emails',
          status: 'completed',
        }),
      ])
    );
    expect(result.visitedUrls).toContain('https://acme.example/contact-us');
  });
});
