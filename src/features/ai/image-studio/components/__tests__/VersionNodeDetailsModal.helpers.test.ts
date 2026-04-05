import { describe, expect, it } from 'vitest';

import {
  formatVersionNodeIdList,
  resolveOperationSummary,
} from '../VersionNodeDetailsModal.helpers';

describe('VersionNodeDetailsModal helpers', () => {
  it('formats version-node id lists with an n/a fallback', () => {
    expect(formatVersionNodeIdList([])).toBe('n/a');
    expect(formatVersionNodeIdList(['slot-1', 'slot-2'])).toBe('slot-1, slot-2');
  });

  it('resolves crop summaries from nested metadata', () => {
    expect(
      resolveOperationSummary({
        relationType: 'crop:manual',
        timestamp: '2026-04-02T12:00:00.000Z',
        crop: {
          timestamp: '2026-04-03T09:15:00.000Z',
          left: 10,
        },
      })
    ).toEqual({
      label: 'Crop',
      relationType: 'crop:manual',
      timestamp: '2026-04-03T09:15:00.000Z',
      operationMetadata: {
        timestamp: '2026-04-03T09:15:00.000Z',
        left: 10,
      },
    });
  });

  it('falls back to role-based labels for unknown relation types', () => {
    expect(
      resolveOperationSummary({
        relationType: 'analysis:layout',
        role: ' preview ',
      })
    ).toEqual({
      label: 'Preview',
      relationType: 'analysis:layout',
      timestamp: null,
      operationMetadata: {
        relationType: 'analysis:layout',
        role: ' preview ',
      },
    });
  });
});
