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

  if (!listingUrl) {
    emit('result', { publishVerified: false, status: 'unknown', error: 'No listing URL provided' });
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
    for (const sel of COOKIE_SELECTORS) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await btn.click({ timeout: 2000 }).catch(() => undefined);
          break;
        }
      } catch { /* ignore */ }
    }
  };

  try {
    const response = await page.goto(listingUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const finalUrl = page.url();
    const statusCode = response?.status() ?? 200;

    if (statusCode === 404) {
      emit('result', { publishVerified: false, listingUrl: finalUrl, externalListingId, status: 'removed' });
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

    if (log) log('info', '[check-status] url=' + finalUrl + ' status=' + status);

    emit('result', {
      publishVerified: false,
      listingUrl: finalUrl,
      externalListingId,
      status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (log) log('error', '[check-status] error: ' + msg);
    emit('result', { publishVerified: false, status: 'unknown', error: msg });
  }
}`;
