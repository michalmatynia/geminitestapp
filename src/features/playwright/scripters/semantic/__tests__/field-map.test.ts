import { describe, expect, it } from 'vitest';

import { BUILTIN_TRANSFORMS } from '../../transforms';
import { SEMANTIC_EMPTY_RECORD, evaluateSemanticFieldMap } from '../field-map';

const makeFieldMap = (bindings: Record<string, unknown>, defaults?: Record<string, unknown>) => ({
  bindings,
  defaults,
});

describe('SEMANTIC_EMPTY_RECORD', () => {
  it('has all 25 target fields initialised', () => {
    expect(SEMANTIC_EMPTY_RECORD.title).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.description).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.sourceUrl).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.canonicalUrl).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.images).toEqual([]);
    expect(SEMANTIC_EMPTY_RECORD.language).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.tags).toEqual([]);
    expect(SEMANTIC_EMPTY_RECORD.externalId).toBeNull();
    // product
    expect(SEMANTIC_EMPTY_RECORD.price).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.currency).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.sku).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.ean).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.brand).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.category).toBeNull();
    // article
    expect(SEMANTIC_EMPTY_RECORD.author).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.publishedAt).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.bodyText).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.excerpt).toBeNull();
    // job
    expect(SEMANTIC_EMPTY_RECORD.company).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.location).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.salary).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.jobType).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.applyUrl).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.postedAt).toBeNull();
    expect(SEMANTIC_EMPTY_RECORD.requirements).toBeNull();
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(SEMANTIC_EMPTY_RECORD)).toBe(true);
  });
});

describe('evaluateSemanticFieldMap', () => {
  describe('basic path binding', () => {
    it('resolves a simple path to a string field', () => {
      const raw = { name: '  Widget  ' };
      const fm = makeFieldMap({ title: { path: 'name' } });
      const { record, issues } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.title).toBe('Widget');
      expect(issues).toHaveLength(0);
    });

    it('resolves nested path with dot notation', () => {
      const raw = { job: { company: 'Acme Corp' } };
      const fm = makeFieldMap({ company: { path: 'job.company' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.company).toBe('Acme Corp');
    });

    it('returns null for missing path', () => {
      const raw = {};
      const fm = makeFieldMap({ title: { path: 'missing' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.title).toBeNull();
    });
  });

  describe('constant binding', () => {
    it('sets a constant string value', () => {
      const raw = {};
      const fm = makeFieldMap({ language: { constant: 'en' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.language).toBe('en');
    });

    it('sets a constant number value for price', () => {
      const raw = {};
      const fm = makeFieldMap({ price: { constant: 9.99 } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.price).toBe(9.99);
    });
  });

  describe('price field — numeric coercion', () => {
    it('coerces a string number to a number', () => {
      const raw = { price: '29.99' };
      const fm = makeFieldMap({ price: { path: 'price' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.price).toBe(29.99);
    });

    it('coerces comma-decimal format', () => {
      const raw = { price: '1,299' };
      const fm = makeFieldMap({ price: { path: 'price' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.price).toBe(1.299);
    });

    it('returns null for non-numeric string', () => {
      const raw = { price: 'free' };
      const fm = makeFieldMap({ price: { path: 'price' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.price).toBeNull();
    });

    it('keeps a numeric value as-is', () => {
      const raw = { price: 42 };
      const fm = makeFieldMap({ price: { path: 'price' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.price).toBe(42);
    });
  });

  describe('array fields (images, tags)', () => {
    it('coerces a string to a single-element array', () => {
      const raw = { img: 'https://example.com/img.jpg' };
      const fm = makeFieldMap({ images: { path: 'img' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.images).toEqual(['https://example.com/img.jpg']);
    });

    it('keeps a real array of strings', () => {
      const raw = { imgs: ['a.jpg', 'b.jpg'] };
      const fm = makeFieldMap({ images: { path: 'imgs' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.images).toEqual(['a.jpg', 'b.jpg']);
    });

    it('filters null/undefined items from array, coerces numbers to strings', () => {
      const raw = { tags: ['news', 42, null, 'ai'] };
      const fm = makeFieldMap({ tags: { path: 'tags' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      // null is dropped; number 42 is coerced to '42' by toStringOrNull
      expect(record.tags).toEqual(['news', '42', 'ai']);
    });

    it('returns empty array when field is missing', () => {
      const raw = {};
      const fm = makeFieldMap({ images: { path: 'missing' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.images).toEqual([]);
    });
  });

  describe('multiple paths (paths: [])', () => {
    it('picks the first non-empty path', () => {
      const raw = { a: '', b: 'found' };
      const fm = makeFieldMap({ title: { paths: ['a', 'b'] } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.title).toBe('found');
    });
  });

  describe('fallback', () => {
    it('uses fallback when path resolves to null', () => {
      const raw = {};
      const fm = makeFieldMap({ currency: { path: 'cur', fallback: 'PLN' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.currency).toBe('PLN');
    });

    it('does not use fallback when path resolves to a value', () => {
      const raw = { cur: 'EUR' };
      const fm = makeFieldMap({ currency: { path: 'cur', fallback: 'PLN' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.currency).toBe('EUR');
    });
  });

  describe('defaults', () => {
    it('applies defaults for fields with no binding', () => {
      const raw = {};
      const fm = makeFieldMap({}, { language: 'pl', category: 'Electronics' });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.language).toBe('pl');
      expect(record.category).toBe('Electronics');
    });

    it('does not override a bound field with defaults', () => {
      const raw = { lang: 'en' };
      const fm = makeFieldMap({ language: { path: 'lang' } }, { language: 'pl' });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.language).toBe('en');
    });

    it('uses defaults when binding resolves to empty', () => {
      const raw = {};
      const fm = makeFieldMap({ language: { path: 'lang' } }, { language: 'pl' });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.language).toBe('pl');
    });
  });

  describe('required fields', () => {
    it('emits an error issue when required field is empty', () => {
      const raw = {};
      const fm = makeFieldMap({ sourceUrl: { path: 'url', required: true } });
      const { issues } = evaluateSemanticFieldMap(raw, fm as never);
      expect(issues).toHaveLength(1);
      expect(issues[0]?.severity).toBe('error');
      expect(issues[0]?.field).toBe('sourceUrl');
    });

    it('emits no issue when required field is present', () => {
      const raw = { url: 'https://example.com' };
      const fm = makeFieldMap({ sourceUrl: { path: 'url', required: true } });
      const { issues } = evaluateSemanticFieldMap(raw, fm as never);
      expect(issues).toHaveLength(0);
    });

    it('emits an error when required array field is empty', () => {
      const raw = {};
      const fm = makeFieldMap({ images: { path: 'imgs', required: true } });
      const { issues } = evaluateSemanticFieldMap(raw, fm as never);
      expect(issues.some((i) => i.field === 'images' && i.severity === 'error')).toBe(true);
    });
  });

  describe('transforms', () => {
    it('applies trim transform', () => {
      const raw = { t: '  Hello World  ' };
      const fm = makeFieldMap({ title: { path: 't', transforms: [{ name: 'trim' }] } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never, BUILTIN_TRANSFORMS);
      expect(record.title).toBe('Hello World');
    });

    it('reports error issue for unknown transform', () => {
      const raw = { t: 'hello' };
      const fm = makeFieldMap({ title: { path: 't', transforms: [{ name: 'unknownXYZ' }] } });
      const { issues } = evaluateSemanticFieldMap(raw, fm as never, BUILTIN_TRANSFORMS);
      expect(issues.some((i) => i.transform === 'unknownXYZ')).toBe(true);
    });
  });

  describe('raw is preserved on record', () => {
    it('attaches the original raw object', () => {
      const raw = { title: 'Test', extra: 42 };
      const fm = makeFieldMap({ title: { path: 'title' } });
      const { record } = evaluateSemanticFieldMap(raw, fm as never);
      expect(record.raw).toBe(raw);
    });
  });

  describe('all 25 fields can be bound', () => {
    it('binds all job-domain fields', () => {
      const raw = {
        company: 'Acme',
        location: 'Warsaw',
        salary: '$100k',
        jobType: 'full-time',
        applyUrl: 'https://apply.example.com',
        postedAt: '2026-01-01',
        requirements: 'Python experience',
      };
      const fm = makeFieldMap({
        company: { path: 'company' },
        location: { path: 'location' },
        salary: { path: 'salary' },
        jobType: { path: 'jobType' },
        applyUrl: { path: 'applyUrl' },
        postedAt: { path: 'postedAt' },
        requirements: { path: 'requirements' },
      });
      const { record, issues } = evaluateSemanticFieldMap(raw, fm as never);
      expect(issues).toHaveLength(0);
      expect(record.company).toBe('Acme');
      expect(record.location).toBe('Warsaw');
      expect(record.salary).toBe('$100k');
      expect(record.jobType).toBe('full-time');
      expect(record.applyUrl).toBe('https://apply.example.com');
      expect(record.postedAt).toBe('2026-01-01');
      expect(record.requirements).toBe('Python experience');
    });

    it('binds all article-domain fields', () => {
      const raw = {
        author: 'Jane Doe',
        publishedAt: '2026-03-15',
        bodyText: 'Long article body text here...',
        excerpt: 'Short summary',
      };
      const fm = makeFieldMap({
        author: { path: 'author' },
        publishedAt: { path: 'publishedAt' },
        bodyText: { path: 'bodyText' },
        excerpt: { path: 'excerpt' },
      });
      const { record, issues } = evaluateSemanticFieldMap(raw, fm as never);
      expect(issues).toHaveLength(0);
      expect(record.author).toBe('Jane Doe');
      expect(record.publishedAt).toBe('2026-03-15');
      expect(record.bodyText).toBe('Long article body text here...');
      expect(record.excerpt).toBe('Short summary');
    });
  });
});
