import { describe, it, expect } from 'vitest';

import {
  normalizeText,
  stripQuery,
  isActiveHref,
  matchesQuery,
  filterTree,
  collectGroupIds,
  flattenAdminNav,
  type NavItem,
} from '@/features/admin/components/menu/admin-menu-utils';

describe('admin-menu-utils', () => {
  describe('normalizeText', () => {
    it('should convert to lowercase', () => {
      expect(normalizeText('Hello World')).toBe('hello world');
    });

    it('should replace special characters with spaces', () => {
      expect(normalizeText('hello_world-test/path')).toBe('hello world test path');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeText('hello   world')).toBe('hello world');
    });

    it('should trim whitespace', () => {
      expect(normalizeText('  hello world  ')).toBe('hello world');
    });
  });

  describe('stripQuery', () => {
    it('should remove query string', () => {
      expect(stripQuery('/admin/products?tab=basic')).toBe('/admin/products');
    });

    it('should return href if no query', () => {
      expect(stripQuery('/admin/products')).toBe('/admin/products');
    });

    it('should handle empty query', () => {
      expect(stripQuery('/admin/products?')).toBe('/admin/products');
    });
  });

  describe('isActiveHref', () => {
    it('should match exact path when exact is true', () => {
      expect(isActiveHref('/admin/products', '/admin/products', true)).toBe(true);
      expect(isActiveHref('/admin/products/123', '/admin/products', true)).toBe(false);
    });

    it('should match prefix when exact is false', () => {
      expect(isActiveHref('/admin/products/123', '/admin/products')).toBe(true);
      expect(isActiveHref('/admin/products', '/admin/products')).toBe(true);
    });

    it('should handle /admin specially', () => {
      expect(isActiveHref('/admin', '/admin')).toBe(true);
      expect(isActiveHref('/admin/products', '/admin')).toBe(false);
    });

    it('should return false for empty href', () => {
      expect(isActiveHref('/admin/products', '')).toBe(false);
    });
  });

  describe('matchesQuery', () => {
    const item: NavItem = {
      id: 'products',
      label: 'Products',
      href: '/admin/products',
      keywords: ['inventory', 'items'],
    };

    it('should match label', () => {
      expect(matchesQuery(item, 'products')).toBe(true);
    });

    it('should match href', () => {
      expect(matchesQuery(item, 'admin')).toBe(true);
    });

    it('should match keywords', () => {
      expect(matchesQuery(item, 'inventory')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(matchesQuery(item, 'PRODUCTS')).toBe(true);
    });

    it('should return true for empty query', () => {
      expect(matchesQuery(item, '')).toBe(true);
    });

    it('should return false for no match', () => {
      expect(matchesQuery(item, 'xyz')).toBe(false);
    });
  });

  describe('filterTree', () => {
    const tree: NavItem[] = [
      {
        id: 'section1',
        label: 'Section 1',
        children: [
          { id: 'item1', label: 'Products', href: '/admin/products' },
          { id: 'item2', label: 'Orders', href: '/admin/orders' },
        ],
      },
      {
        id: 'section2',
        label: 'Section 2',
        children: [{ id: 'item3', label: 'Settings', href: '/admin/settings' }],
      },
    ];

    it('should return all items for empty query', () => {
      expect(filterTree(tree, '')).toEqual(tree);
    });

    it('should filter by child match', () => {
      const result = filterTree(tree, 'products');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('section1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children?.[0].id).toBe('item1');
    });

    it('should filter by parent match', () => {
      const result = filterTree(tree, 'section 1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('section1');
      expect(result[0].children).toHaveLength(2);
    });

    it('should return empty for no match', () => {
      expect(filterTree(tree, 'xyz')).toEqual([]);
    });
  });

  describe('collectGroupIds', () => {
    it('should collect IDs of items with children', () => {
      const tree: NavItem[] = [
        {
          id: 'section1',
          label: 'Section 1',
          children: [{ id: 'item1', label: 'Item 1', href: '/item1' }],
        },
        { id: 'item2', label: 'Item 2', href: '/item2' },
      ];

      const ids = collectGroupIds(tree);
      expect(ids.has('section1')).toBe(true);
      expect(ids.has('item1')).toBe(false);
      expect(ids.has('item2')).toBe(false);
    });

    it('should handle nested groups', () => {
      const tree: NavItem[] = [
        {
          id: 'section1',
          label: 'Section 1',
          children: [
            {
              id: 'subsection1',
              label: 'Subsection 1',
              children: [{ id: 'item1', label: 'Item 1', href: '/item1' }],
            },
          ],
        },
      ];

      const ids = collectGroupIds(tree);
      expect(ids.has('section1')).toBe(true);
      expect(ids.has('subsection1')).toBe(true);
      expect(ids.has('item1')).toBe(false);
    });
  });

  describe('flattenAdminNav', () => {
    it('should flatten nested navigation', () => {
      const tree: NavItem[] = [
        {
          id: 'section1',
          label: 'Section 1',
          children: [
            { id: 'item1', label: 'Item 1', href: '/item1' },
            { id: 'item2', label: 'Item 2', href: '/item2' },
          ],
        },
      ];

      const flattened = flattenAdminNav(tree);
      expect(flattened).toHaveLength(2);
      expect(flattened[0].id).toBe('item1');
      expect(flattened[0].parents).toEqual(['Section 1']);
      expect(flattened[1].id).toBe('item2');
    });

    it('should skip items without href', () => {
      const tree: NavItem[] = [
        {
          id: 'section1',
          label: 'Section 1',
          children: [{ id: 'item1', label: 'Item 1', href: '/item1' }],
        },
      ];

      const flattened = flattenAdminNav(tree);
      expect(flattened).toHaveLength(1);
      expect(flattened[0].id).toBe('item1');
    });

    it('should handle deeply nested structure', () => {
      const tree: NavItem[] = [
        {
          id: 'section1',
          label: 'Section 1',
          children: [
            {
              id: 'subsection1',
              label: 'Subsection 1',
              children: [{ id: 'item1', label: 'Item 1', href: '/item1' }],
            },
          ],
        },
      ];

      const flattened = flattenAdminNav(tree);
      expect(flattened).toHaveLength(1);
      expect(flattened[0].parents).toEqual(['Section 1', 'Subsection 1']);
    });
  });
});
