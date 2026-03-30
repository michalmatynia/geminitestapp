import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listTags: vi.fn(),
  findByName: vi.fn(),
  createTag: vi.fn(),
}));

vi.mock('@/features/products/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/products/server')>();
  return {
    ...actual,
    getTagRepository: vi.fn().mockResolvedValue({
      listTags: mocks.listTags,
      findByName: mocks.findByName,
      createTag: mocks.createTag,
    }),
  };
});

import { GET, POST } from '@/app/api/v2/products/tags/route-handler';

const buildCreateTagRequest = (payload: Record<string, unknown>) =>
  new NextRequest('http://localhost/api/products/tags', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

describe('Product Tags API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tags for a given catalogId', async () => {
    mocks.listTags.mockResolvedValue([
      {
        id: 'tag-1',
        name: 'Tag 1',
        color: '#ff0000',
        catalogId: 'cat1',
      },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/products/tags?catalogId=cat1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mocks.listTags).toHaveBeenCalledWith({ catalogId: 'cat1' });
  });

  it('creates a new tag', async () => {
    mocks.findByName.mockResolvedValue(null);
    mocks.createTag.mockResolvedValue({
      id: 'tag-3',
      name: 'New Tag',
      color: '#0000ff',
      catalogId: 'cat1',
    });

    const res = await POST(
      buildCreateTagRequest({ name: 'New Tag', color: '#0000ff', catalogId: 'cat1' })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe('tag-3');
    expect(mocks.findByName).toHaveBeenCalledWith('cat1', 'New Tag');
    expect(mocks.createTag).toHaveBeenCalledWith({
      name: 'New Tag',
      color: '#0000ff',
      catalogId: 'cat1',
    });
  });
});
