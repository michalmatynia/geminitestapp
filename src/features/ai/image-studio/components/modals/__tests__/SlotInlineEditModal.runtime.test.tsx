import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SlotInlineEditModal } from '../SlotInlineEditModal';

const mocks = vi.hoisted(() => ({
  onCopyCardId: vi.fn(),
  setSlotInlineEditOpen: vi.fn(),
  runtime: {
    selectedSlot: {
      id: 'slot-123',
      name: 'Card Alpha',
    } as { id: string; name: string } | null,
    slotInlineEditOpen: true,
  },
}));

vi.mock('@/shared/ui', async () => {
  const mocks = await import('../../studio-modals/__tests__/studioInlineEditRuntimeMockComponents');
  return {
    Button: mocks.MockButton,
  };
});

vi.mock('@/shared/ui/templates/modals', async () => {
  const mocks = await import('../../studio-modals/__tests__/studioInlineEditRuntimeMockComponents');
  return {
    DetailModal: mocks.MockDetailModal,
  };
});

vi.mock(
  '../../studio-modals/StudioInlineEditContext',
  async () => {
    const { createStudioInlineEditMockModule } = await import(
      '../../studio-modals/__tests__/studioInlineEditTestUtils'
    );
    return createStudioInlineEditMockModule(() => ({
      selectedSlot: mocks.runtime.selectedSlot,
      slotInlineEditOpen: mocks.runtime.slotInlineEditOpen,
      setSlotInlineEditOpen: mocks.setSlotInlineEditOpen,
      onCopyCardId: mocks.onCopyCardId,
    }));
  }
);

describe('SlotInlineEditModal runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtime.selectedSlot = {
      id: 'slot-123',
      name: 'Card Alpha',
    };
    mocks.runtime.slotInlineEditOpen = true;
  });

  it('renders from StudioInlineEditContext and forwards footer actions', () => {
    render(
      <SlotInlineEditModal>
        <div>Modal Body</div>
      </SlotInlineEditModal>
    );

    expect(screen.getByTestId('detail-modal')).toBeInTheDocument();
    expect(screen.getByText('Edit Card')).toBeInTheDocument();
    expect(screen.getByText('Modal Body')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ID: slot-123/i }));
    expect(mocks.onCopyCardId).toHaveBeenCalledWith('slot-123');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mocks.setSlotInlineEditOpen).toHaveBeenCalledWith(false);
  });

  it('returns null when there is no selected slot', () => {
    mocks.runtime.selectedSlot = null;

    const { container } = render(
      <SlotInlineEditModal>
        <div>Modal Body</div>
      </SlotInlineEditModal>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
