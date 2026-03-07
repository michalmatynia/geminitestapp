import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SlotInlineEditCardTab } from '../SlotInlineEditCardTab';

const mocks = vi.hoisted(() => ({
  onApplyLinkedVariantToCard: vi.fn(),
  onClearSlotImage: vi.fn(),
  onRefreshLinkedRuns: vi.fn(),
  onReplaceFromDrive: vi.fn(),
  onReplaceFromLocal: vi.fn(),
  setInlinePreviewNaturalSize: vi.fn(),
  setSlotFolderDraft: vi.fn(),
  setSlotNameDraft: vi.fn(),
  runtime: {
    inlineCardImageManagerController: {
      imageSlots: [{}],
    },
    inlinePreviewBase64Bytes: 3072,
    inlinePreviewDimensions: '512 x 512',
    inlinePreviewMimeType: 'image/png',
    inlinePreviewSource: {
      rawSource: 'data:image/png;base64,AAAA',
      resolvedSource: 'https://example.test/inline-preview.png',
      sourceType: 'draft',
      src: 'https://example.test/inline-preview.png',
    },
    linkedGeneratedVariants: [] as Array<Record<string, unknown>>,
    linkedRunsQuery: {
      error: null as Error | null,
      isError: false,
      isFetching: false,
      isLoading: false,
    },
    linkedVariantApplyBusyKey: null as string | null,
    selectedSlot: {
      id: 'slot-123',
      imageBase64: '',
      imageFile: null,
      imageFileId: '',
      imageUrl: '',
      name: 'Card Alpha',
    } as Record<string, unknown> | null,
    slotBase64Draft: 'data:image/png;base64,AAAA',
    slotFolderDraft: 'variants/red',
    slotNameDraft: 'Card Alpha',
    slotUpdateBusy: false,
    uploadPending: false,
  },
}));

vi.mock('@/shared/ui', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    Button: mocks.MockButton,
    Hint: mocks.MockHint,
    Input: mocks.MockInput,
    Label: mocks.MockLabel,
    LoadingState: mocks.MockLoadingState,
    TabsContent: mocks.MockTabsContent,
  };
});

vi.mock('@/features/products/components/ProductImageManager', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    default: mocks.MockProductImageManager,
  };
});

vi.mock('@/features/products/components/ProductImageManagerControllerContext', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    ProductImageManagerControllerProvider: mocks.MockProductImageManagerControllerProvider,
  };
});

vi.mock('../InlineImagePreviewCanvas', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    InlineImagePreviewCanvas: mocks.MockInlineImagePreviewCanvas,
  };
});

vi.mock(
  '../StudioInlineEditContext',
  async () => {
    const { createStudioInlineEditMockModule } = await import('./studioInlineEditTestUtils');
    return createStudioInlineEditMockModule(() => ({
      inlineCardImageManagerController: mocks.runtime.inlineCardImageManagerController,
      inlinePreviewBase64Bytes: mocks.runtime.inlinePreviewBase64Bytes,
      inlinePreviewDimensions: mocks.runtime.inlinePreviewDimensions,
      inlinePreviewMimeType: mocks.runtime.inlinePreviewMimeType,
      inlinePreviewSource: mocks.runtime.inlinePreviewSource,
      linkedGeneratedVariants: mocks.runtime.linkedGeneratedVariants,
      linkedRunsQuery: mocks.runtime.linkedRunsQuery,
      linkedVariantApplyBusyKey: mocks.runtime.linkedVariantApplyBusyKey,
      onApplyLinkedVariantToCard: mocks.onApplyLinkedVariantToCard,
      onClearSlotImage: mocks.onClearSlotImage,
      onRefreshLinkedRuns: mocks.onRefreshLinkedRuns,
      onReplaceFromDrive: mocks.onReplaceFromDrive,
      onReplaceFromLocal: mocks.onReplaceFromLocal,
      selectedSlot: mocks.runtime.selectedSlot,
      setInlinePreviewNaturalSize: mocks.setInlinePreviewNaturalSize,
      setSlotFolderDraft: mocks.setSlotFolderDraft,
      setSlotNameDraft: mocks.setSlotNameDraft,
      slotBase64Draft: mocks.runtime.slotBase64Draft,
      slotFolderDraft: mocks.runtime.slotFolderDraft,
      slotNameDraft: mocks.runtime.slotNameDraft,
      slotUpdateBusy: mocks.runtime.slotUpdateBusy,
      uploadPending: mocks.runtime.uploadPending,
    }));
  }
);

describe('SlotInlineEditCardTab runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtime.inlineCardImageManagerController = {
      imageSlots: [{}],
    };
    mocks.runtime.inlinePreviewBase64Bytes = 3072;
    mocks.runtime.inlinePreviewDimensions = '512 x 512';
    mocks.runtime.inlinePreviewMimeType = 'image/png';
    mocks.runtime.inlinePreviewSource = {
      rawSource: 'data:image/png;base64,AAAA',
      resolvedSource: 'https://example.test/inline-preview.png',
      sourceType: 'draft',
      src: 'https://example.test/inline-preview.png',
    };
    mocks.runtime.linkedGeneratedVariants = [];
    mocks.runtime.linkedRunsQuery = {
      error: null,
      isError: false,
      isFetching: false,
      isLoading: false,
    };
    mocks.runtime.linkedVariantApplyBusyKey = null;
    mocks.runtime.selectedSlot = {
      id: 'slot-123',
      imageBase64: '',
      imageFile: null,
      imageFileId: '',
      imageUrl: '',
      name: 'Card Alpha',
    };
    mocks.runtime.slotBase64Draft = 'data:image/png;base64,AAAA';
    mocks.runtime.slotFolderDraft = 'variants/red';
    mocks.runtime.slotNameDraft = 'Card Alpha';
    mocks.runtime.slotUpdateBusy = false;
    mocks.runtime.uploadPending = false;
  });

  it('renders from StudioInlineEditContext and forwards card actions', () => {
    const primaryVariant = {
      imageSrc: 'https://example.test/generated-1.png',
      key: 'variant-1',
      output: {
        filename: 'generated-1.png',
      },
      outputCount: 2,
      outputIndex: 1,
      runCreatedAt: '2026-03-07T11:00:00.000Z',
      runId: 'run-alpha-12345678',
    };
    const secondaryVariant = {
      imageSrc: 'https://example.test/generated-2.png',
      key: 'variant-2',
      output: {
        filename: 'generated-2.png',
      },
      outputCount: 2,
      outputIndex: 2,
      runCreatedAt: '2026-03-07T11:05:00.000Z',
      runId: 'run-alpha-12345678',
    };
    mocks.runtime.linkedGeneratedVariants = [primaryVariant, secondaryVariant];

    render(<SlotInlineEditCardTab />);

    expect(screen.getByTestId('tabs-content')).toHaveAttribute('data-value', 'card');
    expect(screen.getByText('Image Slot Preview')).toBeInTheDocument();
    expect(
      screen.getByText('Preview:Card Alpha:https://example.test/inline-preview.png')
    ).toBeInTheDocument();
    expect(screen.getByText('Source: draft')).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === 'Mime type: image/png')
    ).toBeInTheDocument();
    expect(screen.getByText(/Base64 payload:/)).toBeInTheDocument();
    expect(screen.getByText('Product Image Manager:nodrag')).toBeInTheDocument();
    expect(screen.getByTestId('product-image-manager-provider')).toHaveAttribute(
      'data-slot-count',
      '1'
    );
    expect(screen.getByText('generated-1.png')).toBeInTheDocument();
    expect(screen.getByText('generated-2.png')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Card Alpha'), {
      target: { value: 'Updated Card Name' },
    });
    fireEvent.change(screen.getByDisplayValue('variants/red'), {
      target: { value: 'variants/blue' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Use On Card' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Replace From Drive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace From Local Upload' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Image' }));

    expect(mocks.setSlotNameDraft).toHaveBeenCalledWith('Updated Card Name');
    expect(mocks.setSlotFolderDraft).toHaveBeenCalledWith('variants/blue');
    expect(mocks.onRefreshLinkedRuns).toHaveBeenCalledTimes(1);
    expect(mocks.onApplyLinkedVariantToCard).toHaveBeenCalledWith(primaryVariant);
    expect(mocks.onReplaceFromDrive).toHaveBeenCalledTimes(1);
    expect(mocks.onReplaceFromLocal).toHaveBeenCalledTimes(1);
    expect(mocks.onClearSlotImage).toHaveBeenCalledTimes(1);
  });

  it('renders the loading and empty linked-variant states', () => {
    mocks.runtime.linkedRunsQuery = {
      error: null,
      isError: false,
      isFetching: false,
      isLoading: true,
    };

    const { rerender } = render(<SlotInlineEditCardTab />);

    expect(screen.getByText('Loading linked variants...')).toBeInTheDocument();

    mocks.runtime.linkedRunsQuery = {
      error: null,
      isError: false,
      isFetching: false,
      isLoading: false,
    };

    rerender(<SlotInlineEditCardTab />);

    expect(screen.getByText('No generated variants linked to this card yet.')).toBeInTheDocument();
  });

  it('renders the error branch and disables locked actions', () => {
    mocks.runtime.linkedRunsQuery = {
      error: new Error('Linked variants failed'),
      isError: true,
      isFetching: false,
      isLoading: false,
    };
    mocks.runtime.selectedSlot = {
      id: 'slot-locked',
      imageBase64: '',
      imageFile: {
        createdAt: '2026-03-07T09:00:00.000Z',
        filename: 'card.png',
        id: 'file-locked',
        size: 2048,
        updatedAt: '2026-03-07T10:00:00.000Z',
      },
      imageFileId: 'file-locked',
      imageUrl: 'https://example.test/card.png',
      name: 'Locked Card',
    };
    mocks.runtime.slotNameDraft = 'Locked Card';
    mocks.runtime.uploadPending = true;

    render(<SlotInlineEditCardTab />);

    expect(screen.getByText('Linked variants failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace From Local Upload' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear Image' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear Image' })).toHaveAttribute(
      'title',
      'Card image is locked and can only be removed by deleting the card.'
    );
  });
});
