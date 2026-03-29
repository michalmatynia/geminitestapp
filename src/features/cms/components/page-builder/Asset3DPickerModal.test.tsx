/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Asset3DPickerModal } from './Asset3DPickerModal';

const { useAssets3DMock, useAsset3DCategoriesMock, useAsset3DTagsMock } = vi.hoisted(() => ({
  useAssets3DMock: vi.fn(),
  useAsset3DCategoriesMock: vi.fn(),
  useAsset3DTagsMock: vi.fn(),
}));

vi.mock('@/features/viewer3d/public', () => ({
  Viewer3D: () => <div data-testid='viewer-3d' />,
  Asset3DPreviewModal: () => null,
  useAssets3D: (...args: unknown[]) => useAssets3DMock(...args),
  useAsset3DCategories: () => useAsset3DCategoriesMock(),
  useAsset3DTags: () => useAsset3DTagsMock(),
}));

vi.mock('@/shared/ui', () => ({
  FilterPanel: () => <div data-testid='filter-panel' />,
  Button: ({
    children,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
  FormSection: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CompactEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  DetailModal: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children?: React.ReactNode;
  }) => (isOpen ? <div data-testid='detail-modal'>{children}</div> : null),
}));

describe('Asset3DPickerModal', () => {
  beforeEach(() => {
    useAsset3DCategoriesMock.mockReturnValue({ data: [] });
    useAsset3DTagsMock.mockReturnValue({ data: [] });
    useAssets3DMock.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'asset-1',
          name: 'Robot',
          filename: 'robot.glb',
          categoryId: 'characters',
          tags: ['featured'],
        },
      ],
    });
  });

  it('calls onSelectAsset directly when selecting an asset', () => {
    const onSelectAsset = vi.fn();

    render(
      <Asset3DPickerModal
        isOpen
        onClose={vi.fn()}
        onSuccess={() => {}}
        onSelectAsset={onSelectAsset}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));

    expect(onSelectAsset).toHaveBeenCalledWith('asset-1');
  });
});
