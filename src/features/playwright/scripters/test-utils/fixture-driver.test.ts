import { describe, expect, it } from 'vitest';

import { createFixtureDriver } from './fixture-driver';

const SHOP_HTML = `
  <html>
    <head>
      <script type="application/ld+json">
        { "@type": "Product", "name": "Widget", "offers": { "price": "19.99", "priceCurrency": "PLN" } }
      </script>
    </head>
    <body>
      <ul class="products">
        <li class="product"><h2>Alpha</h2><span class="price">10</span></li>
        <li class="product"><h2>Beta</h2><span class="price">20</span></li>
      </ul>
      <a class="next" href="/page/2">Next</a>
    </body>
  </html>
`;

const PAGE_2_HTML = `
  <html><body>
    <ul class="products">
      <li class="product"><h2>Gamma</h2><span class="price">30</span></li>
    </ul>
  </body></html>
`;

describe('createFixtureDriver', () => {
  it('extracts JSON-LD from the active page', async () => {
    const driver = createFixtureDriver({
      pages: [{ url: 'https://shop.example/products', html: SHOP_HTML }],
      initialUrl: 'https://shop.example/products',
    });
    const ld = await driver.extractJsonLd();
    expect(ld).toHaveLength(1);
    expect((ld[0] as { name: string }).name).toBe('Widget');
  });

  it('extracts list rows by selector', async () => {
    const driver = createFixtureDriver({
      pages: [{ url: 'https://shop.example/products', html: SHOP_HTML }],
      initialUrl: 'https://shop.example/products',
    });
    const rows = await driver.extractList('.product', {
      title: { selector: 'h2' },
      price: { selector: '.price' },
    });
    expect(rows.map((r) => r['title'])).toEqual(['Alpha', 'Beta']);
    expect(rows.map((r) => r['price'])).toEqual(['10', '20']);
  });

  it('navigates between fixture pages on goto', async () => {
    const driver = createFixtureDriver({
      pages: [
        { url: 'https://shop.example/products', html: SHOP_HTML },
        { url: 'https://shop.example/page/2', html: PAGE_2_HTML },
      ],
      initialUrl: 'https://shop.example/products',
    });
    await driver.goto('https://shop.example/page/2');
    const rows = await driver.extractList('.product', { title: { selector: 'h2' } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!['title']).toBe('Gamma');
  });

  it('tryClick resolves anchor hrefs when the option is set', async () => {
    const driver = createFixtureDriver({
      pages: [
        { url: 'https://shop.example/products', html: SHOP_HTML },
        { url: 'https://shop.example/page/2', html: PAGE_2_HTML },
      ],
      initialUrl: 'https://shop.example/products',
      onClickResolveHref: true,
    });
    const clicked = await driver.tryClick(['a.next']);
    expect(clicked).toBe('a.next');
    expect(await driver.currentUrl()).toBe('https://shop.example/page/2');
  });

  it('tryClick returns null when no selector matches', async () => {
    const driver = createFixtureDriver({
      pages: [{ url: 'https://shop.example/products', html: SHOP_HTML }],
      initialUrl: 'https://shop.example/products',
    });
    expect(await driver.tryClick(['.nope'])).toBeNull();
  });

  it('attribute extraction via the field spec', async () => {
    const driver = createFixtureDriver({
      pages: [{ url: 'https://shop.example/products', html: SHOP_HTML }],
      initialUrl: 'https://shop.example/products',
    });
    const rows = await driver.extractList('a.next', {
      href: { attribute: 'href' },
    });
    expect(rows[0]!['href']).toBe('/page/2');
  });
});
