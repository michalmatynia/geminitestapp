import { describe, expect, it } from 'vitest';

import { sanitizeHtmlForProbe } from './html-sanitizer';

describe('sanitizeHtmlForProbe', () => {
  it('removes script and style tags entirely', () => {
    const out = sanitizeHtmlForProbe('<div>ok<script>alert(1)</script><style>body{}</style></div>');
    expect(out).not.toMatch(/script|style/i);
    expect(out).toContain('<div>ok</div>');
  });

  it('strips inline event handlers', () => {
    const out = sanitizeHtmlForProbe('<button onclick="x()" onMouseOver=\'y\'>hi</button>');
    expect(out).not.toMatch(/onclick|onmouseover/i);
    expect(out).toContain('<button');
  });

  it('neutralizes javascript: hrefs', () => {
    const out = sanitizeHtmlForProbe('<a href="javascript:steal()">x</a>');
    expect(out).toContain('href="#"');
  });

  it('rebases relative urls against the base url', () => {
    const out = sanitizeHtmlForProbe('<img src="/img/a.png"><a href="/about">x</a>', {
      baseUrl: 'https://shop.example/',
    });
    expect(out).toContain('src="https://shop.example/img/a.png"');
    expect(out).toContain('href="https://shop.example/about"');
  });

  it('forces anchors open in new tab without referrer', () => {
    const out = sanitizeHtmlForProbe('<a href="https://shop.example/x">x</a>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it('disables form submissions', () => {
    const out = sanitizeHtmlForProbe('<form action="/submit"><input/></form>');
    expect(out).toContain('onsubmit="return false"');
  });

  it('removes srcdoc to prevent nested iframe escapes', () => {
    const out = sanitizeHtmlForProbe('<iframe srcdoc="<script>x</script>"></iframe>');
    expect(out).not.toMatch(/srcdoc/);
    expect(out).not.toMatch(/iframe/i);
  });
});
