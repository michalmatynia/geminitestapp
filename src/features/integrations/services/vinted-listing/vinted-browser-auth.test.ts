import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VINTED_LISTING_FORM_URL } from './config';
import { readVintedAuthState, waitForVintedManualLogin } from './vinted-browser-auth';

const AUTH_REDIRECT_URL =
  'https://www.vinted.pl/member/signup/select_type?ref_url=%2Fitems%2Fnew';

describe('vinted-browser-auth', () => {
  let mockNow = 0;

  beforeEach(() => {
    mockNow = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not treat the bare /items/new url as logged in without visible sell-form signals', async () => {
    const page = {
      url: vi.fn(() => VINTED_LISTING_FORM_URL),
      locator: vi.fn((selector: string) => {
        const locator = {
          first: () => locator,
          isVisible: vi.fn(async () => false),
          innerText: vi.fn(async () => (selector === 'body' ? '' : '')),
        };
        return locator;
      }),
    };

    const authState = await readVintedAuthState(page as never);

    expect(authState.loggedIn).toBe(false);
    expect(authState.authRouteDetected).toBe(false);
    expect(authState.sellFormVisible).toBe(false);
  });

  it('does not treat a generic header user item as authenticated on the transient /items/new state', async () => {
    const page = {
      url: vi.fn(() => VINTED_LISTING_FORM_URL),
      locator: vi.fn((selector: string) => {
        const locator = {
          first: () => locator,
          isVisible: vi.fn(async () => selector.includes('button[aria-label*="Profile"]')),
          innerText: vi.fn(async () => (selector === 'body' ? '' : '')),
        };
        return locator;
      }),
    };

    const authState = await readVintedAuthState(page as never);

    expect(authState.successVisible).toBe(true);
    expect(authState.loggedIn).toBe(false);
  });

  it('waits through the transient /items/new state until a real logged-in signal appears', async () => {
    let phase: 'transient' | 'logged_in' = 'transient';

    const page = {
      url: vi.fn(() => VINTED_LISTING_FORM_URL),
      waitForTimeout: vi.fn(async (timeoutMs: number) => {
        mockNow += timeoutMs;
        phase = 'logged_in';
      }),
      locator: vi.fn((selector: string) => {
        const locator = {
          first: () => locator,
          innerText: vi.fn(async () => (selector === 'body' ? '' : '')),
          isVisible: vi.fn(async () => {
            if (
              selector.includes('input[name="title"]') &&
              selector.includes('input[type="file"]') &&
              selector.includes('button[type="submit"]')
            ) {
              return phase === 'logged_in';
            }
            return false;
          }),
        };
        return locator;
      }),
    };

    const authState = await waitForVintedManualLogin(page as never, 3_000);

    expect(page.waitForTimeout).toHaveBeenCalled();
    expect(authState).toEqual(
      expect.objectContaining({
        loggedIn: true,
        sellFormVisible: true,
      })
    );
  });

  it('does not return early when the transient /items/new state resolves into an auth redirect', async () => {
    let currentUrl = VINTED_LISTING_FORM_URL;

    const page = {
      url: vi.fn(() => currentUrl),
      waitForTimeout: vi.fn(async (timeoutMs: number) => {
        mockNow += timeoutMs;
        currentUrl = AUTH_REDIRECT_URL;
      }),
      locator: vi.fn((selector: string) => {
        const locator = {
          first: () => locator,
          innerText: vi.fn(async () => (selector === 'body' ? '' : '')),
          isVisible: vi.fn(async () => false),
        };
        return locator;
      }),
    };

    const authState = await waitForVintedManualLogin(page as never, 2_000);

    expect(page.waitForTimeout).toHaveBeenCalled();
    expect(authState).toBeNull();
  });
});
