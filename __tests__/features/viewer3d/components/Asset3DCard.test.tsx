import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Asset3DCard } from '@/features/viewer3d/components/Asset3DCard';
import type { Asset3DRecord } from '@/features/viewer3d/types';

const mockAsset: Asset3DRecord = {
  id: '1',
  name: 'Great Model',
  description: 'A very nice 3D model',
  filename: 'model.glb',
  filepath: '/path/to/model.glb',
  mimetype: 'model/gltf-binary',
  size: 1024 * 1024 * 1.5, // 1.5 MB
  fileUrl: '/path/to/model.glb',
  thumbnailUrl: null,
  fileSize: 1024 * 1024 * 1.5,
  format: 'glb',
  tags: ['cool', 'new', 'test', 'extra'],
  categoryId: 'Architecture',
  isPublic: true,
  createdAt: '2024-01-01T12:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z',
  metadata: {},
};

describe('Asset3DCard', () => {
  const defaultProps = {
    asset: mockAsset,
    onPreview: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it('should render asset information correctly', () => {
    render(<Asset3DCard {...defaultProps} />);

    expect(screen.getByText('Great Model')).toBeInTheDocument();
    expect(screen.getByText('A very nice 3D model')).toBeInTheDocument();
    expect(screen.getByText('Architecture')).toBeInTheDocument();
    expect(screen.getByText('1.50 MB')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('should render tags and show count for overflow', () => {
    render(<Asset3DCard {...defaultProps} />);

    expect(screen.getByText('cool')).toBeInTheDocument();
    expect(screen.getByText('new')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.queryByText('extra')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('should call onPreview when clicking the preview area', () => {
    render(<Asset3DCard {...defaultProps} />);

    const previewArea = screen.getByText('Click to preview').closest('div');
    fireEvent.click(previewArea!);

    expect(defaultProps.onPreview).toHaveBeenCalledWith(mockAsset);
  });

  it('should call onEdit when clicking the edit button', () => {
    render(<Asset3DCard {...defaultProps} />);

    const editButton = screen.getAllByRole('button')[0]; // Edit is first
    fireEvent.click(editButton!);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockAsset);
  });

  it('should call onDelete when clicking the delete button', () => {
    render(<Asset3DCard {...defaultProps} />);

    const deleteButton = screen.getAllByRole('button')[1]; // Delete is second
    fireEvent.click(deleteButton!);

    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockAsset);
  });

  it('should disable delete button and show loader when isDeleting is true', () => {
    render(<Asset3DCard {...defaultProps} isDeleting={true} />);

    const deleteButton = screen.getAllByRole('button')[1];
    expect(deleteButton).toBeDisabled();
    expect(deleteButton?.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show \'Private\' badge when isPublic is false', () => {
    const privateAsset = { ...mockAsset, isPublic: false };
    render(<Asset3DCard {...defaultProps} asset={privateAsset} />);

    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.queryByText('Public')).not.toBeInTheDocument();
  });

  it('should fallback to filename if name is missing', () => {
    const unnamedAsset = { ...mockAsset, name: null, filename: '12345-my-model.glb' };
    render(<Asset3DCard {...defaultProps} asset={unnamedAsset} />);

    expect(screen.getByText('my-model.glb')).toBeInTheDocument();
  });
});
