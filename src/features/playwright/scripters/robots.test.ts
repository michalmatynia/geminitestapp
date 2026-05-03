import { describe, expect, it } from 'vitest';

import { crawlDelaySecondsFor, isAllowed, parseRobotsTxt } from './robots';

const SAMPLE = `
User-agent: *
Disallow: /private/
Allow: /private/public
Crawl-delay: 2

User-agent: BadBot
Disallow: /

User-agent: GoogleBot
Allow: /
Disallow: /no-index

Sitemap: https://example.com/sitemap.xml
`;

describe('parseRobotsTxt', () => {
  it('parses groups, rules, crawl-delay, and sitemaps', () => {
    const robots = parseRobotsTxt(SAMPLE);
    expect(robots.sitemaps).toEqual(['https://example.com/sitemap.xml']);
    expect(robots.groups).toHaveLength(3);
    const wildcard = robots.groups.find((g) => g.userAgents.includes('*'))!;
    expect(wildcard.crawlDelaySeconds).toBe(2);
    expect(wildcard.rules.map((r) => `${r.allow ? '+' : '-'}${r.pattern}`)).toEqual([
      '-/private/',
      '+/private/public',
    ]);
  });
});

describe('isAllowed', () => {
  const robots = parseRobotsTxt(SAMPLE);

  it('respects longest-match on allow vs disallow', () => {
    expect(isAllowed(robots, 'MyCrawler', '/private/secret')).toBe(false);
    expect(isAllowed(robots, 'MyCrawler', '/private/public/about')).toBe(true);
    expect(isAllowed(robots, 'MyCrawler', '/articles')).toBe(true);
  });

  it('matches the most specific user-agent group', () => {
    expect(isAllowed(robots, 'BadBot/1.0', '/articles')).toBe(false);
    expect(isAllowed(robots, 'GoogleBot', '/no-index/page')).toBe(false);
    expect(isAllowed(robots, 'GoogleBot', '/home')).toBe(true);
  });

  it('returns the crawl-delay for the matched group', () => {
    expect(crawlDelaySecondsFor(robots, 'OtherBot')).toBe(2);
    expect(crawlDelaySecondsFor(robots, 'GoogleBot')).toBeNull();
  });

  it('defaults to allowed when there are no matching rules', () => {
    const empty = parseRobotsTxt('');
    expect(isAllowed(empty, 'Any', '/anything')).toBe(true);
  });

  it('supports wildcard and end-of-string markers', () => {
    const robots = parseRobotsTxt(`
User-agent: *
Disallow: /*.pdf$
Disallow: /private/*/secret
`);
    expect(isAllowed(robots, 'Any', '/docs/file.pdf')).toBe(false);
    expect(isAllowed(robots, 'Any', '/docs/file.pdf.html')).toBe(true);
    expect(isAllowed(robots, 'Any', '/private/a/secret')).toBe(false);
    expect(isAllowed(robots, 'Any', '/private/ok')).toBe(true);
  });
});
