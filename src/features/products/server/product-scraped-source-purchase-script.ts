import 'server-only';

export const SCRAPED_SOURCE_PURCHASE_SCRIPT = `
export default async function run({ page, input, emit, log, helpers }) {
  const readText = (value) => (typeof value === 'string' ? value.trim() : '');
  const sourceUrl = readText(input.sourceUrl);
  const username = readText(input.username);
  const password = readText(input.password);
  const submitOrder = input.submitOrder === true && input.purchaseConfirmation === 'SUBMIT_ORDER';
  const steps = [];

  const record = async (id, status, details = {}) => {
    const entry = {
      id,
      status,
      url: page.url(),
      at: new Date().toISOString(),
      ...details,
    };
    steps.push(entry);
    log('[scraped-source-purchase] ' + id + ': ' + status);
    await emit('purchaseStep', entry);
  };

  const isVisible = async (locator) => {
    try {
      return await locator.first().isVisible({ timeout: 750 });
    } catch {
      return false;
    }
  };

  const clickFirstVisible = async (candidates, stepId) => {
    for (const selector of candidates) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        if (!(await isVisible(candidate))) continue;
        try {
          await candidate.click({ timeout: 4000 });
          await helpers.sleep(500);
          await record(stepId, 'clicked', { selector, index });
          return selector;
        } catch (error) {
          await record(stepId, 'click_blocked', {
            selector,
            index,
            error: error instanceof Error ? error.message : String(error),
          });
          try {
            await candidate.dispatchEvent('click');
            await helpers.sleep(500);
            await record(stepId, 'dispatched', { selector, index });
            return selector;
          } catch {
            continue;
          }
        }
      }
    }
    await record(stepId, 'not_found');
    return null;
  };

  const fillFirstVisible = async (candidates, value, stepId) => {
    for (const selector of candidates) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        if (!(await isVisible(candidate))) continue;
        await candidate.fill(value);
        await record(stepId, 'filled', { selector, index });
        return selector;
      }
    }
    await record(stepId, 'not_found');
    return null;
  };

  const maybeDismissConsent = async () => {
    await clickFirstVisible(
      [
        'consents-accept-all',
        'consents-accept-necessary',
        'consents-save',
        '[role="button"]:has-text("Zaakceptuj wszystkie")',
        '[role="button"]:has-text("Zaakceptuj tylko niezbędne")',
        '[role="button"]:has-text("Zapisz ustawienia")',
        'button:has-text("Akceptuj")',
        'button:has-text("Zgadzam")',
        'button:has-text("Accept")',
        'button:has-text("OK")',
        'a:has-text("Akceptuj")',
      ],
      'consent'
    );
  };

  const ensureLogin = async () => {
    if (!username || !password) {
      await record('login', 'skipped_no_credentials');
      return;
    }

    const fillLoginForm = async () => {
      const usernameSelector = await fillFirstVisible(
        [
          'input[type="email"]',
          'input[name="email"]',
          'input[name="mail"]',
          'input[name="login"]',
          'input[name="username"]',
          'input[name="user_login"]',
          '#email',
          '#mail',
          '#login',
          'input[type="text"]',
        ],
        username,
        'login_username'
      );
      const passwordSelector = await fillFirstVisible(
        ['input[type="password"]', 'input[name="password"]', '#password', '#pass'],
        password,
        'login_password'
      );
      return { usernameSelector, passwordSelector };
    };

    if (!(await isVisible(page.locator('input[type="password"]')))) {
      await clickFirstVisible(
        [
          'a[href*="/login"]',
          'a[href*="/pl/login"]',
          'a:has-text("Zaloguj")',
          'a:has-text("Logowanie")',
          'login-modal-opener',
          '[aria-label="Zaloguj się"]',
          '[aria-label="Zaloguj sie"]',
          '.user-menu:has-text("Zaloguj")',
          'button:has-text("Zaloguj")',
          'button:has-text("Logowanie")',
        ],
        'login_open'
      );
      await helpers.sleep(1000);
      await maybeDismissConsent();
    }

    let { usernameSelector, passwordSelector } = await fillLoginForm();
    if (!usernameSelector || !passwordSelector) {
      const loginUrl = new URL('/pl/login', sourceUrl).toString();
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await helpers.sleep(750);
      await maybeDismissConsent();
      await record('login_page_open', 'completed', { loginUrl });
      ({ usernameSelector, passwordSelector } = await fillLoginForm());
    }

    if (!usernameSelector || !passwordSelector) {
      await record('login', 'form_not_available');
      return;
    }

    await clickFirstVisible(
      [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Zaloguj się")',
        'input[type="submit"][value*="Zaloguj" i]',
        'button:has-text("Zaloguj")',
        'button:has-text("Login")',
      ],
      'login_submit'
    );
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await helpers.sleep(1000);
    await record('login', 'submitted');
  };

  if (!sourceUrl) throw new Error('Scraped source purchase requires sourceUrl.');
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded' });
  await record('source_open', 'completed', { sourceUrl });
  await maybeDismissConsent();
  await ensureLogin();

  if (page.url() !== sourceUrl) {
    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded' });
    await record('source_reopen', 'completed');
  }

  const addToCartSelector = await clickFirstVisible(
    [
      'button[name="add-to-cart"]',
      'button:has-text("Dodaj do koszyka")',
      'button[type="submit"]:has-text("Do koszyka")',
      'button:has-text("Do koszyka")',
      'input[type="submit"][value*="koszyka" i]',
      'buy-button button',
      '.addtobasket button',
      '.product-actions__add-to-basket button',
      '.basket button[type="submit"]',
      'form[action*="basket"] button[type="submit"]',
    ],
    'add_to_cart'
  );
  if (!addToCartSelector) {
    throw new Error('Could not find an add-to-cart control on the scraped source page.');
  }

  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await helpers.sleep(1000);
  await clickFirstVisible(
    [
      'a[href*="/basket"]',
      'a:has-text("Przejdz do koszyka")',
      'a:has-text("Przejdź do koszyka")',
      'button:has-text("Przejdz do koszyka")',
      'button:has-text("Przejdź do koszyka")',
      'a:has-text("Koszyk")',
    ],
    'basket_open'
  );

  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await helpers.sleep(1000);
  await clickFirstVisible(
    [
      'a[href*="/checkout"]',
      'a[href*="/basket/step2"]',
      'a[aria-label*="Następny krok"]',
      'a:has-text("Zamawiam")',
      'a:has-text("Do kasy")',
      'a:has-text("wybór dostawy")',
      'a:has-text("Przejdz do kasy")',
      'a:has-text("Przejdź do kasy")',
      'button:has-text("Zamawiam")',
      'button:has-text("Do kasy")',
    ],
    'checkout_open'
  );

  if (submitOrder) {
    await clickFirstVisible(
      [
        'button:has-text("Kupuję i płacę")',
        'button:has-text("Kupuje i place")',
        'button:has-text("Zamawiam i płacę")',
        'button:has-text("Potwierdzam zakup")',
        'input[type="submit"][value*="płac" i]',
        'input[type="submit"][value*="place" i]',
      ],
      'order_submit'
    );
  } else {
    await record('order_submit', 'skipped_manual_review');
  }

  const result = {
    productId: readText(input.productId),
    listingId: readText(input.listingId),
    sourceUrl,
    finalUrl: page.url(),
    status: submitOrder ? 'submitted_or_attempted' : 'checkout_review',
    orderSubmitted: submitOrder,
    steps,
  };
  await emit('result', result);
  return result;
}
`;
