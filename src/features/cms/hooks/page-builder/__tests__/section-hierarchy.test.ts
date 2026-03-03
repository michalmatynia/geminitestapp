import { describe, expect, it } from 'vitest';

import {
  buildHierarchyIndexes,
  cloneSectionSubtree,
  flattenByZonePreorder,
  isDescendant,
  moveSectionSubtree,
  removeSectionSubtree,
  sanitizeSectionHierarchy,
} from '@/features/cms/hooks/page-builder/section-hierarchy';
import type { SectionInstance } from '@/shared/contracts/cms';

const section = (overrides: Partial<SectionInstance>): SectionInstance =>
  ({
    id: 'section-default',
    type: 'Hero',
    zone: 'template',
    parentSectionId: null,
    settings: {},
    blocks: [],
    ...overrides,
  }) as SectionInstance;

describe('section-hierarchy', () => {
  it('sanitizes invalid parents and enforces zone inheritance', () => {
    const input = [
      section({ id: 'header-root', zone: 'header', parentSectionId: null }),
      section({ id: 'child-a', zone: 'template', parentSectionId: 'header-root' }),
      section({ id: 'orphan', zone: 'footer', parentSectionId: 'missing' }),
    ];

    const output = sanitizeSectionHierarchy(input);
    const byId = new Map(output.map((item: SectionInstance) => [item.id, item]));

    expect(byId.get('child-a')?.zone).toBe('header');
    expect(byId.get('orphan')?.parentSectionId ?? null).toBe(null);
  });

  it('breaks parent cycles by detaching invalid parent links', () => {
    const input = [
      section({ id: 'a', parentSectionId: 'c' }),
      section({ id: 'b', parentSectionId: 'a' }),
      section({ id: 'c', parentSectionId: 'b' }),
    ];

    const output = sanitizeSectionHierarchy(input);
    const roots = output.filter((item: SectionInstance) => !item.parentSectionId);

    expect(roots.length).toBeGreaterThan(0);
  });

  it('builds hierarchy indexes with depth map', () => {
    const input = [
      section({ id: 'root', zone: 'template' }),
      section({ id: 'child', parentSectionId: 'root' }),
      section({ id: 'grandchild', parentSectionId: 'child' }),
    ];

    const { depthById } = buildHierarchyIndexes(input);
    expect(depthById.get('root')).toBe(1);
    expect(depthById.get('child')).toBe(2);
    expect(depthById.get('grandchild')).toBe(3);
  });

  it('flattens sections by zone preorder', () => {
    const input = [
      section({ id: 'template-root', zone: 'template' }),
      section({ id: 'template-child', zone: 'template', parentSectionId: 'template-root' }),
      section({ id: 'header-root', zone: 'header' }),
    ];

    const ids = flattenByZonePreorder(input).map((item: SectionInstance) => item.id);
    expect(ids).toEqual(['header-root', 'template-root', 'template-child']);
  });

  it('detects descendant relationships', () => {
    const input = [
      section({ id: 'root' }),
      section({ id: 'child', parentSectionId: 'root' }),
      section({ id: 'grandchild', parentSectionId: 'child' }),
    ];

    expect(isDescendant(input, 'root', 'grandchild')).toBe(true);
    expect(isDescendant(input, 'child', 'root')).toBe(false);
  });

  it('moves subtree into parent and inherits zone', () => {
    const input = [
      section({ id: 'header-root', zone: 'header' }),
      section({ id: 'template-root', zone: 'template' }),
      section({ id: 'template-child', zone: 'template', parentSectionId: 'template-root' }),
    ];

    const result = moveSectionSubtree(input, {
      sectionId: 'template-root',
      toZone: 'header',
      toParentSectionId: 'header-root',
      toIndex: 0,
    });

    expect(result.ok).toBe(true);
    const byId = new Map(result.sections.map((item: SectionInstance) => [item.id, item]));
    expect(byId.get('template-root')?.parentSectionId).toBe('header-root');
    expect(byId.get('template-root')?.zone).toBe('header');
    expect(byId.get('template-child')?.zone).toBe('header');
  });

  it('rejects moves that exceed max depth', () => {
    const input = [
      section({ id: 'root' }),
      section({ id: 'l2', parentSectionId: 'root' }),
      section({ id: 'l3', parentSectionId: 'l2' }),
      section({ id: 'l4', parentSectionId: 'l3' }),
      section({ id: 'l5', parentSectionId: 'l4' }),
      section({ id: 'branch-root' }),
      section({ id: 'branch-child', parentSectionId: 'branch-root' }),
    ];

    const result = moveSectionSubtree(input, {
      sectionId: 'branch-root',
      toZone: 'template',
      toParentSectionId: 'l5',
      toIndex: 0,
      maxDepth: 5,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('DEPTH_LIMIT_EXCEEDED');
  });

  it('removes full subtree', () => {
    const input = [
      section({ id: 'root' }),
      section({ id: 'child', parentSectionId: 'root' }),
      section({ id: 'grandchild', parentSectionId: 'child' }),
      section({ id: 'other' }),
    ];

    const result = removeSectionSubtree(input, 'child');
    const ids = result.map((item: SectionInstance) => item.id);
    expect(ids).toEqual(['root', 'other']);
  });

  it('clones full subtree with remapped parent ids', () => {
    const input = [
      section({ id: 'root' }),
      section({ id: 'child', parentSectionId: 'root' }),
      section({ id: 'grandchild', parentSectionId: 'child' }),
    ];

    let counter = 0;
    const clones = cloneSectionSubtree(input, 'root', () => `clone-${++counter}`);

    expect(clones).toHaveLength(3);
    expect(clones[0]?.id).toBe('clone-1');
    expect(clones[0]?.parentSectionId ?? null).toBe(null);
    expect(clones[1]?.parentSectionId).toBe('clone-1');
    expect(clones[2]?.parentSectionId).toBe('clone-2');
  });
});
