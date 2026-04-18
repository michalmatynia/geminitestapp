import { describe, expect, it } from 'vitest';

import {
  applySelectorRegistryProbeCarryForwardDefaults,
  applySelectorRegistryProbeCarryForwardManualSelection,
  buildSelectorRegistryProbeCarryForwardDefaultKeysByRole,
  buildSelectorRegistryProbeEntriesByRole,
  buildSelectorRegistryProbeCarryForwardInheritedCounts,
  buildSelectorRegistryProbeCarryForwardItems,
  buildSelectorRegistryProbeCarryForwardSources,
  buildSelectorRegistryProbeCarryForwardSummaries,
  isSelectorRegistryProbeCarryForwardInherited,
  type SelectorRegistryProbeCarryForwardItem,
} from './selector-registry-probe-carry-forward';

const items: SelectorRegistryProbeCarryForwardItem[] = [
  {
    itemId: 'price-1',
    role: 'content_price',
    defaultKey: 'amazon.product.price',
  },
  {
    itemId: 'price-2',
    role: 'content_price',
    defaultKey: 'amazon.product.price',
  },
  {
    itemId: 'title-1',
    role: 'content_title',
    defaultKey: 'amazon.product.title',
  },
];

describe('selector-registry probe carry-forward helper', () => {
  it('groups promotable entries by role', () => {
    const entriesByRole = buildSelectorRegistryProbeEntriesByRole([
      { role: 'content_price', key: 'amazon.product.price' },
      { role: 'content_price', key: 'amazon.product.sale_price' },
      { role: 'content_title', key: 'amazon.product.title' },
    ]);

    expect(entriesByRole.get('content_price')).toEqual([
      { role: 'content_price', key: 'amazon.product.price' },
      { role: 'content_price', key: 'amazon.product.sale_price' },
    ]);
    expect(entriesByRole.get('content_title')).toEqual([
      { role: 'content_title', key: 'amazon.product.title' },
    ]);
  });

  it('builds carry-forward items from a shared role-to-default-key lookup', () => {
    const defaultKeysByRole = buildSelectorRegistryProbeCarryForwardDefaultKeysByRole([
      { role: 'content_price', key: 'amazon.product.price' },
      { role: 'content_price', key: 'amazon.product.sale_price' },
      { role: 'content_title', key: 'amazon.product.title' },
    ]);

    expect(
      buildSelectorRegistryProbeCarryForwardItems({
        items: [
          { id: 'price-1', role: 'content_price' },
          { id: 'title-1', role: 'content_title' },
        ],
        getItemId: (item) => item.id,
        getRole: (item) => item.role,
        defaultKeysByRole,
      })
    ).toEqual([
      {
        itemId: 'price-1',
        role: 'content_price',
        defaultKey: 'amazon.product.price',
      },
      {
        itemId: 'title-1',
        role: 'content_title',
        defaultKey: 'amazon.product.title',
      },
    ]);
  });

  it('applies manual same-role selections across untouched items', () => {
    const selectedKeys = applySelectorRegistryProbeCarryForwardDefaults({
      items,
      selectedKeys: {
        'price-1': 'amazon.product.sale_price',
      },
      manuallySelectedKeys: {
        'price-1': true,
      },
    });

    expect(selectedKeys).toEqual({
      'price-1': 'amazon.product.sale_price',
      'price-2': 'amazon.product.sale_price',
      'title-1': 'amazon.product.title',
    });

    expect(
      buildSelectorRegistryProbeCarryForwardSummaries({
        items,
        selectedKeys,
      })
    ).toEqual([
      {
        role: 'content_price',
        selectedKey: 'amazon.product.sale_price',
      },
    ]);
  });

  it('uses the same propagation rules for manual selection fanout', () => {
    const nextState = applySelectorRegistryProbeCarryForwardManualSelection({
      items,
      selectedKeys: {
        'price-1': 'amazon.product.price',
        'price-2': 'amazon.product.price',
        'title-1': 'amazon.product.title',
      },
      manuallySelectedKeys: {},
      itemId: 'price-1',
      selectedKey: 'amazon.product.sale_price',
    });

    expect(nextState.manuallySelectedKeys).toEqual({
      'price-1': true,
    });
    expect(nextState.selectedKeys).toEqual({
      'price-1': 'amazon.product.sale_price',
      'price-2': 'amazon.product.sale_price',
      'title-1': 'amazon.product.title',
    });
  });

  it('marks inherited items and counts their carry-forward source', () => {
    const selectedKeys = {
      'price-1': 'amazon.product.sale_price',
      'price-2': 'amazon.product.sale_price',
      'title-1': 'amazon.product.title',
    };
    const manuallySelectedKeys = {
      'price-1': true,
    };

    const carryForwardSourcesByRole = buildSelectorRegistryProbeCarryForwardSources({
      items,
      selectedKeys,
      manuallySelectedKeys,
    });

    expect(
      isSelectorRegistryProbeCarryForwardInherited({
        itemId: 'price-2',
        role: 'content_price',
        selectedKey: selectedKeys['price-2'],
        manuallySelectedKeys,
        carryForwardSourcesByRole,
      })
    ).toBe(true);

    expect(
      isSelectorRegistryProbeCarryForwardInherited({
        itemId: 'price-1',
        role: 'content_price',
        selectedKey: selectedKeys['price-1'],
        manuallySelectedKeys,
        carryForwardSourcesByRole,
      })
    ).toBe(false);

    expect(
      buildSelectorRegistryProbeCarryForwardInheritedCounts({
        items,
        selectedKeys,
        manuallySelectedKeys,
        carryForwardSourcesByRole,
      })
    ).toEqual({
      'price-1': 1,
    });
  });
});
