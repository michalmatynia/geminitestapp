import type { Locator, Page } from 'playwright';
import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';

import { JOB_BOARD_SCRAPE_RUNTIME_STEPS } from '../job-board-runtime-constants';

import { JobBoardScrapeSequencer, type JobBoardScrapeStep } from './JobBoardScrapeSequencer';

type LocatorMock = Locator & {
  click: ReturnType<typeof vi.fn>;
  isVisible: ReturnType<typeof vi.fn>;
  waitFor: ReturnType<typeof vi.fn>;
};

const createLocator = (visible: boolean): LocatorMock => {
  const locator = {
    click: vi.fn(async () => undefined),
    count: vi.fn(async () => (visible ? 1 : 0)),
    evaluateAll: vi.fn(async () => -1),
    first: vi.fn(() => locator),
    getAttribute: vi.fn(async () => null),
    isVisible: vi.fn(async () => visible),
    nth: vi.fn(() => locator),
    textContent: vi.fn(async () => ''),
    waitFor: vi.fn(async () => undefined),
  } as unknown as LocatorMock;
  return locator;
};

describe('JobBoardScrapeSequencer', () => {
  it('accepts Pracuj.pl privacy modal through the dedicated cookie-consent step', async () => {
    const hiddenLocator = createLocator(false);
    const acceptLocator = createLocator(true);
    const bodyLocator = createLocator(true);
    const page = {
      frames: vi.fn(() => []),
      getByRole: vi.fn((_role: string, options: { name?: RegExp }) =>
        String(options.name).includes('akceptuj wszystkie') ? acceptLocator : hiddenLocator
      ),
      locator: vi.fn((selector: string) => (selector === 'body' ? bodyLocator : hiddenLocator)),
      mainFrame: vi.fn(() => null),
      url: vi.fn(() => 'https://it.pracuj.pl/praca?its=frontend%2Cbackend%2Cfullstack'),
      waitForFunction: vi.fn(async () => undefined),
      waitForLoadState: vi.fn(async () => undefined),
    } as unknown as Page;
    const sequencer = new JobBoardScrapeSequencer(
      { page, emit: vi.fn(), log: vi.fn() },
      {
        mode: 'collect_links',
        provider: 'pracuj_pl',
        sourceUrl: 'https://it.pracuj.pl/praca?its=frontend%2Cbackend%2Cfullstack',
      }
    );

    await (
      sequencer as unknown as {
        acceptCookies: () => Promise<void>;
      }
    ).acceptCookies();

    const steps = (sequencer as unknown as { steps: JobBoardScrapeStep[] }).steps;
    const cookieStep = steps.find(
      (step) => step.key === JOB_BOARD_SCRAPE_RUNTIME_STEPS.acceptCookies
    );
    expect(acceptLocator.click).toHaveBeenCalledTimes(1);
    expect(cookieStep).toMatchObject({
      status: 'completed',
      message: expect.stringContaining('Accepted cookie consent'),
    });
  });

  it('dismisses the Pracuj.pl employer promo after cookie consent', async () => {
    const hiddenLocator = createLocator(false);
    const acceptLocator = createLocator(true);
    const closeLocator = createLocator(true);
    const bodyLocator = createLocator(true);
    bodyLocator.textContent.mockResolvedValue(
      'Pracuj dla przedsiębiorców Szukasz pracownika? Przejdź do Pracuj.pl dla firm i dodaj ogłoszenie w atrakcyjnej cenie. Dodaj ogłoszenie Zamknij'
    );
    const page = {
      frames: vi.fn(() => []),
      getByRole: vi.fn((_role: string, options: { name?: RegExp }) =>
        String(options.name).includes('akceptuj wszystkie') ? acceptLocator : hiddenLocator
      ),
      locator: vi.fn((selector: string) => {
        if (selector === 'body') return bodyLocator;
        if (selector === 'button:has-text("Zamknij")') return closeLocator;
        return hiddenLocator;
      }),
      mainFrame: vi.fn(() => null),
      url: vi.fn(() => 'https://it.pracuj.pl/praca?its=frontend%2Cbackend%2Cfullstack'),
      waitForFunction: vi.fn(async () => undefined),
      waitForLoadState: vi.fn(async () => undefined),
    } as unknown as Page;
    const sequencer = new JobBoardScrapeSequencer(
      { page, emit: vi.fn(), log: vi.fn() },
      {
        mode: 'collect_links',
        provider: 'pracuj_pl',
        sourceUrl: 'https://it.pracuj.pl/praca?its=frontend%2Cbackend%2Cfullstack',
      }
    );

    await (
      sequencer as unknown as {
        acceptCookies: () => Promise<void>;
      }
    ).acceptCookies();

    const steps = (sequencer as unknown as { steps: JobBoardScrapeStep[] }).steps;
    const cookieStep = steps.find(
      (step) => step.key === JOB_BOARD_SCRAPE_RUNTIME_STEPS.acceptCookies
    );
    expect(acceptLocator.click).toHaveBeenCalledTimes(1);
    expect(closeLocator.click).toHaveBeenCalledTimes(1);
    expect(cookieStep).toMatchObject({
      status: 'completed',
      message: expect.stringContaining('dismissed blocking overlay'),
    });
  });

  it('follows Pracuj.pl company profile links and embeds company profile data in the snapshot', async () => {
    const offerUrl = 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001';
    const companyUrl = 'https://www.pracuj.pl/pracodawcy/acme,123';
    let currentUrl = offerUrl;
    const bodyLocator = createLocator(true);
    bodyLocator.textContent.mockResolvedValue('');
    const page = {
      evaluate: vi.fn(async () => {
        if ((page.evaluate as ReturnType<typeof vi.fn>).mock.calls.length === 1) {
          return {
            companyLinks: [companyUrl],
            plainText: 'Developer job offer',
            provider: 'pracuj_pl',
            title: 'Developer - Acme',
            url: offerUrl,
          };
        }
        return {
          facts: [{ label: 'Branża', value: 'IT' }],
          headings: ['O firmie'],
          plainText: 'Acme builds digital products for enterprise clients.',
          sections: [{ heading: 'O firmie', text: 'Acme builds digital products.' }],
          title: 'Acme - profil pracodawcy',
          url: companyUrl,
          websiteUrls: ['https://acme.example'],
        };
      }),
      frames: vi.fn(() => []),
      goto: vi.fn(async (url: string) => {
        currentUrl = url;
        return null;
      }),
      locator: vi.fn((selector: string) => (selector === 'body' ? bodyLocator : createLocator(false))),
      mainFrame: vi.fn(() => null),
      url: vi.fn(() => currentUrl),
      waitForLoadState: vi.fn(async () => undefined),
    } as unknown as Page;
    const sequencer = new JobBoardScrapeSequencer(
      { page, emit: vi.fn(), log: vi.fn() },
      {
        mode: 'fetch_offer',
        provider: 'pracuj_pl',
        sourceUrl: offerUrl,
      }
    );
    (sequencer as unknown as { provider: string; sourceUrl: string }).provider = 'pracuj_pl';
    (sequencer as unknown as { provider: string; sourceUrl: string }).sourceUrl = offerUrl;

    await (
      sequencer as unknown as {
        extractOfferSnapshot: () => Promise<void>;
      }
    ).extractOfferSnapshot();

    const html = (sequencer as unknown as { html: string | null }).html ?? '';
    expect(page.goto).toHaveBeenCalledWith(companyUrl, expect.any(Object));
    expect(html).toContain('"companyProfile"');
    expect(html).toContain('Acme builds digital products');
  });

  it('extracts company contact and social data from profile page JSON-LD', async () => {
    const offerUrl = 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001';
    const companyUrl = 'https://www.pracuj.pl/pracodawcy/acme,123';
    const profileHtml = `
      <main>
        <h1>Acme</h1>
        <script type="application/ld+json">
          {
            "@type": "Organization",
            "name": "Acme",
            "url": "https://acme.example",
            "sameAs": [
              "https://www.linkedin.com/company/acme",
              "https://github.com/acme"
            ],
            "email": "jobs@acme.example",
            "telephone": "+48 22 123 45 67",
            "logo": "https://cdn.acme.example/logo.png",
            "taxID": "5210123456",
            "numberOfEmployees": 250,
            "address": {
              "streetAddress": "Konstruktorska 12A",
              "postalCode": "02-673",
              "addressLocality": "Warszawa",
              "addressCountry": "Poland"
            }
          }
        </script>
      </main>
    `;
    let currentUrl = offerUrl;
    const bodyLocator = createLocator(true);
    bodyLocator.textContent.mockResolvedValue('');
    const page = {
      evaluate: vi.fn(async (callback: unknown, input: unknown) => {
        if ((page.evaluate as ReturnType<typeof vi.fn>).mock.calls.length === 1) {
          return {
            companyLinks: [companyUrl],
            plainText: 'Developer job offer',
            provider: 'pracuj_pl',
            title: 'Developer - Acme',
            url: offerUrl,
          };
        }
        const window = new Window({ url: companyUrl });
        window.document.write(profileHtml);
        const globalRecord = globalThis as typeof globalThis & {
          document?: unknown;
          Element?: unknown;
          HTMLElement?: unknown;
          window?: unknown;
        };
        const previous = {
          document: globalRecord.document,
          Element: globalRecord.Element,
          HTMLElement: globalRecord.HTMLElement,
          window: globalRecord.window,
        };
        globalRecord.window = window;
        globalRecord.document = window.document;
        globalRecord.Element = window.Element;
        globalRecord.HTMLElement = window.HTMLElement;
        try {
          return (callback as (value: unknown) => unknown)(input);
        } finally {
          globalRecord.window = previous.window;
          globalRecord.document = previous.document;
          globalRecord.Element = previous.Element;
          globalRecord.HTMLElement = previous.HTMLElement;
          window.close();
        }
      }),
      frames: vi.fn(() => []),
      goto: vi.fn(async (url: string) => {
        currentUrl = url;
        return null;
      }),
      locator: vi.fn((selector: string) => (selector === 'body' ? bodyLocator : createLocator(false))),
      mainFrame: vi.fn(() => null),
      url: vi.fn(() => currentUrl),
      waitForLoadState: vi.fn(async () => undefined),
    } as unknown as Page;
    const sequencer = new JobBoardScrapeSequencer(
      { page, emit: vi.fn(), log: vi.fn() },
      {
        mode: 'fetch_offer',
        provider: 'pracuj_pl',
        sourceUrl: offerUrl,
      }
    );
    (sequencer as unknown as { provider: string; sourceUrl: string }).provider = 'pracuj_pl';
    (sequencer as unknown as { provider: string; sourceUrl: string }).sourceUrl = offerUrl;

    await (
      sequencer as unknown as {
        extractOfferSnapshot: () => Promise<void>;
      }
    ).extractOfferSnapshot();

    const html = (sequencer as unknown as { html: string | null }).html ?? '';
    expect(html).toContain('jobs@acme.example');
    expect(html).toContain('+48 22 123 45 67');
    expect(html).toContain('https://cdn.acme.example/logo.png');
    expect(html).toContain('https://www.linkedin.com/company/acme');
    expect(html).toContain('https://github.com/acme');
    expect(html).toContain('Company size');
    expect(html).toContain('5210123456');
  });

  it('uses the Pracuj.pl Zobacz profil link to access company profile data', async () => {
    const offerUrl = 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001';
    const companyUrl = 'https://www.pracuj.pl/pracodawcy/acme,123';
    let currentUrl = offerUrl;
    const profileLocator = createLocator(true);
    profileLocator.getAttribute.mockResolvedValue(companyUrl);
    const bodyLocator = createLocator(true);
    bodyLocator.textContent.mockResolvedValue('');
    const page = {
      evaluate: vi.fn(async () => {
        if ((page.evaluate as ReturnType<typeof vi.fn>).mock.calls.length === 1) {
          return {
            companyLinks: [],
            plainText: 'Developer job offer',
            provider: 'pracuj_pl',
            title: 'Developer - Acme',
            url: offerUrl,
          };
        }
        return {
          facts: [],
          headings: ['O firmie'],
          plainText: 'Acme builds digital products from profile page.',
          sections: [{ heading: 'O firmie', text: 'Acme builds digital products.' }],
          title: 'Acme - profil pracodawcy',
          url: companyUrl,
          websiteUrls: [],
        };
      }),
      frames: vi.fn(() => []),
      goto: vi.fn(async (url: string) => {
        currentUrl = url;
        return null;
      }),
      locator: vi.fn((selector: string) => {
        if (selector === 'body') return bodyLocator;
        if (selector.includes('Zobacz profil')) return profileLocator;
        return createLocator(false);
      }),
      mainFrame: vi.fn(() => null),
      url: vi.fn(() => currentUrl),
      waitForLoadState: vi.fn(async () => undefined),
    } as unknown as Page;
    const sequencer = new JobBoardScrapeSequencer(
      { page, emit: vi.fn(), log: vi.fn() },
      {
        mode: 'fetch_offer',
        provider: 'pracuj_pl',
        sourceUrl: offerUrl,
      }
    );
    (sequencer as unknown as { provider: string; sourceUrl: string }).provider = 'pracuj_pl';
    (sequencer as unknown as { provider: string; sourceUrl: string }).sourceUrl = offerUrl;

    await (
      sequencer as unknown as {
        extractOfferSnapshot: () => Promise<void>;
      }
    ).extractOfferSnapshot();

    const html = (sequencer as unknown as { html: string | null }).html ?? '';
    expect(page.goto).toHaveBeenCalledWith(companyUrl, expect.any(Object));
    expect(profileLocator.getAttribute).toHaveBeenCalledWith('href', expect.any(Object));
    expect(html).toContain('Acme builds digital products from profile page');
  });
});
