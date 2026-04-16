/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductImageCell } from './ProductImageCell';

const {
  hidePreviewMock,
  queryClientSetQueriesDataMock,
  queryClientSetQueryDataMock,
  showPreviewMock,
  toastMock,
  updatePreviewMock,
  updateProductMock,
} = vi.hoisted(() => ({
  hidePreviewMock: vi.fn(),
  queryClientSetQueriesDataMock: vi.fn(),
  queryClientSetQueryDataMock: vi.fn(),
  showPreviewMock: vi.fn(),
  toastMock: vi.fn(),
  updatePreviewMock: vi.fn(),
  updateProductMock: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    className,
  }: {
    alt: string;
    src: string;
    className?: string;
  }) => <img alt={alt} src={src} className={className} />,
}));

vi.mock('@/features/products/context/ProductImagePreviewContext', () => ({
  useProductImagePreview: () => ({
    showPreview: showPreviewMock,
    updatePreview: updatePreviewMock,
    hidePreview: hidePreviewMock,
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueriesData: queryClientSetQueriesDataMock,
    setQueryData: queryClientSetQueryDataMock,
  }),
}));

vi.mock('@/features/products/api', () => ({
  updateProduct: updateProductMock,
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/shared/ui/feedback.public', () => ({
  AppModal: ({
    className,
    header,
    open,
    showClose = true,
    style,
    title,
    subtitle,
    bodyClassName,
    children,
    onClose,
  }: {
    className?: string;
    header?: React.ReactNode;
    open?: boolean;
    showClose?: boolean;
    style?: React.CSSProperties;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    bodyClassName?: string;
    children?: React.ReactNode;
    onClose?: () => void;
  }) =>
    open ? (
      <div data-testid='product-note-modal' className={className} style={style}>
        {header ?? <h2>{title}</h2>}
        {subtitle ? <p>{subtitle}</p> : null}
        <div className={bodyClassName}>{children}</div>
        {showClose ? (
          <button type='button' onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
    ) : null,
}));

describe('ProductImageCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateProductMock.mockResolvedValue({
      id: 'product-1',
      notes: {
        text: 'Updated note.',
        color: '#bfdbfe',
      },
    });
  });

  it('requests the miniature note preview when hovering the note tab', () => {
    render(
      <ProductImageCell
        imageUrl='/images/product.jpg'
        productId='product-1'
        productName='Gaming Bottle Opener'
        note={{
          text: 'Check the insert before export.',
          color: '#bfdbfe',
        }}
      />
    );

    const noteButton = screen.getByRole('button', {
      name: 'View note for Gaming Bottle Opener',
    });

    fireEvent.mouseEnter(noteButton, { clientX: 120, clientY: 140 });

    expect(showPreviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'note',
        productName: 'Gaming Bottle Opener',
        noteText: 'Check the insert before export.',
        noteColor: '#bfdbfe',
      })
    );
  });

  it('renders the note indicator and opens the note modal on click', () => {
    render(
      <ProductImageCell
        imageUrl='/images/product.jpg'
        productId='product-1'
        productName='Gaming Bottle Opener'
        note={{
          text: 'Check the insert before export.',
          color: '#bfdbfe',
        }}
      />
    );

    const noteButton = screen.getByRole('button', {
      name: 'View note for Gaming Bottle Opener',
    });
    const thumbnailWrapper = noteButton.parentElement;

    expect(noteButton).toHaveStyle({ backgroundColor: '#bfdbfe' });
    expect(noteButton.className).toContain('cursor-pointer');
    expect(noteButton.className).toContain('w-8');
    expect(noteButton.className).toContain('-translate-x-[12px]');
    expect(noteButton.className).toContain('hover:w-11');
    expect(noteButton.className).toContain('hover:-translate-x-[16px]');
    expect(noteButton.className).not.toContain('group-hover:w-7');
    expect(thumbnailWrapper?.className).toContain('h-16 w-16');
    expect(thumbnailWrapper?.className).not.toContain('w-[72px]');
    expect(thumbnailWrapper?.className).not.toContain('pl-2');

    fireEvent.click(noteButton);

    expect(hidePreviewMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('product-note-modal')).toBeInTheDocument();
    expect(screen.getByText('Product note')).toBeInTheDocument();
    expect(screen.getByText('Gaming Bottle Opener')).toBeInTheDocument();
    expect(screen.queryByText('Note paper')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Edit note for Gaming Bottle Opener')).toHaveDisplayValue(
      'Check the insert before export.'
    );
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();
    expect(saveButton.className).not.toContain('bg-emerald-500');
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('product-note-modal')).toHaveStyle({
      backgroundColor: '#bfdbfe',
    });
  });

  it('saves note edits from the note modal', async () => {
    render(
      <ProductImageCell
        imageUrl='/images/product.jpg'
        productId='product-1'
        productName='Gaming Bottle Opener'
        note={{
          text: 'Check the insert before export.',
          color: '#bfdbfe',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', {
      name: 'View note for Gaming Bottle Opener',
    }));

    fireEvent.change(screen.getByLabelText('Edit note for Gaming Bottle Opener'), {
      target: { value: 'Updated note.' },
    });
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeEnabled();
    expect(saveButton.className).toContain('bg-emerald-500');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateProductMock).toHaveBeenCalledWith('product-1', {
        notes: {
          text: 'Updated note.',
          color: '#bfdbfe',
        },
      });
    });
    expect(queryClientSetQueriesDataMock).toHaveBeenCalled();
    expect(queryClientSetQueryDataMock).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith('Product note updated', { variant: 'success' });
  });

  it('discards note edits when cancel is clicked', () => {
    render(
      <ProductImageCell
        imageUrl='/images/product.jpg'
        productId='product-1'
        productName='Gaming Bottle Opener'
        note={{
          text: 'Check the insert before export.',
          color: '#bfdbfe',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', {
      name: 'View note for Gaming Bottle Opener',
    }));
    fireEvent.change(screen.getByLabelText('Edit note for Gaming Bottle Opener'), {
      target: { value: 'Unsaved note.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(updateProductMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('product-note-modal')).not.toBeInTheDocument();
  });

  it('uses filter-based image hover styling instead of reducing image opacity', () => {
    render(
      <ProductImageCell
        imageUrl='/images/product.jpg'
        productId='product-1'
        productName='Gaming Bottle Opener'
      />
    );

    const thumbnail = screen.getByAltText('Gaming Bottle Opener');

    expect(thumbnail.className).toContain('group-hover/image:brightness-70');
    expect(thumbnail.className).toContain('group-hover/image:contrast-110');
    expect(thumbnail.className).not.toContain('hover:opacity-80');
  });

  it('does not render the note indicator when the product has no note', () => {
    render(
      <ProductImageCell
        imageUrl='/images/product.jpg'
        productId='product-1'
        productName='Gaming Bottle Opener'
      />
    );

    expect(
      screen.queryByRole('button', { name: 'View note for Gaming Bottle Opener' })
    ).not.toBeInTheDocument();
  });

  it('does not render the note indicator when note text is empty', () => {
    render(
      <ProductImageCell
        imageUrl='/images/product.jpg'
        productId='product-1'
        productName='Gaming Bottle Opener'
        note={{
          text: '   ',
          color: '#bfdbfe',
        }}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'View note for Gaming Bottle Opener' })
    ).not.toBeInTheDocument();
  });
});
