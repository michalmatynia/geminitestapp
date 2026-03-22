// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

const setPreviewAsset = vi.fn();
const setEditAsset = vi.fn();
const handleDelete = vi.fn();
const isDeleting = vi.fn();

vi.mock('../context/Admin3DAssetsContext', () => ({
  useAdmin3DAssetsContext: () => ({
    setPreviewAsset,
    setEditAsset,
    handleDelete,
    isDeleting,
  }),
}));

import { Asset3DCard } from './Asset3DCard';

const asset: Asset3DRecord = {
  id: 'asset-1',
  name: 'Model One',
  filename: '123-model-one.glb',
  description: 'Primary model',
  categoryId: 'characters',
  tags: ['hero', 'animated', 'rigged', 'featured'],
  size: 1024 * 1024,
  createdAt: '2025-01-10T12:00:00.000Z',
  isPublic: true,
  mimeType: 'model/gltf-binary',
  url: '/models/model-one.glb',
  updatedAt: '2025-01-10T12:00:00.000Z',
} as Asset3DRecord;

describe('Asset3DCard', () => {
  it('renders the resource card directly and wires preview, edit, and delete actions', () => {
    isDeleting.mockReturnValue(false);

    render(<Asset3DCard asset={asset} className='asset-card' />);

    expect(screen.getByRole('button', { name: 'Model One' })).toBeInTheDocument();
    expect(screen.getByText('Primary model')).toBeInTheDocument();
    expect(screen.getByText('characters')).toBeInTheDocument();
    expect(screen.getByText('hero')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Model One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit asset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete asset' }));

    expect(setPreviewAsset).toHaveBeenCalledWith(asset);
    expect(setEditAsset).toHaveBeenCalledWith(asset);
    expect(handleDelete).toHaveBeenCalledWith(asset);
  });

  it('disables the delete action while the asset is deleting', () => {
    isDeleting.mockReturnValue(true);

    render(<Asset3DCard asset={asset} />);

    expect(screen.getByRole('button', { name: 'Delete asset' })).toBeDisabled();
  });
});
