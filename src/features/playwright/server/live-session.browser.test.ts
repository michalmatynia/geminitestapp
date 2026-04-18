import { createServer, type Server } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';

import {
  pickElementAt,
  probeLiveScripterDom,
  readSettledLiveScripterPageTitle,
} from './live-session';

const renderFixtureHtml = ({
  pageTitle,
  heading,
  price,
  description,
  nextHref,
}: {
  pageTitle: string;
  heading: string;
  price: string;
  description: string;
  nextHref?: string;
}) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${pageTitle}</title>
    <style>
      body {
        margin: 0;
        font-family: system-ui, sans-serif;
        min-height: 2200px;
        background: #ffffff;
      }
      main {
        padding: 32px;
      }
      .stack {
        display: grid;
        gap: 16px;
        max-width: 480px;
      }
      button,
      input {
        font: inherit;
      }
      button {
        width: fit-content;
        padding: 10px 16px;
      }
      input {
        padding: 10px 12px;
        border: 1px solid #cbd5e1;
      }
      .spacer {
        height: 1600px;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="stack">
        <h1 id="fixture-title">${heading}</h1>
        <div class="product-meta">
          <span class="fixture-price">${price}</span>
          <img
            id="fixture-image"
            src="https://example.com/product.jpg"
            alt="Fixture image"
            width="120"
            height="120"
          />
          <p id="fixture-description">
            ${description}
          </p>
        </div>
        ${
          typeof nextHref === 'string'
            ? `<a id="next-item-link" href="${nextHref}">Next fixture item</a>`
            : ''
        }
        <button id="submit-action" data-testid="submit-action" type="button">Submit now</button>
        <label for="title-field">Title</label>
        <input
          id="title-field"
          data-testid="title-field"
          type="text"
          placeholder="Type here"
          aria-label="Product title"
        />
        <p id="status" role="status">idle</p>
      </div>
      <div class="spacer"></div>
    </main>
    <script>
      window.setTimeout(() => {
        document.title = ${JSON.stringify(pageTitle)};
      }, 120);
      const status = document.getElementById('status');
      const button = document.getElementById('submit-action');
      button.addEventListener('click', () => {
        status.textContent = 'clicked';
      });
    </script>
  </body>
</html>`;

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const startFixtureServer = async (): Promise<{ server: Server; url: string }> => {
  const server = createServer((request, response) => {
    response.statusCode = 200;
    response.setHeader('content-type', 'text/html; charset=utf-8');
    if (request.url === '/item-2') {
      response.end(
        renderFixtureHtml({
          pageTitle: 'Live Scripter Fixture 2',
          heading: 'Live Scripter Fixture 2',
          price: '$189.00',
          description:
            'This second fixture page gives the DOM probe a bounded same-origin traversal target.',
        })
      );
      return;
    }
    response.end(
      renderFixtureHtml({
        pageTitle: 'Live Scripter Fixture',
        heading: 'Live Scripter Fixture',
        price: '$129.00',
        description:
          'This fixture description is intentionally long enough to trigger description probing and mapper hinting in the live scripter DOM probe path.',
        nextHref: '/item-2',
      })
    );
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Fixture server did not expose a TCP address.');
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}/`,
  };
};

const getCenterPoint = (box: { x: number; y: number; width: number; height: number }) => ({
  x: Math.round(box.x + box.width / 2),
  y: Math.round(box.y + box.height / 2),
});

describe('live-session browser smoke', () => {
  let browser: Browser | null = null;
  let server: Server | null = null;

  afterEach(async () => {
    if (browser !== null) {
      await browser.close();
      browser = null;
    }
    if (server !== null) {
      await closeServer(server);
      server = null;
    }
  });

  it('picks stable selectors and reflects real browser interaction on a local fixture page', async () => {
    const fixture = await startFixtureServer();
    server = fixture.server;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(fixture.url, { waitUntil: 'domcontentloaded' });
    await expect(readSettledLiveScripterPageTitle(page)).resolves.toBe('Live Scripter Fixture');

    const buttonBox = await page.locator('#submit-action').boundingBox();
    expect(buttonBox).not.toBeNull();
    const buttonCenter = getCenterPoint(buttonBox as { x: number; y: number; width: number; height: number });

    await page.evaluate(() => {
      const overlay = document.createElement('div');
      overlay.id = 'busy-shell-overlay';
      overlay.setAttribute('aria-busy', 'true');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '9999';
      overlay.style.background = 'rgba(255, 255, 255, 0.01)';
      document.body.append(overlay);
    });

    const pickedButton = await pickElementAt(page, buttonCenter.x, buttonCenter.y);
    expect(pickedButton).toMatchObject({
      tag: 'button',
      id: 'submit-action',
      role: 'button',
      textPreview: 'Submit now',
      attrs: {
        id: 'submit-action',
        'data-testid': 'submit-action',
        type: 'button',
      },
      candidates: {
        css: '#submit-action',
        role: 'button',
        text: 'Submit now',
        testId: 'submit-action',
      },
    });

    await page.evaluate(() => {
      document.getElementById('busy-shell-overlay')?.remove();
    });

    await page.mouse.click(buttonCenter.x, buttonCenter.y);
    expect(await page.locator('#status').textContent()).toBe('clicked');

    const inputBox = await page.locator('#title-field').boundingBox();
    expect(inputBox).not.toBeNull();
    const inputCenter = getCenterPoint(inputBox as { x: number; y: number; width: number; height: number });

    const pickedInput = await pickElementAt(page, inputCenter.x, inputCenter.y);
    expect(pickedInput).toMatchObject({
      tag: 'input',
      id: 'title-field',
      role: 'textbox',
      attrs: {
        id: 'title-field',
        'data-testid': 'title-field',
        type: 'text',
        placeholder: 'Type here',
        'aria-label': 'Product title',
      },
      candidates: {
        css: '#title-field',
        role: 'textbox',
        testId: 'title-field',
      },
    });

    await page.mouse.click(inputCenter.x, inputCenter.y);
    await page.keyboard.type('Live typed value');
    expect(await page.inputValue('#title-field')).toBe('Live typed value');

    await page.mouse.move(200, 200);
    await page.mouse.wheel(0, 900);
    await page.waitForFunction(() => window.scrollY > 0);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  }, 30_000);

  it('probes the current page and classifies content selectors with mapper hints', async () => {
    const fixture = await startFixtureServer();
    server = fixture.server;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(fixture.url, { waitUntil: 'domcontentloaded' });

    const result = await probeLiveScripterDom(page, {
      scope: 'main_content',
      maxNodes: 24,
      sameOriginOnly: true,
      linkDepth: 1,
      maxPages: 2,
    });

    expect(result.type).toBe('probe_result');
    expect(result.scannedPages).toBe(2);
    expect(result.pages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Live Scripter Fixture',
        }),
        expect.objectContaining({
          title: 'Live Scripter Fixture 2',
        }),
      ])
    );
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pageTitle: 'Live Scripter Fixture',
          classificationRole: 'content_title',
          draftTargetHints: ['name_en'],
          textPreview: 'Live Scripter Fixture',
        }),
        expect.objectContaining({
          pageTitle: 'Live Scripter Fixture',
          classificationRole: 'content_price',
          draftTargetHints: ['price'],
          textPreview: expect.stringContaining('$129.00'),
        }),
        expect.objectContaining({
          pageTitle: 'Live Scripter Fixture',
          classificationRole: 'content_image',
          draftTargetHints: ['imageLinks'],
        }),
        expect.objectContaining({
          pageTitle: 'Live Scripter Fixture 2',
          classificationRole: 'content_price',
          draftTargetHints: ['price'],
          textPreview: expect.stringContaining('$189.00'),
        }),
      ])
    );
  }, 30_000);
});
