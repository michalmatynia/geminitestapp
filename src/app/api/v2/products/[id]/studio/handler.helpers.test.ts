import { describe, expect, it } from 'vitest';

import {
  buildEmptyProductStudioConfigResponse,
  buildProductStudioConfigResponse,
  buildProductStudioPutInput,
  parseProductStudioPutPayload,
  requireProductStudioProductId,
} from './handler.helpers';

describe('product studio handler helpers', () => {
  it('requires a trimmed product id', () => {
    expect(requireProductStudioProductId({ id: ' product-1 ' })).toBe('product-1');
    expect(() => requireProductStudioProductId({ id: '   ' })).toThrow(
      'Product id is required.'
    );
  });

  it('builds empty and populated config responses', () => {
    expect(buildEmptyProductStudioConfigResponse('2026-01-01T00:00:00.000Z')).toEqual({
      config: {
        projectId: null,
        sourceSlotByImageIndex: {},
        sourceSlotHistoryByImageIndex: {},
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    expect(
      buildProductStudioConfigResponse({
        projectId: 'project-1',
        sourceSlotByImageIndex: { '0': 'slot-1' },
        sourceSlotHistoryByImageIndex: { '0': ['slot-1'] },
        updatedAt: '2026-01-02T00:00:00.000Z',
      })
    ).toEqual({
      config: {
        projectId: 'project-1',
        sourceSlotByImageIndex: { '0': 'slot-1' },
        sourceSlotHistoryByImageIndex: { '0': ['slot-1'] },
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    });
  });

  it('parses PUT payloads and preserves only defined updates', () => {
    expect(parseProductStudioPutPayload({ projectId: ' project-7 ' })).toEqual({
      projectId: 'project-7',
    });
    expect(buildProductStudioPutInput({ projectId: null })).toEqual({ projectId: null });
    expect(buildProductStudioPutInput({})).toEqual({});
    expect(() => parseProductStudioPutPayload({ projectId: 42 })).toThrow('Invalid payload.');
  });
});
