import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GenerationPreviewModal } from '../GenerationPreviewModalImpl';

const mocks = vi.hoisted(() => ({
  onApplyLinkedVariantToCard: vi.fn(),
  setGenerationModalPreviewNaturalSize: vi.fn(),
  setGenerationPreviewModalOpen: vi.fn(),
  runtime: {
    generationPreviewModalOpen: true,
    selectedGenerationModalDimensions: '1536 x 1024',
    selectedGenerationPreview: {
      imageSrc: 'https://example.test/generated.png',
      output: {
        filename: 'generated-card.png',
        id: 'file-123',
        size: 4096,
      },
      runCreatedAt: '2026-03-07T10:15:00.000Z',
    },
    slotUpdateBusy: false,
  },
}));

vi.mock('@/shared/ui', async () => {
  const mocks = await import('../../studio-modals/__tests__/studioInlineEditRuntimeMockComponents');
  return {
    StatusBadge: mocks.MockStatusBadge,
    MetadataItem: mocks.MockMetadataItem,
    FormActions: mocks.MockFormActions,
  };
});

vi.mock('@/shared/ui/templates/modals', async () => {
  const mocks = await import('../../studio-modals/__tests__/studioInlineEditRuntimeMockComponents');
  return {
    DetailModal: mocks.MockDetailModal,
  };
});

vi.mock('../../studio-modals/InlineImagePreviewCanvas', async () => {
  const mocks = await import('../../studio-modals/__tests__/studioInlineEditRuntimeMockComponents');
  return {
    InlineImagePreviewCanvas: mocks.MockInlineImagePreviewCanvas,
  };
});

vi.mock(
  '../../studio-modals/StudioInlineEditContext',
  async () => {
    const { createStudioInlineEditMockModule } = await import(
      '../../studio-modals/__tests__/studioInlineEditTestUtils'
    );
    return createStudioInlineEditMockModule(() => ({
      selectedGenerationPreview: mocks.runtime.selectedGenerationPreview,
      selectedGenerationModalDimensions: mocks.runtime.selectedGenerationModalDimensions,
      slotUpdateBusy: mocks.runtime.slotUpdateBusy,
      onApplyLinkedVariantToCard: mocks.onApplyLinkedVariantToCard,
      setGenerationModalPreviewNaturalSize: mocks.setGenerationModalPreviewNaturalSize,
      generationPreviewModalOpen: mocks.runtime.generationPreviewModalOpen,
      setGenerationPreviewModalOpen: mocks.setGenerationPreviewModalOpen,
    }));
  }
);

describe('GenerationPreviewModal runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtime.generationPreviewModalOpen = true;
    mocks.runtime.selectedGenerationModalDimensions = '1536 x 1024';
    mocks.runtime.selectedGenerationPreview = {
      imageSrc: 'https://example.test/generated.png',
      output: {
        filename: 'generated-card.png',
        id: 'file-123',
        size: 4096,
      },
      runCreatedAt: '2026-03-07T10:15:00.000Z',
    };
    mocks.runtime.slotUpdateBusy = false;
  });

  it('renders from StudioInlineEditContext and applies the selected variant', () => {
    render(<GenerationPreviewModal />);

    expect(screen.getByTestId('detail-modal')).toBeInTheDocument();
    expect(screen.getByText('Generation Preview')).toBeInTheDocument();
    expect(screen.getByText('generated-card.png')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Preview:generated-card.png:https://example.test/generated.png'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('File Identifier:file-123')).toBeInTheDocument();
    expect(screen.getByText('Dimensions:1536 x 1024')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply to Card' }));

    expect(mocks.onApplyLinkedVariantToCard).toHaveBeenCalledWith(
      mocks.runtime.selectedGenerationPreview
    );
  });

  it('closes through StudioInlineEditContext', () => {
    render(<GenerationPreviewModal />);

    fireEvent.click(screen.getByRole('button', { name: 'Close Preview' }));

    expect(mocks.setGenerationPreviewModalOpen).toHaveBeenCalledWith(false);
  });
});
