import { describe, expect, it } from 'vitest';

import type { KangurLesson } from '@/shared/contracts/kangur';

import {
  buildKangurLessonCatalogMasterNodes,
  buildKangurLessonMasterNodes,
  resolveKangurLessonOrderFromNodes,
  toKangurLessonNodeId,
} from '../kangur-lessons-master-tree';

const createLesson = (overrides: Partial<KangurLesson>): KangurLesson => ({
  id: 'lesson-default',
  componentId: 'clock',
  contentMode: 'component',
  title: 'Default lesson',
  description: 'Default description',
  emoji: '📚',
  color: 'kangur-gradient-accent-indigo',
  activeBg: 'bg-blue-600',
  sortOrder: 1_000,
  enabled: true,
  ...overrides,
});

describe('kangur-lessons-master-tree', () => {
  it('builds sorted file nodes with search metadata', () => {
    const lessons: KangurLesson[] = [
      createLesson({
        id: 'lesson-z',
        title: 'Geometry starter',
        description: 'Learn basic shapes.',
        componentId: 'geometry_basics',
        sortOrder: 3_000,
      }),
      createLesson({
        id: 'lesson-a',
        title: 'Clock starter',
        description: 'Read full hours.',
        componentId: 'clock',
        sortOrder: 1_000,
      }),
      createLesson({
        id: 'lesson-b',
        title: 'Calendar starter',
        description: 'Name weekdays.',
        componentId: 'calendar',
        sortOrder: 1_000,
        enabled: false,
      }),
    ];

    const nodes = buildKangurLessonMasterNodes(lessons);

    expect(nodes.map((node) => node.id)).toEqual([
      toKangurLessonNodeId('lesson-a'),
      toKangurLessonNodeId('lesson-b'),
      toKangurLessonNodeId('lesson-z'),
    ]);

    expect(nodes[1]?.metadata).toMatchObject({
      kangurLesson: {
        lessonId: 'lesson-b',
        componentId: 'calendar',
        contentMode: 'component',
        enabled: false,
        description: 'Name weekdays.',
      },
      search: {
        lessonId: 'lesson-b',
        componentId: 'calendar',
        contentMode: 'component',
        title: 'Calendar starter',
        description: 'Name weekdays.',
        visibility: 'hidden',
      },
    });
  });

  it('builds catalog nodes grouped by visibility and component', () => {
    const lessons: KangurLesson[] = [
      createLesson({
        id: 'clock-visible',
        componentId: 'clock',
        title: 'Clock visible',
        enabled: true,
      }),
      createLesson({
        id: 'geometry-hidden',
        componentId: 'geometry_basics',
        title: 'Geometry hidden',
        enabled: false,
      }),
    ];

    const nodes = buildKangurLessonCatalogMasterNodes(lessons);
    const enabledGroup = nodes.find((node) => node.id === 'kangur-lesson-group:enabled');
    const hiddenGroup = nodes.find((node) => node.id === 'kangur-lesson-group:hidden');
    const clockComponent = nodes.find(
      (node) => node.id === 'kangur-lesson-component-group:enabled:clock'
    );
    const geometryComponent = nodes.find(
      (node) => node.id === 'kangur-lesson-component-group:hidden:geometry_basics'
    );
    const clockLesson = nodes.find((node) => node.id === toKangurLessonNodeId('clock-visible'));
    const geometryLesson = nodes.find(
      (node) => node.id === toKangurLessonNodeId('geometry-hidden')
    );

    expect(enabledGroup?.type).toBe('folder');
    expect(hiddenGroup?.type).toBe('folder');
    expect(clockComponent?.parentId).toBe('kangur-lesson-group:enabled');
    expect(geometryComponent?.parentId).toBe('kangur-lesson-group:hidden');
    expect(clockLesson?.parentId).toBe('kangur-lesson-component-group:enabled:clock');
    expect(geometryLesson?.parentId).toBe('kangur-lesson-component-group:hidden:geometry_basics');
    expect(geometryLesson?.path).toContain('hidden/geometry_basics/geometry-hidden');
  });

  it('resolves reordered lesson order from master nodes', () => {
    const lessons: KangurLesson[] = [
      createLesson({ id: 'one', title: 'One', sortOrder: 1_000 }),
      createLesson({ id: 'two', title: 'Two', sortOrder: 2_000 }),
      createLesson({ id: 'three', title: 'Three', sortOrder: 3_000 }),
    ];
    const lessonById = new Map(
      lessons.map((lesson): [string, KangurLesson] => [lesson.id, lesson])
    );
    const nodes = buildKangurLessonMasterNodes(lessons);
    const nodesByPath = new Map(nodes.map((node) => [node.path, node] as const));
    const reorderedNodes = ['three', 'one', 'two'].map((id, index) => {
      const node = nodesByPath.get(id);
      if (!node) {
        throw new Error(`Missing node for lesson ${id}`);
      }
      return {
        ...node,
        sortOrder: (index + 1) * 1_000,
      };
    });

    const reordered = resolveKangurLessonOrderFromNodes(reorderedNodes, lessonById);
    expect(reordered.map((lesson) => lesson.id)).toEqual(['three', 'one', 'two']);
    expect(reordered.map((lesson) => lesson.sortOrder)).toEqual([1_000, 2_000, 3_000]);
  });

  it('falls back to existing lesson ordering when nodes are empty', () => {
    const lessons: KangurLesson[] = [
      createLesson({ id: 'two', sortOrder: 2_000 }),
      createLesson({ id: 'one', sortOrder: 1_000 }),
    ];
    const lessonById = new Map(
      lessons.map((lesson): [string, KangurLesson] => [lesson.id, lesson])
    );

    const reordered = resolveKangurLessonOrderFromNodes([], lessonById);
    expect(reordered.map((lesson) => lesson.id)).toEqual(['one', 'two']);
  });
});
