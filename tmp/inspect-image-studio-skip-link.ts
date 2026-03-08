import { chromium } from 'playwright';

import { ensureAdminSession } from '../e2e/support/admin-auth.ts';
import {
  acquireRuntimeLease,
  cleanupBrokerRuntimeLeases,
} from '../scripts/testing/lib/runtime-broker.mjs';

const rootDir = process.cwd();
const agentId = process.env['AI_AGENT_ID'] || 'image-studio-skip-link-inspect';

const main = async () => {
  const runtime = await acquireRuntimeLease({
    rootDir,
    appId: 'web',
    mode: 'dev',
    agentId,
    host: '127.0.0.1',
    env: process.env,
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ baseURL: runtime.baseUrl });

  await page.addInitScript(() => {
    const events: Array<Record<string, unknown>> = [];
    const record = (type: string, detail: Record<string, unknown> = {}) => {
      events.push({
        type,
        detail,
        href: window.location.href,
        hash: window.location.hash,
        activeTag: document.activeElement?.tagName ?? null,
        activeText:
          document.activeElement instanceof HTMLElement
            ? document.activeElement.innerText || document.activeElement.textContent || null
            : null,
      });
    };

    window.addEventListener('hashchange', () => {
      record('hashchange');
    });

    document.addEventListener(
      'keydown',
      (event) => {
        record('keydown', {
          key: event.key,
          targetTag: event.target instanceof Element ? event.target.tagName : null,
          targetRole:
            event.target instanceof Element ? event.target.getAttribute('role') : null,
          targetHref:
            event.target instanceof HTMLAnchorElement ? event.target.getAttribute('href') : null,
          defaultPrevented: event.defaultPrevented,
        });
      },
      true
    );

    document.addEventListener(
      'click',
      (event) => {
        record('click', {
          targetTag: event.target instanceof Element ? event.target.tagName : null,
          targetRole:
            event.target instanceof Element ? event.target.getAttribute('role') : null,
          targetHref:
            event.target instanceof HTMLAnchorElement ? event.target.getAttribute('href') : null,
          defaultPrevented: event.defaultPrevented,
        });
      },
      true
    );

    (window as typeof window & { __skipLinkEvents?: typeof events }).__skipLinkEvents = events;
  });

  try {
    await ensureAdminSession(page, '/admin/image-studio');
    await page.locator('#app-content').waitFor({ state: 'visible', timeout: 30_000 });

    const skipLink = page.getByRole('link', { name: 'Skip to content' });
    await skipLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(750);

    const diagnostics = await page.evaluate(() => ({
      url: window.location.href,
      hash: window.location.hash,
      activeElement:
        document.activeElement instanceof HTMLElement
          ? {
              tag: document.activeElement.tagName,
              id: document.activeElement.id || null,
              text:
                document.activeElement.innerText || document.activeElement.textContent || null,
            }
          : null,
      skipLinkEvents:
        (window as typeof window & { __skipLinkEvents?: Array<Record<string, unknown>> })
          .__skipLinkEvents ?? [],
    }));

    console.log(JSON.stringify(diagnostics, null, 2));
  } finally {
    await browser.close();
    await cleanupBrokerRuntimeLeases({
      rootDir,
      appId: 'web',
      agentId,
      env: process.env,
    });
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
