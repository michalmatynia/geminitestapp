import { describe, expect, it } from 'vitest';

import {
  buildCustomSelectorRegistryProfileSuggestion,
  formatSelectorRegistryNamespaceLabel,
  inferSelectorRegistryNamespace,
  isSelectorRegistryNamespace,
} from './selector-registry-metadata';

describe('selector-registry-metadata', () => {
  it('recognizes the custom namespace and labels it clearly', () => {
    expect(isSelectorRegistryNamespace('custom')).toBe(true);
    expect(formatSelectorRegistryNamespaceLabel('custom')).toBe('Custom');
  });

  it('builds a hostname-based profile suggestion for custom websites', () => {
    expect(
      buildCustomSelectorRegistryProfileSuggestion('https://www.example-shop.com/item/123')
    ).toBe('example_shop_com');
  });

  it('infers the custom namespace from custom selector keys without breaking tradera fallback', () => {
    expect(inferSelectorRegistryNamespace({ selectorKey: 'custom.content.price' })).toBe(
      'custom'
    );
    expect(inferSelectorRegistryNamespace({ selectorKey: 'TITLE_SELECTORS' })).toBe('tradera');
  });
});
