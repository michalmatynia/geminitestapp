/**
 * Tradera listing status-check script.
 *
 * Navigates to a Tradera listing URL and reads the current listing status
 * (active, ended, sold, unsold, removed) from the page.
 *
 * Returns via emit('result', { status, listingUrl, externalListingId, publishVerified: false })
 */
export const TRADERA_CHECK_STATUS_SCRIPT = String.raw`export default async function run({
  page,
  input,
  emit,
  log,
}) {
  const listingUrl = input?.listingUrl;
  const externalListingId = input?.externalListingId ?? null;
  const executionSteps = [
    {
      id: 'open_listing',
      label: 'Open listing page',
      status: 'pending',
      message: null,
    },
    {
      id: 'accept_cookies',
      label: 'Handle cookie consent',
      status: 'pending',
      message: null,
    },
    {
      id: 'detect_status',
      label: 'Detect listing status',
      status: 'pending',
      message: null,
    },
  ];
  const updateStep = (id, status, message) => {
    const step = executionSteps.find((candidate) => candidate.id === id);
    if (!step) return;
    step.status = status;
    step.message = typeof message === 'string' && message.trim() ? message.trim() : null;
  };

  if (!listingUrl) {
    updateStep('open_listing', 'error', 'No listing URL was provided.');
    updateStep('accept_cookies', 'skipped', 'Skipped because the listing page could not be opened.');
    updateStep('detect_status', 'skipped', 'Skipped because the listing page could not be opened.');
    emit('result', {
      publishVerified: false,
      status: 'unknown',
      error: 'No listing URL provided',
      executionSteps,
    });
    return;
  }

  const COOKIE_SELECTORS = [
    '#onetrust-accept-btn-handler',
    'button:has-text("Acceptera alla cookies")',
    'button:has-text("Acceptera alla kakor")',
    'button:has-text("Acceptera alla")',
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept all")',
    'button:has-text("Godkänn alla")',
  ];

  const acceptCookies = async () => {
    let accepted = false;
    for (const sel of COOKIE_SELECTORS) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await btn.click({ timeout: 2000 }).catch(() => undefined);
          accepted = true;
          break;
        }
      } catch { /* ignore */ }
    }
    updateStep(
      'accept_cookies',
      'success',
      accepted
        ? 'Accepted the visible cookie consent prompt.'
        : 'No blocking cookie consent prompt was detected.'
    );
    if (log) {
      log('tradera.check_status.cookies_handled', {
        accepted,
      });
    }
  };

  try {
    if (log) log('tradera.check_status.start', { listingUrl, externalListingId });
    const response = await page.goto(listingUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const finalUrl = page.url();
    const statusCode = response?.status() ?? 200;
    updateStep('open_listing', 'success', 'Listing page opened successfully.');
    if (log) {
      log('tradera.check_status.page_loaded', {
        finalUrl,
        statusCode,
      });
    }

    if (statusCode === 404) {
      updateStep('accept_cookies', 'skipped', 'Skipped because Tradera returned 404.');
      updateStep('detect_status', 'success', 'Tradera returned 404, so the listing was treated as removed.');
      if (log) {
        log('tradera.check_status.status_detected', {
          status: 'removed',
          reason: 'http-404',
          finalUrl,
        });
      }
      emit('result', {
        publishVerified: false,
        listingUrl: finalUrl,
        externalListingId,
        status: 'removed',
        executionSteps,
      });
      return;
    }

    await acceptCookies();
    await page.waitForTimeout(1200).catch(() => undefined);

    const rawText = await page.textContent('body').catch(() => '');
    const t = (rawText ?? '').toLowerCase();

    let status = 'unknown';

    // Active: bid/buy buttons present
    const ACTIVE_SELECTORS = [
      'button:has-text("Lägg bud")',
      'button:has-text("Köp nu")',
      'button:has-text("Place bid")',
      'button:has-text("Buy now")',
      '[data-test-id="place-bid-button"]',
      '[data-test-id="buy-now-button"]',
      '[data-testid="place-bid"]',
      '[data-testid="buy-now"]',
    ];

    let isActive = false;
    for (const sel of ACTIVE_SELECTORS) {
      try {
        if (await page.locator(sel).first().isVisible({ timeout: 500 }).catch(() => false)) {
          isActive = true;
          break;
        }
      } catch { /* ignore */ }
    }

    if (isActive) {
      status = 'active';
    } else if (
      t.includes('såldes för') ||
      t.includes('köptes för') ||
      t.includes('vinnare:') ||
      t.includes('vinnaren:') ||
      t.includes('item sold') ||
      t.includes('sold for')
    ) {
      status = 'sold';
    } else if (
      t.includes('avslutades utan bud') ||
      t.includes('inga bud lämnades') ||
      t.includes('inga bud') && t.includes('avslut')
    ) {
      status = 'unsold';
    } else if (
      t.includes('auktionen har avslutats') ||
      t.includes('auktionen är avslutad') ||
      t.includes('auktionen avslutades') ||
      t.includes('avslutad auktion') ||
      t.includes('auction ended') ||
      t.includes('auction has ended')
    ) {
      status = 'ended';
    } else if (t.includes('avslutad') || t.includes('ended')) {
      status = 'ended';
    }

    updateStep('detect_status', 'success', 'Resolved listing status as ' + status + '.');
    if (log) {
      log('tradera.check_status.status_detected', {
        status,
        finalUrl,
      });
      log('info', '[check-status] url=' + finalUrl + ' status=' + status);
    }

    emit('result', {
      publishVerified: false,
      listingUrl: finalUrl,
      externalListingId,
      status,
      executionSteps,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (executionSteps[0]?.status === 'pending') {
      updateStep('open_listing', 'error', msg);
      updateStep('accept_cookies', 'skipped', 'Skipped because the listing page could not be opened.');
      updateStep('detect_status', 'skipped', 'Skipped because the listing page could not be opened.');
    } else {
      if (executionSteps[1]?.status === 'pending') {
        updateStep('accept_cookies', 'error', msg);
      }
      if (executionSteps[2]?.status === 'pending') {
        updateStep('detect_status', 'error', msg);
      }
    }
    if (log) {
      log('tradera.check_status.failed', { error: msg });
      log('error', '[check-status] error: ' + msg);
    }
    emit('result', { publishVerified: false, status: 'unknown', error: msg, executionSteps });
  }
}`;
