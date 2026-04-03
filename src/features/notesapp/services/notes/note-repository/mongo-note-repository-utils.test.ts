import { describe, expect, it } from 'vitest';

import { buildSearchFilter } from './mongo-note-repository-utils';

describe('buildSearchFilter', () => {
  it('builds a combined title/content regex filter by default', () => {
    expect(
      buildSearchFilter({
        notebookId: 'notebook-1',
        search: 'plan',
      })
    ).toEqual({
      notebookId: 'notebook-1',
      $or: [
        { title: { $regex: 'plan', $options: 'i' } },
        { content: { $regex: 'plan', $options: 'i' } },
      ],
    });
  });

  it('supports scoped search, boolean flags, and tag/category filters', () => {
    expect(
      buildSearchFilter({
        search: 'report',
        searchScope: 'title',
        isPinned: true,
        isArchived: false,
        isFavorite: true,
        tagIds: ['tag-1', 'tag-2'],
        categoryIds: ['category-1'],
      })
    ).toEqual({
      title: { $regex: 'report', $options: 'i' },
      isPinned: true,
      isArchived: false,
      isFavorite: true,
      tags: { $elemMatch: { tagId: { $in: ['tag-1', 'tag-2'] } } },
      categories: { $elemMatch: { categoryId: { $in: ['category-1'] } } },
    });
  });

  it('uses a content-only regex when requested and ignores empty embedded-id filters', () => {
    expect(
      buildSearchFilter({
        search: 'draft',
        searchScope: 'content',
        tagIds: [],
        categoryIds: [],
      })
    ).toEqual({
      content: { $regex: 'draft', $options: 'i' },
    });
  });
});
