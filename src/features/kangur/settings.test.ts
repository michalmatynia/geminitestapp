import { describe, expect, it } from 'vitest';

import {
  appendMissingGeometryKangurLessons,
  appendMissingLogicalThinkingKangurLessons,
  createDefaultKangurLessons,
  normalizeKangurLessons,
} from '@/features/kangur/settings';

describe('kangur lesson settings', () => {
  it('includes geometry lessons in default library', () => {
    const lessons = createDefaultKangurLessons();
    const componentIds = lessons.map((lesson) => lesson.componentId);

    expect(componentIds).toContain('geometry_basics');
    expect(componentIds).toContain('geometry_shapes');
    expect(componentIds).toContain('geometry_symmetry');
    expect(componentIds).toContain('geometry_perimeter');
  });

  it('includes logical thinking lessons in default library', () => {
    const lessons = createDefaultKangurLessons();
    const componentIds = lessons.map((lesson) => lesson.componentId);

    expect(componentIds).toContain('logical_thinking');
    expect(componentIds).toContain('logical_patterns');
    expect(componentIds).toContain('logical_classification');
    expect(componentIds).toContain('logical_reasoning');
    expect(componentIds).toContain('logical_analogies');
  });

  it('normalizes explicit geometry lessons payload', () => {
    const parsed = normalizeKangurLessons([
      {
        id: 'g1',
        componentId: 'geometry_shapes',
        title: 'Figury',
        description: 'Opis',
        emoji: '🔷',
        color: 'from-fuchsia-500 to-violet-500',
        activeBg: 'bg-fuchsia-500',
        sortOrder: 1000,
        enabled: true,
      },
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.componentId).toBe('geometry_shapes');
    expect(parsed[0]?.title).toBe('Figury');
  });

  it('appends missing geometry lessons to an existing legacy-like list', () => {
    const defaultLessons = createDefaultKangurLessons();
    const legacyLike = defaultLessons.filter(
      (lesson) =>
        lesson.componentId !== 'geometry_basics' &&
        lesson.componentId !== 'geometry_shapes' &&
        lesson.componentId !== 'geometry_symmetry' &&
        lesson.componentId !== 'geometry_perimeter'
    );

    const result = appendMissingGeometryKangurLessons(legacyLike);
    const componentIds = result.lessons.map((lesson) => lesson.componentId);

    expect(result.addedCount).toBe(4);
    expect(componentIds).toContain('geometry_basics');
    expect(componentIds).toContain('geometry_shapes');
    expect(componentIds).toContain('geometry_symmetry');
    expect(componentIds).toContain('geometry_perimeter');
  });

  it('does not duplicate geometry lessons when pack already exists', () => {
    const existing = createDefaultKangurLessons();
    const result = appendMissingGeometryKangurLessons(existing);

    expect(result.addedCount).toBe(0);
    expect(result.lessons).toHaveLength(existing.length);
  });

  it('appends missing logical thinking lessons to an existing legacy-like list', () => {
    const defaultLessons = createDefaultKangurLessons();
    const legacyLike = defaultLessons.filter(
      (lesson) =>
        lesson.componentId !== 'logical_thinking' &&
        lesson.componentId !== 'logical_patterns' &&
        lesson.componentId !== 'logical_classification' &&
        lesson.componentId !== 'logical_reasoning' &&
        lesson.componentId !== 'logical_analogies'
    );

    const result = appendMissingLogicalThinkingKangurLessons(legacyLike);
    const componentIds = result.lessons.map((lesson) => lesson.componentId);

    expect(result.addedCount).toBe(5);
    expect(componentIds).toContain('logical_thinking');
    expect(componentIds).toContain('logical_patterns');
    expect(componentIds).toContain('logical_classification');
    expect(componentIds).toContain('logical_reasoning');
    expect(componentIds).toContain('logical_analogies');
  });

  it('does not duplicate logical thinking lessons when pack already exists', () => {
    const existing = createDefaultKangurLessons();
    const result = appendMissingLogicalThinkingKangurLessons(existing);

    expect(result.addedCount).toBe(0);
    expect(result.lessons).toHaveLength(existing.length);
  });
});
