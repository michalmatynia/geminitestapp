import { describe, expect, it } from 'vitest';

import {
  buildParameterLinkScopeKey,
  parseScopedCatalogParameterLinkMap,
  stringifyScopedCatalogParameterLinkMap,
} from '@/features/integrations/services/imports/parameter-import/link-map-preference';

describe('parameter-link-map-preference', () => {
  it('parses canonical v2 scoped link-map payload', () => {
    const parsed = parseScopedCatalogParameterLinkMap(
      JSON.stringify({
        defaultByCatalog: {
          'cat-1': {
            'base-1': 'param-1',
          },
        },
        byScope: {
          'conn-1::inv-1': {
            'cat-2': {
              'base-2': 'param-2',
            },
          },
        },
      })
    );

    expect(parsed).toEqual({
      defaultByCatalog: {
        'cat-1': {
          'base-1': 'param-1',
        },
      },
      byScope: {
        'conn-1::inv-1': {
          'cat-2': {
            'base-2': 'param-2',
          },
        },
      },
    });
  });

  it('does not parse legacy non-v2 payloads', () => {
    expect(
      parseScopedCatalogParameterLinkMap(
        JSON.stringify({
          __global__: {
            'cat-1': {
              'base-1': 'param-1',
            },
          },
          'conn-1::inv-1': {
            'cat-2': {
              'base-2': 'param-2',
            },
          },
        })
      )
    ).toEqual({
      defaultByCatalog: {},
      byScope: {},
    });

    expect(parseScopedCatalogParameterLinkMap('legacy-payload')).toEqual({
      defaultByCatalog: {},
      byScope: {},
    });
  });

  it('stringifies to canonical v2 map shape', () => {
    expect(
      stringifyScopedCatalogParameterLinkMap({
        defaultByCatalog: {
          'cat-2': { 'base-2': 'param-2' },
          'cat-1': { 'base-1': 'param-1' },
        },
        byScope: {
          invalid: {
            ignored: {
              x: 'y',
            },
          },
          'conn-2::inv-2': {
            'cat-2': { 'base-2': 'param-2' },
          },
          'conn-1::inv-1': {
            'cat-1': { 'base-1': 'param-1' },
          },
        },
      })
    ).toBe(
      JSON.stringify({
        defaultByCatalog: {
          'cat-1': { 'base-1': 'param-1' },
          'cat-2': { 'base-2': 'param-2' },
        },
        byScope: {
          'conn-1::inv-1': {
            'cat-1': { 'base-1': 'param-1' },
          },
          'conn-2::inv-2': {
            'cat-2': { 'base-2': 'param-2' },
          },
        },
      })
    );
  });

  it('builds scope key only when both connection and inventory are provided', () => {
    expect(
      buildParameterLinkScopeKey({
        connectionId: ' conn-1 ',
        inventoryId: ' inv-1 ',
      })
    ).toBe('conn-1::inv-1');
    expect(
      buildParameterLinkScopeKey({
        connectionId: 'conn-1',
        inventoryId: '',
      })
    ).toBeNull();
    expect(buildParameterLinkScopeKey()).toBeNull();
  });
});
