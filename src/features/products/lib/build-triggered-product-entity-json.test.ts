import { describe, expect, it } from 'vitest';

import { buildTriggeredProductEntityJson } from './build-triggered-product-entity-json';

describe('buildTriggeredProductEntityJson', () => {
  describe('base merging', () => {
    it('merges product fields with values, values winning on conflict', () => {
      const result = buildTriggeredProductEntityJson({
        product: { id: 'p1', name: 'Old Name' } as never,
        values: { name: 'New Name' },
      });
      expect(result['name']).toBe('New Name');
      expect(result['id']).toBe('p1');
    });

    it('merges draft fields when no product is given', () => {
      const result = buildTriggeredProductEntityJson({
        draft: { name: 'Draft Name' } as never,
        values: { slug: 'draft-slug' },
      });
      expect(result['name']).toBe('Draft Name');
      expect(result['slug']).toBe('draft-slug');
    });

    it('uses only values when neither product nor draft is given', () => {
      const result = buildTriggeredProductEntityJson({
        values: { title: 'standalone' },
      });
      expect(result['title']).toBe('standalone');
    });

    it('always preserves product id even if values overrides it', () => {
      const result = buildTriggeredProductEntityJson({
        product: { id: 'real-id' } as never,
        values: { id: 'fake-id' },
      });
      expect(result['id']).toBe('real-id');
    });
  });

  describe('status normalization', () => {
    it('keeps existing status string and infers publicationStatus from published', () => {
      const result = buildTriggeredProductEntityJson({
        values: { status: 'active', published: true },
      });
      expect(result['status']).toBe('active');
      expect(result['publicationStatus']).toBe('published');
    });

    it('trims an existing status string before preserving it', () => {
      const result = buildTriggeredProductEntityJson({
        values: { status: '  active  ', published: false },
      });
      expect(result['status']).toBe('active');
      expect(result['publicationStatus']).toBe('draft');
    });

    it('does not overwrite existing publicationStatus when status is present', () => {
      const result = buildTriggeredProductEntityJson({
        values: { status: 'active', published: true, publicationStatus: 'archived' },
      });
      expect(result['publicationStatus']).toBe('archived');
    });

    it('infers status=published when published is true and no status set', () => {
      const result = buildTriggeredProductEntityJson({
        values: { published: true },
      });
      expect(result['status']).toBe('published');
      expect(result['publicationStatus']).toBe('published');
    });

    it('infers status=draft when published is false and no status set', () => {
      const result = buildTriggeredProductEntityJson({
        values: { published: false },
      });
      expect(result['status']).toBe('draft');
      expect(result['publicationStatus']).toBe('draft');
    });

    it('does not set status when neither status nor published is present', () => {
      const result = buildTriggeredProductEntityJson({
        values: { name: 'No Status' },
      });
      expect(result['status']).toBeUndefined();
    });
  });

  describe('catalog ID normalization', () => {
    it('sets catalogId to first entry and builds catalogs array from string array', () => {
      const result = buildTriggeredProductEntityJson({
        values: { catalogIds: ['cat-1', 'cat-2'] },
      });
      expect(result['catalogId']).toBe('cat-1');
      expect(result['catalogs']).toEqual([{ catalogId: 'cat-1' }, { catalogId: 'cat-2' }]);
    });

    it('accepts object entries with catalogId property', () => {
      const result = buildTriggeredProductEntityJson({
        values: { catalogIds: [{ catalogId: 'cat-A' }, { catalogId: 'cat-B' }] },
      });
      expect(result['catalogId']).toBe('cat-A');
      expect(result['catalogs']).toEqual([{ catalogId: 'cat-A' }, { catalogId: 'cat-B' }]);
    });

    it('accepts object entries with id property as fallback', () => {
      const result = buildTriggeredProductEntityJson({
        values: { catalogIds: [{ id: 'cat-X' }] },
      });
      expect(result['catalogId']).toBe('cat-X');
    });

    it('deduplicates catalog IDs', () => {
      const result = buildTriggeredProductEntityJson({
        values: { catalogIds: ['dup', 'dup', 'unique'] },
      });
      expect((result['catalogs'] as unknown[]).length).toBe(2);
    });

    it('merges existing catalog entry data when available', () => {
      const result = buildTriggeredProductEntityJson({
        product: { id: 'p1', catalogs: [{ catalogId: 'cat-1', extra: 'keep' }] } as never,
        values: { catalogIds: ['cat-1'] },
      });
      const catalogs = result['catalogs'] as Array<Record<string, unknown>>;
      expect(catalogs[0]).toMatchObject({ catalogId: 'cat-1', extra: 'keep' });
    });

    it('includes productId in new catalog entries when product has id', () => {
      const result = buildTriggeredProductEntityJson({
        product: { id: 'p99' } as never,
        values: { catalogIds: ['new-cat'] },
      });
      const catalogs = result['catalogs'] as Array<Record<string, unknown>>;
      expect(catalogs[0]).toEqual({ catalogId: 'new-cat', productId: 'p99' });
    });

    it('returns entityJson unchanged when catalogIds is empty', () => {
      const result = buildTriggeredProductEntityJson({
        values: { catalogIds: [] },
      });
      expect(result['catalogs']).toBeUndefined();
    });

    it('returns entityJson unchanged when catalogIds is not an array', () => {
      const result = buildTriggeredProductEntityJson({
        values: { catalogIds: 'not-an-array' },
      });
      expect(result['catalogs']).toBeUndefined();
    });
  });
});
