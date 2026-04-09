import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SlotInlineEditCompositesTab } from '../SlotInlineEditCompositesTab';

const mocks = vi.hoisted(() => ({
  runtime: {
    compositeTabInputImages: [] as Array<Record<string, unknown>>,
    compositeTabInputSourceLabel: 'Composited from linked card layers',
    sourceCompositeImage: null as Record<string, unknown> | null,
  },
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    TabsContent: mocks.MockTabsContent,
  };
});

vi.mock(
  '../StudioInlineEditContext',
  async () => {
    const { createStudioInlineEditMockModule } = await import('./studioInlineEditTestUtils');
    return createStudioInlineEditMockModule(() => ({
      compositeTabInputImages: mocks.runtime.compositeTabInputImages,
      compositeTabInputSourceLabel: mocks.runtime.compositeTabInputSourceLabel,
      sourceCompositeImage: mocks.runtime.sourceCompositeImage,
    }));
  }
);

describe('SlotInlineEditCompositesTab runtime path', () => {
  beforeEach(() => {
    mocks.runtime.compositeTabInputImages = [];
    mocks.runtime.compositeTabInputSourceLabel = 'Composited from linked card layers';
    mocks.runtime.sourceCompositeImage = null;
  });

  it('renders the empty state from StudioInlineEditContext', () => {
    render(<SlotInlineEditCompositesTab />);

    expect(screen.getByTestId('tabs-content')).toHaveAttribute('data-value', 'composites');
    expect(screen.getByText('Composite Inputs')).toBeInTheDocument();
    expect(screen.getByText('Composited from linked card layers')).toBeInTheDocument();
    expect(screen.getByText('No source image available.')).toBeInTheDocument();
    expect(screen.getByText('No composite images to show.')).toBeInTheDocument();
  });

  it('renders source and composite image metadata from StudioInlineEditContext', () => {
    mocks.runtime.sourceCompositeImage = {
      filename: 'source-card.png',
      filepath: '/files/source-card.png',
      imageFileId: 'file-source-1',
      imageSrc: 'https://example.test/source-card.png',
      name: 'Source Card',
      size: 4096,
      slotId: 'slot-source',
      sourceType: 'card',
      updatedAt: '2026-03-07T09:00:00.000Z',
      width: 512,
      height: 512,
    };
    mocks.runtime.compositeTabInputImages = [
      {
        filename: 'layer-1.png',
        filepath: '/files/layer-1.png',
        imageFileId: 'file-layer-1',
        imageSrc: 'https://example.test/layer-1.png',
        key: 'layer-1',
        name: 'Layer One',
        order: 0,
        size: 2048,
        slotId: 'slot-layer-1',
        sourceType: 'generation',
        updatedAt: '2026-03-07T10:00:00.000Z',
        width: 256,
        height: 128,
      },
      {
        filename: '',
        filepath: '',
        imageFileId: '',
        imageSrc: '',
        key: 'layer-2',
        name: 'Layer Two',
        order: null,
        size: null,
        slotId: '',
        sourceType: 'environment',
        updatedAt: null,
        width: null,
        height: null,
      },
    ];

    render(<SlotInlineEditCompositesTab />);

    expect(screen.getByAltText('Source Card')).toBeInTheDocument();
    expect(screen.getByText('Source:')).toBeInTheDocument();
    expect(screen.getByText('card')).toBeInTheDocument();
    expect(screen.getByText('slot-source')).toBeInTheDocument();
    expect(screen.getByText('file-source-1')).toBeInTheDocument();

    expect(screen.getByAltText('Layer One')).toBeInTheDocument();
    expect(
      screen.getAllByText((_, node) => node?.textContent?.includes('Layer order: 1') ?? false)
        .length
    ).toBeGreaterThan(0);
    expect(screen.getByText('generation')).toBeInTheDocument();
    expect(screen.getByText('slot-layer-1')).toBeInTheDocument();
    expect(screen.getByText('file-layer-1')).toBeInTheDocument();

    expect(screen.getByText('Layer Two')).toBeInTheDocument();
    expect(screen.getAllByText('No image')).toHaveLength(1);
    expect(screen.getAllByText('n/a').length).toBeGreaterThan(0);
  });
});
