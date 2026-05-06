/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  FolderTreeTransaction,
  MasterFolderTreeAdapterV3,
} from '@/shared/lib/foldertree/public';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { createDefaultKangurLessons } from '@/features/kangur/settings';
import {
  buildKangurLessonMasterNodes,
  toKangurLessonNodeId,
} from '@/features/kangur/admin/kangur-lessons-master-tree';
import { useLessonsManagerTree } from '../useLessonsManagerTree';

const { useMasterFolderTreeShellMock, useMasterFolderTreeSearchMock } = vi.hoisted(() => ({
  useMasterFolderTreeShellMock: vi.fn(),
  useMasterFolderTreeSearchMock: vi.fn(),
}));

vi.mock('@/shared/lib/foldertree/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/foldertree/public')>();
  return {
    ...actual,
    useMasterFolderTreeViewModel: (options: { nodes?: unknown[]; searchQuery?: string }) => {
      const shell = useMasterFolderTreeShellMock(options);
      const searchState = useMasterFolderTreeSearchMock(
        options.nodes ?? [],
        options.searchQuery ?? '',
        { config: shell.capabilities?.search }
      );

      return {
        ...shell,
        searchState,
      };
    },
    useMasterFolderTreeShell: (...args: unknown[]) => useMasterFolderTreeShellMock(...args),
    useMasterFolderTreeSearch: (...args: unknown[]) => useMasterFolderTreeSearchMock(...args),
  };
});

const createLessons = (): KangurLesson[] => {
  const [first, second] = createDefaultKangurLessons();
  if (!first || !second) {
    throw new Error('Expected default Kangur lessons to include at least two entries.');
  }

  return [
    {
      ...first,
      id: 'lesson-a',
      sortOrder: 1000,
    },
    {
      ...second,
      id: 'lesson-b',
      sortOrder: 2000,
    },
  ];
};

const getLatestTreeAdapter = (): MasterFolderTreeAdapterV3 => {
  const latestCall = useMasterFolderTreeShellMock.mock.calls.at(-1)?.[0] as
    | { adapter?: MasterFolderTreeAdapterV3 }
    | undefined;
  const adapter = latestCall?.adapter;
  if (!adapter) {
    throw new Error('Expected useMasterFolderTreeShell to receive a tree adapter.');
  }
  return adapter;
};

const createReorderTransaction = (lessons: KangurLesson[]): FolderTreeTransaction => {
  const [first, second] = lessons;
  if (!first || !second) {
    throw new Error('Expected two lessons for reorder transaction.');
  }

  return {
    id: 'tx-lesson-reorder',
    version: 1,
    createdAt: Date.now(),
    operation: {
      type: 'reorder',
      nodeId: toKangurLessonNodeId(second.id),
      targetId: toKangurLessonNodeId(first.id),
      position: 'before',
    },
    previousNodes: buildKangurLessonMasterNodes(lessons),
    nextNodes: buildKangurLessonMasterNodes([
      {
        ...second,
        sortOrder: 1000,
      },
      {
        ...first,
        sortOrder: 2000,
      },
    ]),
  };
};

describe('useLessonsManagerTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: true,
          debounceMs: 200,
          filterMode: 'highlight',
          matchFields: ['name'],
          minQueryLength: 1,
        },
      },
    });
    useMasterFolderTreeSearchMock.mockReturnValue({
      isActive: false,
      results: [],
    });
  });

  it('persists ordered lesson changes from the tree transaction next nodes', async () => {
    const lessons = createLessons();
    const onPersistLessons = vi.fn(async () => undefined);

    renderHook(() =>
      useLessonsManagerTree({
        filteredLessons: lessons,
        lessons,
        lessonById: new Map(lessons.map((lesson) => [lesson.id, lesson])),
        treeMode: 'ordered',
        onPersistLessons,
      })
    );

    const adapter = getLatestTreeAdapter();
    const tx = createReorderTransaction(lessons);

    await act(async () => {
      const prepared = await adapter.prepare(tx);
      await adapter.apply(tx, prepared);
    });

    expect(onPersistLessons).toHaveBeenCalledTimes(1);
    expect(onPersistLessons.mock.calls[0]?.[0].map((lesson: KangurLesson) => lesson.id)).toEqual([
      'lesson-b',
      'lesson-a',
    ]);
  });

  it('does not persist partial ordered trees created by lesson filters', async () => {
    const lessons = createLessons();
    const onPersistLessons = vi.fn(async () => undefined);

    renderHook(() =>
      useLessonsManagerTree({
        filteredLessons: [lessons[0]].filter(Boolean) as KangurLesson[],
        lessons,
        lessonById: new Map(lessons.map((lesson) => [lesson.id, lesson])),
        treeMode: 'ordered',
        onPersistLessons,
      })
    );

    const adapter = getLatestTreeAdapter();
    const tx = createReorderTransaction(lessons);

    await act(async () => {
      const prepared = await adapter.prepare(tx);
      await adapter.apply(tx, prepared);
    });

    expect(onPersistLessons).not.toHaveBeenCalled();
  });
});
