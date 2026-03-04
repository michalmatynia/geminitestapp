import { describe, expect, it } from 'vitest';

import {
  buildActiveTemplateScopeKey,
  parseScopedActiveTemplateMap,
  stringifyScopedActiveTemplateMap,
} from '@/features/integrations/services/active-template-preference';

describe('active-template-preference', () => {
  it('parses canonical v2 scoped map payload', () => {
    const map = parseScopedActiveTemplateMap(
      JSON.stringify({
        defaultTemplateId: 'tpl-default',
        byScope: {
          'conn-1::inv-1': 'tpl-scope',
        },
      })
    );

    expect(map).toEqual({
      defaultTemplateId: 'tpl-default',
      byScope: {
        'conn-1::inv-1': 'tpl-scope',
      },
    });
  });

  it('does not parse legacy non-v2 payloads', () => {
    expect(parseScopedActiveTemplateMap('legacy-template-id')).toEqual({
      defaultTemplateId: null,
      byScope: {},
    });

    expect(
      parseScopedActiveTemplateMap(
        JSON.stringify({
          templateId: 'legacy-template-id',
          'conn-1::inv-1': 'legacy-scope-template-id',
          byScope: {
            __global__: 'legacy-global',
          },
        })
      )
    ).toEqual({
      defaultTemplateId: null,
      byScope: {},
    });
  });

  it('stringifies to canonical v2 map shape', () => {
    expect(
      stringifyScopedActiveTemplateMap({
        defaultTemplateId: 'tpl-default',
        byScope: {
          'conn-2::inv-2': 'tpl-2',
          'conn-1::inv-1': 'tpl-1',
          invalid: 'tpl-invalid',
        },
      })
    ).toBe(
      JSON.stringify({
        defaultTemplateId: 'tpl-default',
        byScope: {
          'conn-1::inv-1': 'tpl-1',
          'conn-2::inv-2': 'tpl-2',
        },
      })
    );
  });

  it('builds a scope key only when connection and inventory are provided', () => {
    expect(
      buildActiveTemplateScopeKey({
        connectionId: ' conn-1 ',
        inventoryId: ' inv-1 ',
      })
    ).toBe('conn-1::inv-1');
    expect(
      buildActiveTemplateScopeKey({
        connectionId: 'conn-1',
        inventoryId: '',
      })
    ).toBeNull();
    expect(buildActiveTemplateScopeKey()).toBeNull();
  });
});

