import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { ResolvedFolderTreeSearchConfig } from '@/shared/utils/folder-tree-profiles-v2';

import { useMasterFolderTreeSearch } from '../useMasterFolderTreeSearch';

const makeConfig = (
  overrides: Partial<ResolvedFolderTreeSearchConfig> = {}
): ResolvedFolderTreeSearchConfig => ({
  enabled: true,
  debounceMs: 0,
  filterMode: 'filter_tree',
  matchFields: ['name', 'path', 'metadata'],
  minQueryLength: 1,
  ...overrides,
});

const nodes: MasterTreeNode[] = [
  {
    id: 'root',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'Root',
    path: '/cases',
    sortOrder: 0,
  },
  {
    id: 'folder-a',
    type: 'folder',
    kind: 'folder',
    parentId: 'root',
    name: 'Alpha',
    path: '/cases/alpha',
    sortOrder: 0,
    metadata: {
      marker: 'classified',
    },
  },
  {
    id: 'file-a',
    type: 'file',
    kind: 'case_file',
    parentId: 'folder-a',
    name: 'Document Alpha',
    path: '/cases/alpha/document-alpha',
    sortOrder: 0,
  },
  {
    id: 'file-b',
    type: 'file',
    kind: 'case_file',
    parentId: 'root',
    name: 'Other Evidence',
    path: '/cases/other/evidence',
    sortOrder: 1,
  },
];

describe('useMasterFolderTreeSearch runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('respects debounceMs before applying query updates', () => {
    const config = makeConfig({ debounceMs: 120 });

    const { result, rerender } = renderHook(
      (props: { query: string }) =>
        useMasterFolderTreeSearch(nodes, props.query, {
          config,
        }),
      {
        initialProps: { query: '' },
      }
    );

    rerender({ query: 'document' });

    expect(result.current.effectiveQuery).toBe('');
    expect(result.current.isActive).toBe(false);

    act(() => {
      vi.advanceTimersByTime(119);
    });

    expect(result.current.effectiveQuery).toBe('');
    expect(result.current.isActive).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.effectiveQuery).toBe('document');
    expect(result.current.isActive).toBe(true);
    expect(result.current.matchNodeIds.has('file-a')).toBe(true);
  });

  it('enforces minQueryLength before activating search', () => {
    const config = makeConfig({ minQueryLength: 2, debounceMs: 0 });

    const { result, rerender } = renderHook(
      (props: { query: string }) =>
        useMasterFolderTreeSearch(nodes, props.query, {
          config,
        }),
      {
        initialProps: { query: 'a' },
      }
    );

    expect(result.current.isActive).toBe(false);
    expect(result.current.results).toEqual([]);

    rerender({ query: 'al' });
    expect(result.current.isActive).toBe(true);
    expect(result.current.results.length).toBeGreaterThan(0);
  });

  it('respects matchFields for metadata and path matching', () => {
    const { result, rerender } = renderHook(
      (props: { query: string; config: ResolvedFolderTreeSearchConfig }) =>
        useMasterFolderTreeSearch(nodes, props.query, {
          config: props.config,
        }),
      {
        initialProps: {
          query: 'classified',
          config: makeConfig({ matchFields: ['metadata'] }),
        },
      }
    );

    expect(result.current.matchNodeIds.has('folder-a')).toBe(true);
    expect(result.current.matchNodeIds.has('file-a')).toBe(false);

    rerender({
      query: '/cases/alpha',
      config: makeConfig({ matchFields: ['path'] }),
    });

    expect(result.current.matchNodeIds.has('folder-a')).toBe(true);
    expect(result.current.matchNodeIds.has('file-a')).toBe(true);
  });
});
