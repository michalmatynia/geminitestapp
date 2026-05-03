import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SlotInlineEditMasksTab } from '../SlotInlineEditMasksTab';

const mocks = vi.hoisted(() => ({
  runtime: {
    linkedMaskSlots: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    Hint: mocks.MockHint,
    TabsContent: mocks.MockTabsContent,
  };
});

vi.mock(
  '../StudioInlineEditContext',
  async () => {
    const { createStudioInlineEditMockModule } = await import('./studioInlineEditTestUtils');
    return createStudioInlineEditMockModule(() => ({
      linkedMaskSlots: mocks.runtime.linkedMaskSlots,
    }));
  }
);

describe('SlotInlineEditMasksTab runtime path', () => {
  beforeEach(() => {
    mocks.runtime.linkedMaskSlots = [];
  });

  it('renders the empty state from StudioInlineEditContext', () => {
    render(<SlotInlineEditMasksTab />);

    expect(screen.getByTestId('tabs-content')).toHaveAttribute('data-value', 'masks');
    expect(screen.getByText('Linked Masks')).toBeInTheDocument();
    expect(screen.getByText('No linked masks found for this card.')).toBeInTheDocument();
  });

  it('renders linked mask metadata from StudioInlineEditContext', () => {
    mocks.runtime.linkedMaskSlots = [
      {
        filename: 'mask-alpha.png',
        filepath: '/files/mask-alpha.png',
        generationMode: 'inpaint',
        imageFileId: 'file-mask-1',
        imageSrc: 'https://example.test/mask-alpha.png',
        inverted: true,
        name: 'Mask Alpha',
        relationType: 'mask',
        size: 1024,
        slotId: 'mask-slot-1',
        updatedAt: '2026-03-07T11:00:00.000Z',
        variant: 'primary',
        width: 256,
        height: 256,
      },
      {
        filename: '',
        filepath: '',
        generationMode: 'outpaint',
        imageFileId: '',
        imageSrc: '',
        inverted: false,
        name: 'Mask Beta',
        relationType: '',
        size: null,
        slotId: 'mask-slot-2',
        updatedAt: null,
        variant: 'secondary',
        width: null,
        height: null,
      },
    ];

    render(<SlotInlineEditMasksTab />);

    expect(screen.getByAltText('Mask Alpha')).toBeInTheDocument();
    expect(screen.getByText('Mask Alpha')).toBeInTheDocument();
    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('inpaint')).toBeInTheDocument();
    expect(screen.getByText('mask-slot-1')).toBeInTheDocument();
    expect(screen.getByText('file-mask-1')).toBeInTheDocument();

    expect(screen.getByText('Mask Beta')).toBeInTheDocument();
    expect(screen.getAllByText('No image')).toHaveLength(1);
    expect(screen.getByText('secondary')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('outpaint')).toBeInTheDocument();
  });
});
