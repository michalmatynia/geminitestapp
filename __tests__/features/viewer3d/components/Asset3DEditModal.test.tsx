import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { updateAsset3D } from '@/features/viewer3d/api';
import { Asset3DEditModal } from '@/features/viewer3d/components/Asset3DEditModal';
import { useAdmin3DAssetsContext } from '@/features/viewer3d/context/Admin3DAssetsContext';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

const { logClientErrorMock } = vi.hoisted(() => ({
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/features/viewer3d/api', () => ({
  updateAsset3D: vi.fn(),
}));

vi.mock('@/features/observability', () => ({
  logClientError: logClientErrorMock,
}));

vi.mock('@/features/viewer3d/context/Admin3DAssetsContext', () => ({
  useAdmin3DAssetsContext: vi.fn(),
}));

const mockAsset: Asset3DRecord = {
  id: '1',
  name: 'Original Name',
  description: 'Original Description',
  filename: 'model.glb',
  filepath: '/path.glb',
  mimetype: 'model/gltf-binary',
  size: 1024,
  fileUrl: '/path.glb',
  thumbnailUrl: null,
  fileSize: 1024,
  format: 'glb',
  tags: ['tag1'],
  categoryId: 'Category 1',
  isPublic: false,
  createdAt: '2024-01-01T12:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z',
  metadata: {},
};

describe('Asset3DEditModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    item: mockAsset,
    onSave: vi.fn(),
    existingCategories: ['Cat A', 'Cat B'],
    existingTags: ['tag A', 'tag B'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdmin3DAssetsContext).mockReturnValue({
      handleEdit: vi.fn(),
      categories: ['Cat A', 'Cat B'],
      allTags: ['tag A', 'tag B'],
      handleDelete: vi.fn(),
      setPreviewAsset: vi.fn(),
      setEditAsset: vi.fn(),
      isDeleting: vi.fn(() => false),
    } as any);
  });

  it('should render with initial asset data', () => {
    render(<Asset3DEditModal {...defaultProps} />);

    expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Category 1')).toBeInTheDocument();
    expect(screen.getByText('tag1')).toBeInTheDocument();
  });

  it('should allow adding and removing tags', () => {
    render(<Asset3DEditModal {...defaultProps} />);

    const tagInput = screen.getByPlaceholderText('Add tag...');
    fireEvent.change(tagInput, { target: { value: 'newtag' } });
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('newtag')).toBeInTheDocument();

    const removeButton = screen.getByText('tag1').querySelector('button');
    fireEvent.click(removeButton!);

    expect(screen.queryByText('tag1')).not.toBeInTheDocument();
  });

  it('should call updateAsset3D and onSave when clicking save', async () => {
    const updatedAsset = { ...mockAsset, name: 'Updated Name' };
    vi.mocked(updateAsset3D).mockResolvedValue(updatedAsset);

    render(<Asset3DEditModal {...defaultProps} />);

    const nameInput = screen.getByDisplayValue('Original Name');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => expect(updateAsset3D).toHaveBeenCalled());
    expect(updateAsset3D).toHaveBeenCalledWith(mockAsset.id, expect.objectContaining({
      name: 'Updated Name',
    }));
    expect(vi.mocked(useAdmin3DAssetsContext)().handleEdit).toHaveBeenCalledWith(updatedAsset);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should display error message if save fails', async () => {
    vi.mocked(updateAsset3D).mockRejectedValue(new Error('API Error'));

    render(<Asset3DEditModal {...defaultProps} />);

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => expect(screen.getByText('API Error')).toBeInTheDocument());
    expect(logClientErrorMock).toHaveBeenCalled();
  });
});
