/**
 * Shared Tradera cookie-dismissal snippet for in-page Playwright scripts.
 *
 * Returns a string of JavaScript intended to be inlined into a script that
 * already has the following identifiers in scope:
 *   - `page` (Playwright Page)
 *   - `wait` (ms => Promise<void>)
 *   - `helpers` (optional Playwright helpers; falls back to direct calls)
 *   - `log` (optional structured logger; falls back to no-op)
 *   - `COOKIE_ACCEPT_SELECTORS` (from the Tradera selector registry runtime)
 *
 * Defines a single function `dismissCookiesIfPresent({ context, attempts })`
 * that returns whether any banner was dismissed. Multi-attempt + role-name
 * fallback + DOM-level click fallback, matching the proven status-check flow.
 */
export const TRADERA_COOKIE_DISMISSAL_SNIPPET = String.raw`
  const __COOKIE_ROLE_NAME_PATTERNS = [
    /accept all cookies/i,
    /allow all cookies/i,
    /allow all/i,
    /accept all/i,
    /^accept$/i,
    /acceptera alla cookies/i,
    /acceptera alla kakor/i,
    /acceptera alla/i,
    /^acceptera$/i,
    /godkänn alla cookies/i,
    /godkänn alla/i,
    /^godkänn$/i,
    /tillåt alla cookies/i,
    /tillåt alla/i,
  ];

  const __cookieDirectClick = async (locator) => {
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    try {
      if (typeof helpers !== 'undefined' && helpers && typeof helpers.click === 'function') {
        await helpers.click(locator, { clickOptions: { timeout: 2_000 } });
      } else {
        await locator.click({ timeout: 2_000 });
      }
      return true;
    } catch {
      return locator
        .evaluate((element) => {
          if (element instanceof HTMLElement) {
            element.click();
            return true;
          }
          return false;
        })
        .catch(() => false);
    }
  };

  const __cookieTryVisibleCandidates = async (locator, selector) => {
    const count = await locator.count().catch(() => 0);
    const candidateCount = Math.min(count, 8);
    for (let index = 0; index < candidateCount; index += 1) {
      const candidate = locator.nth(index);
      const visible = await candidate.isVisible().catch(() => false);
      if (!visible) continue;
      const clicked = await __cookieDirectClick(candidate);
      if (!clicked) continue;
      return String(selector) + '[' + String(index) + ']';
    }
    return null;
  };

  const dismissCookiesIfPresent = async ({ context = 'tradera', attempts = 2 } = {}) => {
    let dismissedAny = false;

    for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
      let dismissedInAttempt = false;

      for (const selector of COOKIE_ACCEPT_SELECTORS) {
        const matchedSelector = await __cookieTryVisibleCandidates(
          page.locator(selector),
          selector
        );
        if (!matchedSelector) continue;

        dismissedAny = true;
        dismissedInAttempt = true;
        if (typeof log === 'function') {
          log('tradera.cookie_dismiss', {
            context,
            attempt,
            selector: matchedSelector,
            currentUrl: page.url(),
          });
        }
        await wait(700);
        break;
      }

      if (!dismissedInAttempt) {
        for (const roleNamePattern of __COOKIE_ROLE_NAME_PATTERNS) {
          const matchedSelector = await __cookieTryVisibleCandidates(
            page.getByRole('button', { name: roleNamePattern }),
            'role=button:' + String(roleNamePattern)
          );
          if (!matchedSelector) continue;

          dismissedAny = true;
          dismissedInAttempt = true;
          if (typeof log === 'function') {
            log('tradera.cookie_dismiss', {
              context,
              attempt,
              selector: matchedSelector,
              currentUrl: page.url(),
            });
          }
          await wait(700);
          break;
        }
      }

      if (!dismissedInAttempt) break;
    }

    return dismissedAny;
  };
`;
