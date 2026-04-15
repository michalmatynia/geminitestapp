/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  ProductImagePreviewProvider,
  useProductImagePreview,
} from './ProductImagePreviewContext';

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

function PreviewHarness(): React.JSX.Element {
  const { showPreview, updatePreview, hidePreview } = useProductImagePreview();

  return (
    <div>
      <button
        type='button'
        onMouseEnter={(event) => {
          showPreview({
            kind: 'note',
            productName: 'Gaming Bottle Opener',
            noteText: 'Check the insert before export.',
            noteColor: '#bfdbfe',
            event,
          });
        }}
        onMouseMove={updatePreview}
        onMouseLeave={hidePreview}
      >
        Show note preview
      </button>
      <button
        type='button'
        onMouseEnter={(event) => {
          showPreview({
            kind: 'image',
            imageUrl: '/images/product.jpg',
            productName: 'Gaming Bottle Opener',
            unoptimized: false,
            event,
          });
        }}
        onMouseMove={updatePreview}
        onMouseLeave={hidePreview}
      >
        Show image preview
      </button>
    </div>
  );
}

describe('ProductImagePreviewProvider', () => {
  it('renders a miniature note card with text when the note preview is requested', () => {
    render(
      <ProductImagePreviewProvider>
        <PreviewHarness />
      </ProductImagePreviewProvider>
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Show note preview' }), {
      clientX: 120,
      clientY: 160,
    });

    expect(screen.getByText('Check the insert before export.')).toBeInTheDocument();
    expect(screen.queryByAltText('Gaming Bottle Opener')).not.toBeInTheDocument();
  });

  it('keeps rendering the image enlargement for image hover previews', () => {
    render(
      <ProductImagePreviewProvider>
        <PreviewHarness />
      </ProductImagePreviewProvider>
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Show image preview' }), {
      clientX: 180,
      clientY: 220,
    });

    expect(screen.getByAltText('Gaming Bottle Opener')).toBeInTheDocument();
  });
});
