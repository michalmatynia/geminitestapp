/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { StudioVariantsGrid } from './StudioVariantsGrid';

const {
  getImageStudioSlotImageSrcMock,
  useProductSettingsMock,
  useProductStudioContextMock,
} = vi.hoisted(() => ({
  getImageStudioSlotImageSrcMock: vi.fn(),
  useProductSettingsMock: vi.fn(),
  useProductStudioContextMock: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
  }: {
    alt: string;
    src: string;
  }) => <img alt={alt} src={src} />,
}));

vi.mock('@/features/products/context/ProductStudioContext', () => ({
  useProductStudioContext: useProductStudioContextMock,
}));

vi.mock('@/features/products/hooks/useProductSettings', () => ({
  useProductSettings: useProductSettingsMock,
}));

vi.mock('@/features/ai/image-studio/image-src', () => ({
  getImageStudioSlotImageSrc: getImageStudioSlotImageSrcMock,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/form-section', () => ({
  FormSection: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
}));

vi.mock('@/shared/ui/LoadingState', () => ({
  LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock('@/shared/ui/status-badge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/shared/ui/templates/pickers/GenericGridPicker', () => ({
  GenericGridPicker: ({
    items,
    onSelect,
    renderItem,
    selectedId,
  }: {
    items: Array<{
      id?: string;
      disabled?: boolean;
    }>;
    onSelect: (item: { id?: string; disabled?: boolean }) => void;
    renderItem: (
      item: { id?: string; disabled?: boolean },
      isSelected: boolean
    ) => React.ReactNode;
    selectedId?: string | null;
  }) => (
    <div>
      {items.map((item) => (
        <div
          key={item.id ?? 'unknown'}
          data-testid={`grid-item-${item.id ?? 'unknown'}`}
          onClick={() => {
            if (!item.disabled) {
              onSelect(item);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !item.disabled) {
              onSelect(item);
            }
          }}
          role='button'
          tabIndex={0}
        >
          {renderItem(item, item.id === selectedId)}
        </div>
      ))}
    </div>
  ),
}));

describe('StudioVariantsGrid', () => {
  const setSelectedVariantSlotId = vi.fn();
  const handleDeleteVariant = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useProductSettingsMock.mockReturnValue({
      imageExternalBaseUrl: 'https://cdn.example.test',
    });
    getImageStudioSlotImageSrcMock.mockImplementation(
      (slot: { id: string }) => `https://cdn.example.test/${slot.id}.png`
    );
    useProductStudioContextMock.mockReturnValue({
      variants: [
        {
          id: 'variant-1',
          name: 'Variant One',
          imageFile: {
            id: 'file-1',
            url: '/variant-1.png',
          },
        },
      ],
      variantsLoading: false,
      selectedVariant: null,
      setSelectedVariantSlotId,
      deletingVariantId: null,
      handleDeleteVariant,
      pendingVariantPlaceholderCount: 1,
      sending: false,
      accepting: false,
    });
  });

  it('selects real variants but ignores pending placeholders', async () => {
    const user = userEvent.setup();

    render(<StudioVariantsGrid />);

    expect(screen.getByText('Waiting for sequence output')).toBeInTheDocument();

    await user.click(screen.getByTestId('grid-item-pending-0'));
    expect(setSelectedVariantSlotId).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('grid-item-variant-1'));
    expect(setSelectedVariantSlotId).toHaveBeenCalledWith('variant-1');
  });

  it('deletes the selected slot through the context action', async () => {
    const user = userEvent.setup();

    render(<StudioVariantsGrid />);

    await user.click(
      within(screen.getByTestId('grid-item-variant-1')).getByRole('button', { name: /delete/i })
    );

    expect(handleDeleteVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'variant-1',
        name: 'Variant One',
      })
    );
  });
});
