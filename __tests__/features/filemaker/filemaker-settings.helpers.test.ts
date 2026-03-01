import { describe, it, expect } from 'vitest';

import {
  normalizeString,
  toIdToken,
  ensureUniqueId,
  normalizePhoneNumbers,
} from '@/features/filemaker/filemaker-settings.helpers';

describe('filemaker-settings.helpers', () => {
  describe('normalizeString', () => {
    it('should trim string values', () => {
      expect(normalizeString('  hello  ')).toBe('hello');
    });

    it('should return fallback for non-string values', () => {
      expect(normalizeString(123)).toBe('');
      expect(normalizeString(null)).toBe('');
      expect(normalizeString(undefined)).toBe('');
    });

    it('should use custom fallback', () => {
      expect(normalizeString(null, 'default')).toBe('default');
    });
  });

  describe('toIdToken', () => {
    it('should convert to lowercase', () => {
      expect(toIdToken('Hello World')).toBe('hello-world');
    });

    it('should replace non-alphanumeric with hyphens', () => {
      expect(toIdToken('hello@world!')).toBe('hello-world');
    });

    it('should remove leading hyphens', () => {
      expect(toIdToken('---hello')).toBe('hello');
    });

    it('should remove trailing hyphens', () => {
      expect(toIdToken('hello---')).toBe('hello');
    });

    it('should handle multiple special characters', () => {
      expect(toIdToken('hello   world!!!')).toBe('hello-world');
    });
  });

  describe('ensureUniqueId', () => {
    it('should return candidate if not used', () => {
      const usedIds = new Set(['id1', 'id2']);
      expect(ensureUniqueId('id3', usedIds, 'fallback')).toBe('id3');
    });

    it('should append -2 if candidate is used', () => {
      const usedIds = new Set(['id1']);
      expect(ensureUniqueId('id1', usedIds, 'fallback')).toBe('id1-2');
    });

    it('should increment until unique', () => {
      const usedIds = new Set(['id1', 'id1-2', 'id1-3']);
      expect(ensureUniqueId('id1', usedIds, 'fallback')).toBe('id1-4');
    });

    it('should use fallback prefix if candidate is empty', () => {
      const usedIds = new Set<string>();
      expect(ensureUniqueId('', usedIds, 'fallback')).toBe('fallback');
    });
  });

  describe('normalizePhoneNumbers', () => {
    it('should handle array input', () => {
      expect(normalizePhoneNumbers(['123', '456'])).toEqual(['123', '456']);
    });

    it('should remove duplicates from array', () => {
      expect(normalizePhoneNumbers(['123', '123', '456'])).toEqual(['123', '456']);
    });

    it('should handle comma-separated string', () => {
      expect(normalizePhoneNumbers('123, 456, 789')).toEqual(['123', '456', '789']);
    });

    it('should remove duplicates from string', () => {
      expect(normalizePhoneNumbers('123, 123, 456')).toEqual(['123', '456']);
    });

    it('should filter empty values', () => {
      expect(normalizePhoneNumbers(['123', '', '456'])).toEqual(['123', '456']);
      expect(normalizePhoneNumbers('123, , 456')).toEqual(['123', '456']);
    });

    it('should return empty array for invalid input', () => {
      expect(normalizePhoneNumbers(null)).toEqual([]);
      expect(normalizePhoneNumbers(123)).toEqual([]);
      expect(normalizePhoneNumbers({})).toEqual([]);
    });
  });
});
