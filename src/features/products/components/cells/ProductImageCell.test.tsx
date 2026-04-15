/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ProductImageCell } from './ProductImageCell';

const { hidePreviewMock, showPreviewMock, updatePreviewMock } = vi.hoisted(() => ({
  hidePreviewMock: vi.fn(),
  showPreviewMock: vi.fn(),
  updatePreviewMock: vi.fn(),
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

vi.mock('@/shared/ui/feedback.public', () => ({
  AppModal: ({
    open,
    title,
    subtitle,
    children,
    onClose,
  }: {
    open?: boolean;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children?: React.ReactNode;
    onClose?: () => void;
  }) =>
    open ? (
      <div data-testid='product-note-modal'>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
        {children}
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

describe('ProductImageCell', () => {
  it('renders the note indicator and opens the note modal on click', () => {
    render(
      <ProductImageCell
        imageUrl='/images/product.jpg'
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
    expect(noteButton.className).toContain('hover:w-8');
    expect(noteButton.className).toContain('-translate-x-[3px]');
    expect(noteButton.className).toContain('hover:-translate-x-[6px]');
    expect(noteButton.className).not.toContain('group-hover:w-7');
    expect(thumbnailWrapper?.className).toContain('h-16 w-16');
    expect(thumbnailWrapper?.className).not.toContain('w-[72px]');
    expect(thumbnailWrapper?.className).not.toContain('pl-2');

    fireEvent.click(noteButton);

    expect(hidePreviewMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('product-note-modal')).toBeInTheDocument();
    expect(screen.getByText('Product note')).toBeInTheDocument();
    expect(screen.getByText('Gaming Bottle Opener')).toBeInTheDocument();
    expect(screen.getByText('Check the insert before export.')).toBeInTheDocument();
  });

  it('uses filter-based image hover styling instead of reducing image opacity', () => {
    render(<ProductImageCell imageUrl='/images/product.jpg' productName='Gaming Bottle Opener' />);

    const thumbnail = screen.getByAltText('Gaming Bottle Opener');

    expect(thumbnail.className).toContain('group-hover/image:brightness-70');
    expect(thumbnail.className).toContain('group-hover/image:contrast-110');
    expect(thumbnail.className).not.toContain('hover:opacity-80');
  });

  it('does not render the note indicator when the product has no note', () => {
    render(<ProductImageCell imageUrl='/images/product.jpg' productName='Gaming Bottle Opener' />);

    expect(
      screen.queryByRole('button', { name: 'View note for Gaming Bottle Opener' })
    ).not.toBeInTheDocument();
  });
});
