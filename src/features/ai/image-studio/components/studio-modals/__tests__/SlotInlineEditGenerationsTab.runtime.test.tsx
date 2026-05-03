import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SlotInlineEditGenerationsTab } from '../SlotInlineEditGenerationsTab';

const mocks = vi.hoisted(() => ({
  onOpenGenerationPreviewModal: vi.fn(),
  onRefreshLinkedRuns: vi.fn(),
  setGenerationPreviewNaturalSize: vi.fn(),
  runtime: {
    linkedGeneratedVariants: [] as Array<Record<string, unknown>>,
    linkedRunsQuery: {
      error: null,
      isError: false,
      isFetching: false,
      isLoading: false,
    },
    selectedGenerationPreview: null as Record<string, unknown> | null,
    selectedGenerationPreviewDimensions: '1536 x 1024',
    selectedSlot: {
      name: 'Card Alpha',
    },
    slotNameDraft: 'Card Alpha',
  },
}));

vi.mock('next/image', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    default: mocks.MockNextImage,
  };
});

vi.mock('@/shared/ui/primitives.public', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    Button: mocks.MockButton,
    Hint: mocks.MockHint,
    LoadingState: mocks.MockLoadingState,
    TabsContent: mocks.MockTabsContent,
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
      linkedGeneratedVariants: mocks.runtime.linkedGeneratedVariants,
      linkedRunsQuery: mocks.runtime.linkedRunsQuery,
      onOpenGenerationPreviewModal: mocks.onOpenGenerationPreviewModal,
      onRefreshLinkedRuns: mocks.onRefreshLinkedRuns,
      selectedGenerationPreview: mocks.runtime.selectedGenerationPreview,
      selectedGenerationPreviewDimensions: mocks.runtime.selectedGenerationPreviewDimensions,
      selectedSlot: mocks.runtime.selectedSlot,
      setGenerationPreviewNaturalSize: mocks.setGenerationPreviewNaturalSize,
      slotNameDraft: mocks.runtime.slotNameDraft,
    }));
  }
);

describe('SlotInlineEditGenerationsTab runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtime.linkedGeneratedVariants = [];
    mocks.runtime.linkedRunsQuery = {
      error: null,
      isError: false,
      isFetching: false,
      isLoading: false,
    };
    mocks.runtime.selectedGenerationPreview = null;
    mocks.runtime.selectedGenerationPreviewDimensions = '1536 x 1024';
    mocks.runtime.selectedSlot = {
      name: 'Card Alpha',
    };
    mocks.runtime.slotNameDraft = 'Card Alpha';
  });

  it('renders the selected preview and opens a linked generation variant', () => {
    const primaryVariant = {
      imageSrc: 'https://example.test/generated-1.png',
      key: 'variant-1',
      output: {
        filename: 'generated-1.png',
        filepath: '/files/generated-1.png',
        id: 'output-1',
        size: 4096,
      },
      outputCount: 2,
      outputIndex: 1,
      runCreatedAt: '2026-03-07T12:00:00.000Z',
      runId: 'run-alpha-12345678',
    };
    const secondaryVariant = {
      imageSrc: 'https://example.test/generated-2.png',
      key: 'variant-2',
      output: {
        filename: 'generated-2.png',
        filepath: '/files/generated-2.png',
        id: 'output-2',
        size: 2048,
      },
      outputCount: 2,
      outputIndex: 2,
      runCreatedAt: '2026-03-07T12:05:00.000Z',
      runId: 'run-alpha-12345678',
    };

    mocks.runtime.selectedGenerationPreview = primaryVariant;
    mocks.runtime.linkedGeneratedVariants = [primaryVariant, secondaryVariant];

    render(<SlotInlineEditGenerationsTab />);

    expect(screen.getByTestId('tabs-content')).toHaveAttribute('data-value', 'generations');
    expect(screen.getByText('Generation Preview')).toBeInTheDocument();
    expect(
      screen.getByText('Preview:generated-1.png:https://example.test/generated-1.png')
    ).toBeInTheDocument();
    expect(screen.getByText('Output file id:')).toBeInTheDocument();
    expect(screen.getByText('output-1')).toBeInTheDocument();
    expect(screen.getByText('2 images')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: /generated-2\.png/ }));

    expect(mocks.onRefreshLinkedRuns).toHaveBeenCalledTimes(1);
    expect(mocks.onOpenGenerationPreviewModal).toHaveBeenCalledWith(secondaryVariant);
  });

  it('renders the loading and empty branches from StudioInlineEditContext', () => {
    mocks.runtime.linkedRunsQuery = {
      error: null,
      isError: false,
      isFetching: false,
      isLoading: true,
    };

    const { rerender } = render(<SlotInlineEditGenerationsTab />);

    expect(screen.getByText('Loading generation slots...')).toBeInTheDocument();
    expect(
      screen.getByText('Generate or attach variants to this card to populate generation slots.')
    ).toBeInTheDocument();

    mocks.runtime.linkedRunsQuery = {
      error: null,
      isError: false,
      isFetching: false,
      isLoading: false,
    };

    rerender(<SlotInlineEditGenerationsTab />);

    expect(screen.getByText('No generated image slots are linked to this card yet.')).toBeInTheDocument();
  });

  it('renders the error branch from StudioInlineEditContext', () => {
    mocks.runtime.linkedRunsQuery = {
      error: new Error('Linked runs failed'),
      isError: true,
      isFetching: false,
      isLoading: false,
    };

    render(<SlotInlineEditGenerationsTab />);

    expect(screen.getByText('Linked runs failed')).toBeInTheDocument();
  });
});
