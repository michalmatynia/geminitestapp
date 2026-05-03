import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/features/playwright/server/instances', () => ({
  createCustomPlaywrightInstance: () => ({}),
}));
vi.mock('@/features/playwright/server/runtime', () => ({
  runPlaywrightEngineTask: vi.fn(),
}));
vi.mock('@/shared/lib/db/mongo-client', () => ({ getMongoDb: vi.fn() }));
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: { captureException: vi.fn() },
}));
vi.mock('./filemaker-email-repository', () => ({
  FILEMAKER_EMAIL_LINKS_COLLECTION: 'x',
  FILEMAKER_EMAILS_COLLECTION: 'x',
  ensureMongoFilemakerEmailIndexes: vi.fn(),
  getMongoFilemakerEmailCollections: vi.fn(),
}));
vi.mock('./filemaker-organizations-repository', () => ({
  getMongoFilemakerOrganizationById: vi.fn(),
}));
vi.mock('./filemaker-organization-presence-scrape', () => ({
  runFilemakerOrganizationPresenceScrapeForOrganization: vi.fn(),
}));
vi.mock('./filemaker-website-repository', () => ({
  listMongoFilemakerWebsitesForOrganization: vi.fn(),
}));

import { buildFilemakerOrganizationEmailScrapeScript } from './filemaker-organization-email-scrape';
import {
  classifyEmail,
  decodeCfemail,
  decodeEntities,
  extractCfemails,
  extractEmailsFromPage,
  foldUnicode,
  isPlausibleEmail,
  matchesContactKeyword,
  normalizeEmail,
} from './filemaker-organization-email-scrape-extractor';

describe('decodeEntities', () => {
  it('decodes @ and . entities', () => {
    expect(decodeEntities('user&#64;example&#46;com')).toBe('user@example.com');
    expect(decodeEntities('user&commat;example&period;com')).toBe('user@example.com');
    expect(decodeEntities('user&#x40;example&#x2e;com')).toBe('user@example.com');
  });
});

describe('foldUnicode', () => {
  it('folds full-width @ and unicode dot look-alikes', () => {
    expect(foldUnicode('user＠example․com')).toBe('user@example.com');
  });
});

describe('normalizeEmail', () => {
  it('handles obfuscated forms and casing', () => {
    expect(normalizeEmail('USER [at] Example [DOT] COM')).toBe('user@example.com');
    expect(normalizeEmail('user (at) example (dot) com')).toBe('user@example.com');
    expect(normalizeEmail('  user at example dot com  ')).toBe('user@example.com');
  });
  it('combines entity decode + unicode fold + obfuscation', () => {
    expect(normalizeEmail('USER&#64;example&#46;com')).toBe('user@example.com');
    expect(normalizeEmail('user＠Example․COM')).toBe('user@example.com');
  });
});

describe('isPlausibleEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isPlausibleEmail('user@example.com')).toBe(true);
    expect(isPlausibleEmail('a.b+tag@sub.example.co')).toBe(true);
  });
  it('rejects asset-extension false positives', () => {
    expect(isPlausibleEmail('logo@2x.png')).toBe(false);
    expect(isPlausibleEmail('image@example.svg')).toBe(false);
    expect(isPlausibleEmail('chunk@hash.js')).toBe(false);
  });
  it('rejects garbage', () => {
    expect(isPlausibleEmail('notanemail')).toBe(false);
    expect(isPlausibleEmail('a@b.c')).toBe(false);
    expect(isPlausibleEmail('user@@example.com')).toBe(false);
    expect(isPlausibleEmail('user@example.')).toBe(false);
    expect(isPlausibleEmail(`a${'b'.repeat(70)}@example.com`)).toBe(false);
  });
});

describe('classifyEmail', () => {
  it('flags role accounts', () => {
    expect(classifyEmail('noreply@example.com').kind).toBe('role');
    expect(classifyEmail('no-reply@example.com').kind).toBe('role');
    expect(classifyEmail('postmaster@example.com').kind).toBe('role');
  });
  it('flags disposable domains', () => {
    expect(classifyEmail('hi@mailinator.com').kind).toBe('disposable');
    expect(classifyEmail('hi@10minutemail.com').kind).toBe('disposable');
  });
  it('treats normal addresses as personal', () => {
    expect(classifyEmail('jane@acme.com').kind).toBe('personal');
  });
});

describe('decodeCfemail / extractCfemails', () => {
  it('decodes Cloudflare-obfuscated email', () => {
    // "user@example.com" XOR-encoded with key 0x5a
    // Generated via: const k=0x5a; 'user@example.com'.split('').map(c=>(c.charCodeAt(0)^k).toString(16).padStart(2,'0')).join('')
    const k = 0x5a;
    const target = 'user@example.com';
    const hex =
      k.toString(16).padStart(2, '0') +
      Array.from(target)
        .map((c) => (c.charCodeAt(0) ^ k).toString(16).padStart(2, '0'))
        .join('');
    expect(decodeCfemail(hex)).toBe(target);
  });
  it('extracts data-cfemail attributes from html', () => {
    const k = 0x21;
    const target = 'jane@acme.com';
    const hex =
      k.toString(16).padStart(2, '0') +
      Array.from(target)
        .map((c) => (c.charCodeAt(0) ^ k).toString(16).padStart(2, '0'))
        .join('');
    const html = `<a href="#" data-cfemail="${hex}">[email&nbsp;protected]</a>`;
    expect(extractCfemails(html)).toEqual([target]);
  });
  it('returns null on bad input', () => {
    expect(decodeCfemail('zz')).toBeNull();
    expect(decodeCfemail('1')).toBeNull();
  });
});

describe('extractEmailsFromPage', () => {
  it('aggregates from text, mailto, jsonLd, cfemail', () => {
    const k = 0x10;
    const cfTarget = 'cf@acme.com';
    const cfHex =
      k.toString(16).padStart(2, '0') +
      Array.from(cfTarget)
        .map((c) => (c.charCodeAt(0) ^ k).toString(16).padStart(2, '0'))
        .join('');
    const result = extractEmailsFromPage({
      text: 'Reach us at info@acme.com or sales [at] acme [dot] com',
      html: `<a href="mailto:hello@acme.com">x</a><span data-cfemail="${cfHex}">x</span>`,
      mailtos: ['mailto:hello@acme.com?subject=Hi'],
      jsonLd: ['{"email":"jsonld@acme.com"}'],
      microdataEmails: ['micro@acme.com'],
    });
    const addresses = result.emails.map((e) => e.address).sort();
    expect(addresses).toEqual(
      ['cf@acme.com', 'hello@acme.com', 'info@acme.com', 'jsonld@acme.com', 'micro@acme.com', 'sales@acme.com'].sort()
    );
    expect(result.breakdown.mailto).toBeGreaterThanOrEqual(1);
    expect(result.breakdown.dataCfemail).toBe(1);
    expect(result.breakdown.jsonLd).toBe(1);
    expect(result.breakdown.microdata).toBe(1);
    expect(result.breakdown.regex).toBeGreaterThanOrEqual(1);
  });
  it('drops disposable addresses entirely and reports the count', () => {
    const result = extractEmailsFromPage({
      text: 'contact: real@acme.com or fake@mailinator.com or also@yopmail.com',
    });
    const addresses = result.emails.map((e) => e.address);
    expect(addresses).toContain('real@acme.com');
    expect(addresses).not.toContain('fake@mailinator.com');
    expect(addresses).not.toContain('also@yopmail.com');
    expect(result.disposableSkipped).toBe(2);
  });
  it('rejects asset-extension false positives', () => {
    const result = extractEmailsFromPage({
      html: '<img src="logo@2x.png"><script src="chunk@deadbeef.js"></script>',
    });
    expect(result.emails.map((e) => e.address)).toEqual([]);
  });
});

describe('matchesContactKeyword', () => {
  it('matches the extended wordlist', () => {
    expect(matchesContactKeyword('/impressum')).toBe(true);
    expect(matchesContactKeyword('Career')).toBe(true);
    expect(matchesContactKeyword('kariera')).toBe(true);
    expect(matchesContactKeyword('/about-us')).toBe(true);
  });
  it('rejects unrelated text', () => {
    expect(matchesContactKeyword('/products')).toBe(false);
  });
});

describe('buildFilemakerOrganizationEmailScrapeScript', () => {
  const script = buildFilemakerOrganizationEmailScrapeScript();
  it('inlines the extractor body', () => {
    expect(script).toContain('api.extractEmailsFromPage');
    expect(script).toContain('api.matchesContactKeyword');
    expect(script).toContain('api.decodeCfemail');
  });
  it('contains retry helper and metrics return', () => {
    expect(script).toContain('gotoWithRetry');
    expect(script).toContain('sourceBreakdown');
    expect(script).toContain('totalEmailsFound');
  });
  it('parses as a valid JS function body', () => {
    // strip the `export default ` so we can wrap as Function body
    const body = script.replace(/^\s*export default\s+/, 'return ');
    expect(() => new Function(body)).not.toThrow();
  });
});
