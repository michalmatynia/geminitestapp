import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseUserScript } from '@/features/ai/ai-paths/services/playwright-node-runner.parser';
import { buildTraderaCheckStatusScript } from './check-status-script';

describe('Tradera script builders', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('buildTraderaCheckStatusScript injects the centralized execution steps init', () => {
    const script = buildTraderaCheckStatusScript(undefined, `const executionSteps = [
  { id: 'browser_preparation', label: 'Prep', status: 'pending', message: null },
  { id: 'resolve_status', label: 'Resolve', status: 'pending', message: null },
];`);

    expect(script).toContain("id: 'browser_preparation'");
    expect(script).toContain("id: 'resolve_status'");
    expect(script).toContain('const updateStep = (id, status, message = null) => {');
    expect(script).toContain('helpers,');
    expect(script).toContain("if (helpers && typeof helpers.click === 'function') {");
  });

  it('buildTraderaCheckStatusScript keeps seller-section misses uncertain unless removal is directly verified', () => {
    const script = buildTraderaCheckStatusScript();

    expect(script).toContain('const directVerification = await verifyDirectListingStatus();');
    expect(script).toContain("status: 'unknown'");
    expect(script).toContain("matchStrategy: 'direct-listing-page-missing'");
    expect(script).not.toContain('isLikelyDuplicateMatchByText');
    expect(script).not.toContain('via fallback candidate recovery from visible listing text.');
    expect(script).not.toContain(
      'so it was treated as removed.'
    );
  });

  it('ignores non-exact active matches, continues into sold and unsold, and uses helper-driven interactions', async () => {
    vi.useFakeTimers();

    const selectorRuntime = `
const COOKIE_ACCEPT_SELECTORS = [];
const ACTIVE_TAB_STATE_SELECTORS = [];
const SOLD_TAB_STATE_SELECTORS = [];
const UNSOLD_TAB_STATE_SELECTORS = [];
const ACTIVE_SEARCH_SELECTORS = ['section-search'];
const ACTIVE_SEARCH_SUBMIT_SELECTORS = [];
const DUPLICATE_DESCRIPTION_TEXT_SELECTORS = ['description-root'];
const GLOBAL_HEADER_SEARCH_HINTS = [];
const ACTIVE_SEARCH_TRIGGER_LABELS = [];
`;

    const script = buildTraderaCheckStatusScript(selectorRuntime);
    const parsed = parseUserScript(script, []);

    type SectionView = 'active' | 'sold' | 'unsold' | 'listing-unsold';
    type LocatorKind = 'search-input' | 'candidate' | 'tab-trigger' | 'description' | 'empty';

    const sectionUrls: Record<'active' | 'sold' | 'unsold', string> = {
      active: 'https://www.tradera.com/en/my/listings',
      sold: 'https://www.tradera.com/en/my/sold',
      unsold: 'https://www.tradera.com/en/my/listings?tab=unsold',
    };

    class FakeLocator {
      readonly kind: LocatorKind;
      readonly data: Record<string, unknown>;
      private readonly page: FakePage;

      constructor(page: FakePage, kind: LocatorKind, data: Record<string, unknown> = {}) {
        this.page = page;
        this.kind = kind;
        this.data = data;
      }

      first() {
        return this;
      }

      nth(index: number) {
        return index === 0 ? this : this.page.emptyLocator;
      }

      async count() {
        return this.kind === 'empty' ? 0 : 1;
      }

      async isVisible() {
        return this.kind !== 'empty';
      }

      async evaluate(_fn: unknown) {
        if (this.kind === 'search-input') {
          const fnSource = String(_fn ?? '');
          if (fnSource.includes('getAttribute')) {
            return {
              name: '',
              aria: '',
              placeholder: '',
              insideHeader: false,
            };
          }
          return String(this.data.value ?? '');
        }

        if (this.kind === 'candidate') {
          return {
            href: this.data.href ?? '',
            text: this.data.text ?? '',
            containerText: this.data.text ?? '',
            titleText: this.data.title ?? '',
            statusBadgeText: this.data.statusBadgeText ?? '',
            statusContextText: this.data.statusContextText ?? '',
          };
        }

        if (this.kind === 'tab-trigger') {
          return false;
        }

        return this.data.value ?? this.data.text ?? '';
      }

      async click() {
        if (this.kind === 'tab-trigger') {
          const targetView = this.data.view as SectionView | undefined;
          const targetUrl = this.data.url as string | undefined;
          if (targetView && targetUrl) {
            this.page.setView(targetView, targetUrl);
          }
        }
      }

      async fill(value: string) {
        this.data.value = value;
      }

      async focus() {
        return undefined;
      }

      async scrollIntoViewIfNeeded() {
        return undefined;
      }

      async innerText() {
        return String(this.data.text ?? '');
      }
    }

    class FakeLocatorCollection {
      private readonly items: FakeLocator[];
      private readonly page: FakePage;

      constructor(page: FakePage, items: FakeLocator[] = []) {
        this.page = page;
        this.items = items;
      }

      first() {
        return this.items[0] ?? this.page.emptyLocator;
      }

      nth(index: number) {
        return this.items[index] ?? this.page.emptyLocator;
      }

      async count() {
        return this.items.length;
      }

      filter() {
        return this;
      }
    }

    class FakePage {
      currentUrl = sectionUrls.active;
      currentView: SectionView = 'active';
      visits: SectionView[] = ['active'];
      emptyLocator = new FakeLocator(this, 'empty');
      keyboard = {
        press: vi.fn(async () => undefined),
      };

      private readonly searchInputs = {
        active: new FakeLocator(this, 'search-input', { value: '' }),
        sold: new FakeLocator(this, 'search-input', { value: '' }),
        unsold: new FakeLocator(this, 'search-input', { value: '' }),
      };

      private readonly candidates = {
        active: [
          new FakeLocator(this, 'candidate', {
            href: 'https://www.tradera.com/item/111',
            title: 'Example title extra',
            text: 'Example title extra active listing',
            statusBadgeText: 'active',
            statusContextText: 'active',
          }),
        ],
        sold: [] as FakeLocator[],
        unsold: [
          new FakeLocator(this, 'candidate', {
            href: 'https://www.tradera.com/item/222',
            title: 'Example title',
            text: 'Example title unsold listing',
            statusBadgeText: 'ended',
            statusContextText: 'ended',
          }),
        ],
      };

      private readonly tabLocators = new Map<string, FakeLocator>([
        ['Your sold items', new FakeLocator(this, 'tab-trigger', { view: 'sold', url: sectionUrls.sold })],
        ['Sold items', new FakeLocator(this, 'tab-trigger', { view: 'sold', url: sectionUrls.sold })],
        ['Sold', new FakeLocator(this, 'tab-trigger', { view: 'sold', url: sectionUrls.sold })],
        ['Unsold items', new FakeLocator(this, 'tab-trigger', { view: 'unsold', url: sectionUrls.unsold })],
        ['Unsold', new FakeLocator(this, 'tab-trigger', { view: 'unsold', url: sectionUrls.unsold })],
      ]);

      setView(view: SectionView, url: string) {
        this.currentView = view;
        this.currentUrl = url;
        this.visits.push(view);
      }

      async goto(url: string) {
        if (url.includes('/my/sold')) {
          this.setView('sold', sectionUrls.sold);
        } else if (url.includes('tab=unsold')) {
          this.setView('unsold', sectionUrls.unsold);
        } else if (url.includes('/my/listings')) {
          this.setView('active', sectionUrls.active);
        } else if (url.includes('/item/222')) {
          this.setView('listing-unsold', 'https://www.tradera.com/item/222');
        } else {
          this.currentUrl = url;
        }

        return {
          status: () => 200,
        };
      }

      url() {
        return this.currentUrl;
      }

      async waitForLoadState() {
        return undefined;
      }

      locator(selector: string) {
        if (selector === 'section-search') {
          if (this.currentView === 'active' || this.currentView === 'sold' || this.currentView === 'unsold') {
            return new FakeLocatorCollection(this, [this.searchInputs[this.currentView]]);
          }
          return new FakeLocatorCollection(this, []);
        }

        if (selector === 'a[href*="/item/"], a[href*="/listing/"]') {
          if (this.currentView === 'active' || this.currentView === 'sold' || this.currentView === 'unsold') {
            return new FakeLocatorCollection(this, this.candidates[this.currentView]);
          }
          return new FakeLocatorCollection(this, []);
        }

        if (selector === 'description-root') {
          if (this.currentView === 'listing-unsold') {
            return new FakeLocatorCollection(this, [
              new FakeLocator(this, 'description', {
                text: 'Example description | Product ID: BASE-1',
              }),
            ]);
          }
          return new FakeLocatorCollection(this, []);
        }

        return new FakeLocatorCollection(this, []);
      }

      getByRole(_role: string, options?: { name?: string | RegExp }) {
        if (typeof options?.name === 'string') {
          const locator = this.tabLocators.get(options.name);
          if (locator) {
            return new FakeLocatorCollection(this, [locator]);
          }
        }

        return new FakeLocatorCollection(this, []);
      }

      async evaluate(_fn: unknown, args?: Record<string, unknown>) {
        if (args && 'currentUrl' in args) {
          return null;
        }
        return {
          title: '',
          headings: '',
          bodyText: '',
        };
      }
    }

    const page = new FakePage();
    const helperClickMock = vi.fn(async (target: FakeLocator) => {
      await target.click();
    });
    const helperFillMock = vi.fn(async (target: FakeLocator, value: string) => {
      await target.fill(value);
    });
    const helperPressMock = vi.fn(async () => undefined);
    const emissions: Array<{ event: string; payload: Record<string, unknown> }> = [];

    const runPromise = parsed({
      page,
      input: {
        listingUrl: 'https://www.tradera.com/item/222',
        externalListingId: '222',
        searchTitle: 'Example title',
        duplicateSearchTitle: 'Example title',
        rawDescriptionEn: 'Example description',
        baseProductId: 'BASE-1',
      },
      emit: (event: string, payload: Record<string, unknown>) => {
        emissions.push({ event, payload });
      },
      log: () => undefined,
      helpers: {
        click: helperClickMock,
        fill: helperFillMock,
        press: helperPressMock,
      },
    });

    await vi.runAllTimersAsync();
    await runPromise;

    const finalResult = emissions.filter((entry) => entry.event === 'result').at(-1)?.payload;
    expect(finalResult).toMatchObject({
      status: 'ended',
      verificationSection: 'unsold',
      verificationMatchStrategy: 'title+description',
      externalListingId: '222',
    });

    const executionSteps = (finalResult?.executionSteps ?? []) as Array<{
      id: string;
      message?: string | null;
      status?: string;
    }>;
    expect(executionSteps.find((step) => step.id === 'search_active')).toMatchObject({
      status: 'success',
      message: expect.stringContaining('Ignored 1 visible non-exact candidate'),
    });
    expect(executionSteps.find((step) => step.id === 'search_sold')).toMatchObject({
      status: 'success',
    });
    expect(executionSteps.find((step) => step.id === 'search_unsold')).toMatchObject({
      status: 'success',
    });
    expect(page.visits).toEqual(
      expect.arrayContaining(['active', 'sold', 'unsold', 'listing-unsold'])
    );
    expect(helperClickMock).toHaveBeenCalled();
    expect(helperFillMock).toHaveBeenCalled();
    expect(helperPressMock).toHaveBeenCalled();
    expect(page.keyboard.press).not.toHaveBeenCalled();
  });
});
