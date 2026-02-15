import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';

import {
  fetchAssets3D,
  fetchAsset3DById,
  uploadAsset3DFile,
  updateAsset3D,
  deleteAsset3DById,
  fetchCategories,
  fetchTags,
} from '@/features/viewer3d/api';
import { server } from '@/mocks/server';

vi.mock('@/shared/utils/upload-with-progress', () => ({
  uploadWithProgress: vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    data: { id: '1', name: 'New Asset' },
  }),
}));

const mockAsset = {
  id: '1',
  name: 'Test',
  filename: 'test.glb',
  filepath: '/path',
  mimetype: 'model/gltf-binary',
  size: 100,
  tags: ['t1'],
  category: 'c1',
  isPublic: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Asset3D API', () => {
  it('should fetch all assets', async () => {
    server.use(
      http.get('/api/assets3d', () => {
        return HttpResponse.json([mockAsset]);
      })
    );

    const assets = await fetchAssets3D();
    expect(assets).toHaveLength(1);
    expect(assets[0]?.id).toBe('1');
  });

  it('should fetch assets with filters', async () => {
    let capturedParams: URLSearchParams | null = null;
    server.use(
      http.get('/api/assets3d', ({ request }) => {
        capturedParams = new URL(request.url).searchParams;
        return HttpResponse.json([mockAsset]);
      })
    );

    await fetchAssets3D({ filename: 'test', categoryId: 'c1', tags: ['t1', 't2'], isPublic: true });
    
    expect(capturedParams!.get('filename')).toBe('test');
    expect(capturedParams!.get('categoryId')).toBe('c1');
    expect(capturedParams!.get('tags')).toBe('t1,t2');
    expect(capturedParams!.get('isPublic')).toBe('true');
  });

  it('should fetch asset by id', async () => {
    server.use(
      http.get('/api/assets3d/1', () => {
        return HttpResponse.json(mockAsset);
      })
    );

    const asset = await fetchAsset3DById('1');
    expect(asset.id).toBe('1');
  });

  it('should upload a file', async () => {
    server.use(
      http.post('/api/assets3d', () => {
        return HttpResponse.json(mockAsset, { status: 201 });
      })
    );

    const file = new File(['test content'], 'new.glb');
    const asset = await uploadAsset3DFile(file, { name: 'New Asset' });
    expect(asset.id).toBe('1');
  });

  it('should update an asset', async () => {
    server.use(
      http.patch('/api/assets3d/1', async ({ request }) => {
        const body = await request.json() as any;
        expect(body.name).toBe('Updated');
        return HttpResponse.json({ ...mockAsset, name: 'Updated' });
      })
    );

    const asset = await updateAsset3D('1', { name: 'Updated' });
    expect(asset.name).toBe('Updated');
  });

  it('should delete an asset', async () => {
    let deleted = false;
    server.use(
      http.delete('/api/assets3d/1', () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await deleteAsset3DById('1');
    expect(deleted).toBe(true);
  });

  it('should fetch categories', async () => {
    server.use(
      http.get('/api/assets3d/categories', () => {
        return HttpResponse.json(['c1', 'c2']);
      })
    );

    const categories = await fetchCategories();
    expect(categories).toEqual(['c1', 'c2']);
  });

  it('should fetch tags', async () => {
    server.use(
      http.get('/api/assets3d/tags', () => {
        return HttpResponse.json(['t1', 't2']);
      })
    );

    const tags = await fetchTags();
    expect(tags).toEqual(['t1', 't2']);
  });
});