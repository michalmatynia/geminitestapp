import { describe, expect, it } from 'vitest';

import type { SemanticExtractedRecord, SemanticMappedRecord } from '../types';
import { toSemanticArticleRecords, toSemanticArticleResult } from '../adapters/article';
import { toSemanticJobRecord, toSemanticJobRecords } from '../adapters/job';
import { toSemanticProductRecord, toSemanticProductRecords } from '../adapters/product';
import { SEMANTIC_EMPTY_RECORD } from '../field-map';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeExtracted = (
  mapped: Partial<SemanticMappedRecord>,
  raw: Record<string, unknown> = {},
  issues: SemanticExtractedRecord['issues'] = []
): SemanticExtractedRecord => ({
  index: 0,
  raw,
  issues,
  mapped: { ...SEMANTIC_EMPTY_RECORD, images: [], tags: [], raw, ...mapped },
});

// ── Product adapter ───────────────────────────────────────────────────────────

describe('toSemanticProductRecord', () => {
  it('maps all product fields from mapped record', () => {
    const extracted = makeExtracted({
      title: 'Blue Widget',
      description: 'A nice widget',
      price: 9.99,
      currency: 'USD',
      sku: 'BW-001',
      ean: '1234567890123',
      brand: 'Widgetco',
      category: 'Hardware',
      sourceUrl: 'https://shop.example.com/widget',
      images: ['https://shop.example.com/img.jpg'],
      tags: ['widget', 'blue'],
      externalId: 'ext-42',
    });
    const result = toSemanticProductRecord(extracted);
    expect(result.title).toBe('Blue Widget');
    expect(result.price).toBe(9.99);
    expect(result.currency).toBe('USD');
    expect(result.sku).toBe('BW-001');
    expect(result.ean).toBe('1234567890123');
    expect(result.brand).toBe('Widgetco');
    expect(result.category).toBe('Hardware');
    expect(result.sourceUrl).toBe('https://shop.example.com/widget');
    expect(result.images).toEqual(['https://shop.example.com/img.jpg']);
    // sku takes priority over externalId in resolveExternalId
    expect(result.externalId).toBe('BW-001');
  });

  it('falls back title to SKU when title is null', () => {
    const extracted = makeExtracted({ title: null, sku: 'SKU-999' });
    const result = toSemanticProductRecord(extracted);
    expect(result.title).toBe('SKU SKU-999');
  });

  it('falls back title to externalId when title and sku are null', () => {
    const extracted = makeExtracted({ title: null, sku: null, externalId: 'ext-007' });
    const result = toSemanticProductRecord(extracted);
    expect(result.title).toBe('Item ext-007');
  });

  it('returns null title when all fallbacks are absent', () => {
    const extracted = makeExtracted({ title: null, sku: null, externalId: null });
    const result = toSemanticProductRecord(extracted);
    expect(result.title).toBeNull();
  });

  it('falls back externalId to sku when externalId is null', () => {
    const extracted = makeExtracted({ externalId: null, sku: 'SKU-FALLBACK' });
    const result = toSemanticProductRecord(extracted);
    expect(result.externalId).toBe('SKU-FALLBACK');
  });

  it('falls back externalId to sourceUrl as last resort', () => {
    const extracted = makeExtracted({
      externalId: null,
      sku: null,
      sourceUrl: 'https://example.com/product/42',
    });
    const result = toSemanticProductRecord(extracted);
    expect(result.externalId).toBe('https://example.com/product/42');
  });
});

describe('toSemanticProductRecords', () => {
  it('maps all records by default', () => {
    const records = [
      makeExtracted({ title: 'A' }),
      makeExtracted({ title: 'B' }, {}, [{ field: 'price', severity: 'error', message: 'err' }]),
    ];
    const results = toSemanticProductRecords(records);
    expect(results).toHaveLength(2);
  });

  it('skips records with errors when skipWithErrors=true', () => {
    const records = [
      makeExtracted({ title: 'A' }),
      makeExtracted({ title: 'B' }, {}, [{ field: 'price', severity: 'error', message: 'err' }]),
    ];
    const results = toSemanticProductRecords(records, { skipWithErrors: true });
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('A');
  });
});

// ── Article adapter ───────────────────────────────────────────────────────────

const LONG_BODY = 'word '.repeat(50).trim();
const SHORT_BODY = 'word '.repeat(10).trim();

describe('toSemanticArticleResult', () => {
  const ctx = { baseUrl: 'https://news.example.com' };

  it('returns null when no sourceUrl can be resolved', () => {
    const extracted = makeExtracted({ sourceUrl: null }, {});
    const result = toSemanticArticleResult(extracted, ctx);
    expect(result).toBeNull();
  });

  it('returns candidate when body is < 40 words', () => {
    const extracted = makeExtracted(
      { sourceUrl: 'https://news.example.com/article/1', bodyText: SHORT_BODY },
      {}
    );
    const result = toSemanticArticleResult(extracted, ctx);
    expect(result?.kind).toBe('candidate');
    if (result?.kind === 'candidate') {
      expect(result.url).toBe('https://news.example.com/article/1');
    }
  });

  it('returns article when body is >= 40 words', () => {
    const extracted = makeExtracted(
      { sourceUrl: 'https://news.example.com/article/2', bodyText: LONG_BODY },
      {}
    );
    const result = toSemanticArticleResult(extracted, ctx);
    expect(result?.kind).toBe('article');
    if (result?.kind === 'article') {
      expect(result.record.wordCount).toBeGreaterThanOrEqual(40);
    }
  });

  it('populates all article fields from mapped record', () => {
    const extracted = makeExtracted({
      sourceUrl: 'https://news.example.com/story',
      title: 'Big Story',
      description: 'A short summary',
      bodyText: LONG_BODY,
      author: 'Jane Reporter',
      publishedAt: '2026-01-15',
      images: ['https://news.example.com/hero.jpg'],
      tags: ['ai', 'tech'],
      language: 'en',
    });
    const result = toSemanticArticleResult(extracted, ctx);
    expect(result?.kind).toBe('article');
    if (result?.kind !== 'article') return;
    const r = result.record;
    expect(r.title).toBe('Big Story');
    expect(r.description).toBe('A short summary');
    expect(r.author).toBe('Jane Reporter');
    expect(r.publishedAt).toBe('2026-01-15');
    expect(r.imageUrl).toBe('https://news.example.com/hero.jpg');
    expect(r.tags).toEqual(['ai', 'tech']);
    expect(r.language).toBe('en');
  });

  it('falls back author from raw when mapped.author is null', () => {
    const raw = { author: 'Raw Author' };
    const extracted = makeExtracted(
      { sourceUrl: 'https://news.example.com/a', bodyText: LONG_BODY, author: null },
      raw
    );
    const result = toSemanticArticleResult(extracted, ctx);
    expect(result?.kind).toBe('article');
    if (result?.kind === 'article') {
      expect(result.record.author).toBe('Raw Author');
    }
  });

  it('falls back publishedAt from raw datePublished key', () => {
    const raw = { datePublished: '2026-05-01' };
    const extracted = makeExtracted(
      { sourceUrl: 'https://news.example.com/b', bodyText: LONG_BODY, publishedAt: null },
      raw
    );
    const result = toSemanticArticleResult(extracted, ctx);
    if (result?.kind === 'article') {
      expect(result.record.publishedAt).toBe('2026-05-01');
    }
  });

  it('resolves relative sourceUrl against baseUrl from raw fallback', () => {
    const raw = { url: '/relative/path' };
    const extracted = makeExtracted(
      { sourceUrl: null, bodyText: LONG_BODY },
      raw
    );
    const result = toSemanticArticleResult(extracted, ctx);
    expect(result?.kind).toBe('article');
    if (result?.kind === 'article') {
      expect(result.record.sourceUrl).toBe('https://news.example.com/relative/path');
    }
  });

  it('clips bodyText to maxBodyChars (using a large enough limit to stay above 40-word threshold)', () => {
    const veryLong = 'word '.repeat(10000);
    const extracted = makeExtracted(
      { sourceUrl: 'https://news.example.com/long', bodyText: veryLong },
      {}
    );
    // Use a limit that still leaves >= 40 words (300 chars ≈ 60 words)
    const result = toSemanticArticleResult(extracted, { ...ctx, maxBodyChars: 300 });
    expect(result?.kind).toBe('article');
    if (result?.kind === 'article') {
      expect(result.record.bodyText.length).toBeLessThanOrEqual(300);
    }
  });

  it('uses canonicalUrl from mapped if present', () => {
    const extracted = makeExtracted({
      sourceUrl: 'https://news.example.com/article/3',
      canonicalUrl: 'https://canonical.example.com/article/3',
      bodyText: LONG_BODY,
    });
    const result = toSemanticArticleResult(extracted, ctx);
    if (result?.kind === 'article') {
      expect(result.record.canonicalUrl).toBe('https://canonical.example.com/article/3');
    }
  });
});

describe('toSemanticArticleRecords', () => {
  const ctx = { baseUrl: 'https://news.example.com' };

  it('separates articles and candidates', () => {
    const records = [
      makeExtracted({ sourceUrl: 'https://news.example.com/full', bodyText: LONG_BODY }),
      makeExtracted({ sourceUrl: 'https://news.example.com/short', bodyText: SHORT_BODY }),
      makeExtracted({ sourceUrl: null }),
    ];
    const { articles, candidates, skipped } = toSemanticArticleRecords(records, ctx);
    expect(articles).toHaveLength(1);
    expect(candidates).toHaveLength(1);
    expect(skipped).toBe(1);
  });
});

// ── Job adapter ───────────────────────────────────────────────────────────────

describe('toSemanticJobRecord', () => {
  const ctx = { baseUrl: 'https://jobs.example.com' };

  it('returns null when no sourceUrl can be resolved', () => {
    const extracted = makeExtracted({ sourceUrl: null }, {});
    const result = toSemanticJobRecord(extracted, ctx);
    expect(result).toBeNull();
  });

  it('maps all job fields from mapped record', () => {
    const extracted = makeExtracted({
      sourceUrl: 'https://jobs.example.com/senior-engineer',
      title: 'Senior Engineer',
      description: 'Build great things',
      requirements: '5 years Python',
      company: 'Acme Corp',
      location: 'Warsaw, PL',
      salary: '$120k–$140k',
      jobType: 'full-time',
      applyUrl: 'https://jobs.example.com/apply/42',
      postedAt: '2026-01-10',
      tags: ['python', 'backend'],
      images: ['https://jobs.example.com/acme-logo.png'],
    });
    const result = toSemanticJobRecord(extracted, ctx);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.title).toBe('Senior Engineer');
    expect(result.description).toBe('Build great things');
    expect(result.requirements).toBe('5 years Python');
    expect(result.company).toBe('Acme Corp');
    expect(result.location).toBe('Warsaw, PL');
    expect(result.salary).toBe('$120k–$140k');
    expect(result.jobType).toBe('full-time');
    expect(result.sourceUrl).toBe('https://jobs.example.com/senior-engineer');
    expect(result.applyUrl).toBe('https://jobs.example.com/apply/42');
    expect(result.postedAt).toBe('2026-01-10');
    expect(result.tags).toEqual(['python', 'backend']);
    expect(result.imageUrl).toBe('https://jobs.example.com/acme-logo.png');
  });

  it('falls back title to sourceUrl when title is null', () => {
    const extracted = makeExtracted(
      { sourceUrl: 'https://jobs.example.com/job/99', title: null },
      {}
    );
    const result = toSemanticJobRecord(extracted, ctx);
    expect(result?.title).toBe('https://jobs.example.com/job/99');
  });

  it('falls back company from raw employer key', () => {
    const raw = { employer: 'MegaCorp' };
    const extracted = makeExtracted(
      { sourceUrl: 'https://jobs.example.com/j', company: null },
      raw
    );
    const result = toSemanticJobRecord(extracted, ctx);
    expect(result?.company).toBe('MegaCorp');
  });

  it('falls back jobType from raw employmentType key', () => {
    const raw = { employmentType: 'CONTRACT' };
    const extracted = makeExtracted(
      { sourceUrl: 'https://jobs.example.com/j', jobType: null },
      raw
    );
    const result = toSemanticJobRecord(extracted, ctx);
    expect(result?.jobType).toBe('CONTRACT');
  });

  it('falls back applyUrl from raw applicationUrl key', () => {
    const raw = { applicationUrl: 'https://ats.example.com/apply/55' };
    const extracted = makeExtracted(
      { sourceUrl: 'https://jobs.example.com/j', applyUrl: null },
      raw
    );
    const result = toSemanticJobRecord(extracted, ctx);
    expect(result?.applyUrl).toBe('https://ats.example.com/apply/55');
  });

  it('falls back postedAt from raw datePosted key', () => {
    const raw = { datePosted: '2026-04-01' };
    const extracted = makeExtracted(
      { sourceUrl: 'https://jobs.example.com/j', postedAt: null },
      raw
    );
    const result = toSemanticJobRecord(extracted, ctx);
    expect(result?.postedAt).toBe('2026-04-01');
  });

  it('resolves relative sourceUrl from raw url key', () => {
    const raw = { url: '/jobs/frontend-dev' };
    const extracted = makeExtracted({ sourceUrl: null }, raw);
    const result = toSemanticJobRecord(extracted, ctx);
    expect(result?.sourceUrl).toBe('https://jobs.example.com/jobs/frontend-dev');
  });
});

describe('toSemanticJobRecords', () => {
  const ctx = { baseUrl: 'https://jobs.example.com' };

  it('skips records with no sourceUrl', () => {
    const records = [
      makeExtracted({ sourceUrl: 'https://jobs.example.com/j1', title: 'Job A' }),
      makeExtracted({ sourceUrl: null }),
    ];
    const { jobs, skipped } = toSemanticJobRecords(records, ctx);
    expect(jobs).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it('skips records with errors when skipWithErrors=true', () => {
    const records = [
      makeExtracted({ sourceUrl: 'https://jobs.example.com/j1', title: 'Job A' }),
      makeExtracted(
        { sourceUrl: 'https://jobs.example.com/j2', title: 'Job B' },
        {},
        [{ field: 'title', severity: 'error', message: 'Required field empty' }]
      ),
    ];
    const { jobs, skipped } = toSemanticJobRecords(records, ctx, { skipWithErrors: true });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.title).toBe('Job A');
    expect(skipped).toBe(0);
  });
});
