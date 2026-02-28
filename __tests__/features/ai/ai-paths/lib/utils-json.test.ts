import { describe, it, expect } from 'vitest';

import {
  getValueAtMappingPath,
  parsePathTokens,
  normalizeMappingPath,
} from '@/shared/lib/ai-paths/core/utils/json';

describe('JSON Utils', () => {
  describe('normalizeMappingPath', () => {
    it('should strip $. and $ prefix', () => {
      expect(normalizeMappingPath('$.name')).toBe('name');
      expect(normalizeMappingPath('$name')).toBe('name');
      expect(normalizeMappingPath('details.price')).toBe('details.price');
    });
  });

  describe('parsePathTokens', () => {
    it('should parse simple paths', () => {
      expect(parsePathTokens('name')).toEqual(['name']);
      expect(parsePathTokens('details.price')).toEqual(['details', 'price']);
    });

    it('should parse array indices', () => {
      expect(parsePathTokens('images[0].url')).toEqual(['images', 0, 'url']);
      expect(parsePathTokens('[0].id')).toEqual([0, 'id']);
    });
  });

  describe('getValueAtMappingPath', () => {
    const obj = {
      name: 'Test',
      details: { price: 100 },
      images: [{ url: 'http://example.com/1.jpg' }],
    };

    it('should get top level value', () => {
      expect(getValueAtMappingPath(obj, '$.name')).toBe('Test');
    });

    it('should get nested value', () => {
      expect(getValueAtMappingPath(obj, '$.details.price')).toBe(100);
    });

    it('should get array value', () => {
      expect(getValueAtMappingPath(obj, '$.images[0].url')).toBe('http://example.com/1.jpg');
    });

    it('should return undefined for non-existent path', () => {
      expect(getValueAtMappingPath(obj, '$.nonexistent')).toBeUndefined();
      expect(getValueAtMappingPath(obj, '$.details.none')).toBeUndefined();
    });
  });
});
