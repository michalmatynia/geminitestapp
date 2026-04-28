import type { Locator, Page } from 'playwright';
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
});
