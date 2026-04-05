import { describe, expect, it, vi } from 'vitest';

import type { CaseResolverTag } from '@/shared/contracts/case-resolver/relations';

import {
  buildNextTagsForDelete,
  buildNextTagsForSave,
  buildParentTagOptions,
  buildTagPathLabelMap,
  buildTagPathOptions,
  collectDescendantTagIds,
} from './AdminCaseResolverTagsPage.helpers';

const createTag = (overrides: Partial<CaseResolverTag> = {}): CaseResolverTag => ({
  id: overrides.id ?? 'tag-1',
  label: overrides.label ?? 'Root',
  color: overrides.color ?? '#38bdf8',
  parentId: overrides.parentId ?? null,
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('AdminCaseResolverTagsPage.helpers', () => {
  it('builds nested path labels, descendant sets, and filtered parent options', () => {
    const tags = [
      createTag({ id: 'root', label: 'Root' }),
      createTag({ id: 'child', label: 'Child', parentId: 'root' }),
      createTag({ id: 'grandchild', label: 'Grandchild', parentId: 'child' }),
    ];

    const tagPathOptions = buildTagPathOptions(tags);

    expect(tagPathOptions).toEqual([
      { id: 'root', label: 'Root', pathIds: ['root'] },
      { id: 'child', label: 'Root / Child', pathIds: ['root', 'child'] },
      {
        id: 'grandchild',
        label: 'Root / Child / Grandchild',
        pathIds: ['root', 'child', 'grandchild'],
      },
    ]);
    expect(buildTagPathLabelMap(tagPathOptions).get('grandchild')).toBe('Root / Child / Grandchild');
    expect(collectDescendantTagIds(tags, 'child')).toEqual(new Set(['child', 'grandchild']));
    expect(buildParentTagOptions(tagPathOptions, new Set(['child', 'grandchild']))).toEqual([
      { value: 'root', label: 'Root' },
    ]);
  });

  it('builds save payloads for new and edited tags and rejects blank names', () => {
    const originalCrypto = globalThis.crypto;

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...(globalThis.crypto ?? {}),
        randomUUID: vi.fn().mockReturnValue('new-id'),
      },
    });

    expect(
      buildNextTagsForSave({
        editingTag: null,
        formData: { name: '   ', color: '#123456', parentId: null },
        tags: [],
        now: '2026-01-02T00:00:00.000Z',
      })
    ).toBeNull();

    expect(
      buildNextTagsForSave({
        editingTag: null,
        formData: { name: ' Evidence ', color: ' ', parentId: 'root' },
        tags: [createTag({ id: 'root', label: 'Root' })],
        now: '2026-01-02T00:00:00.000Z',
      })
    ).toEqual([
      createTag({ id: 'root', label: 'Root' }),
      {
        id: 'case-tag-new-id',
        label: 'Evidence',
        parentId: 'root',
        color: '#38bdf8',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);

    const editingTag = createTag({ id: 'edit-1', label: 'Old', parentId: 'root' });
    expect(
      buildNextTagsForSave({
        editingTag,
        formData: { name: 'New', color: '#abcdef', parentId: 'edit-1' },
        tags: [editingTag],
        now: '2026-01-03T00:00:00.000Z',
      })
    ).toEqual([
      {
        ...editingTag,
        label: 'New',
        parentId: null,
        color: '#abcdef',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
    ]);

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });

  it('builds delete payloads that reparent direct children to root', () => {
    const tags = [
      createTag({ id: 'root', label: 'Root' }),
      createTag({ id: 'child', label: 'Child', parentId: 'root' }),
      createTag({ id: 'sibling', label: 'Sibling', parentId: 'root' }),
    ];

    expect(
      buildNextTagsForDelete({
        tagToDelete: tags[0]!,
        tags,
        now: '2026-01-04T00:00:00.000Z',
      })
    ).toEqual([
      {
        ...tags[1]!,
        parentId: null,
        updatedAt: '2026-01-04T00:00:00.000Z',
      },
      {
        ...tags[2]!,
        parentId: null,
        updatedAt: '2026-01-04T00:00:00.000Z',
      },
    ]);
  });
});
