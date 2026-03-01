import { describe, expect, it } from 'vitest';

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { getMasterTreeNodeStatus } from '../node-status';

const node = (metadata?: Record<string, unknown>): MasterTreeNode => ({
  id: 'n1',
  type: 'file',
  kind: 'note',
  parentId: null,
  name: 'Test',
  path: 'Test',
  sortOrder: 0,
  metadata,
});

describe('getMasterTreeNodeStatus', () => {
  it('returns null when metadata is absent', () => {
    expect(getMasterTreeNodeStatus(node())).toBeNull();
  });

  it('returns null when _status is not set', () => {
    expect(getMasterTreeNodeStatus(node({ other: 'value' }))).toBeNull();
  });

  it('returns null for an unrecognized status value', () => {
    expect(getMasterTreeNodeStatus(node({ _status: 'unknown' }))).toBeNull();
  });

  it('returns null for non-string _status', () => {
    expect(getMasterTreeNodeStatus(node({ _status: 42 }))).toBeNull();
    expect(getMasterTreeNodeStatus(node({ _status: null }))).toBeNull();
    expect(getMasterTreeNodeStatus(node({ _status: true }))).toBeNull();
  });

  it.each([
    ['loading'],
    ['error'],
    ['locked'],
    ['warning'],
    ['success'],
  ] as const)('returns %s when _status is "%s"', (status) => {
    expect(getMasterTreeNodeStatus(node({ _status: status }))).toBe(status);
  });
});
