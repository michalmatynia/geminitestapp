// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InlineImagePreviewCanvas } from './InlineImagePreviewCanvas';

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...props}>{children}</button>
  ),
}));

describe('InlineImagePreviewCanvas', () => {
  it('disables controls and shows the empty state when no image is available', () => {
    render(
      <InlineImagePreviewCanvas
        imageSrc={null}
        imageAlt='Preview'
        onImageDimensionsChange={vi.fn()}
      />
    );

    expect(screen.getByText('No source image available for this card.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out image preview' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom in image preview' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset image viewport' })).toBeDisabled();
  });

  it('updates zoom controls and reports image dimensions on load', () => {
    const onImageDimensionsChange = vi.fn();

    render(
      <InlineImagePreviewCanvas
        imageSrc='https://example.test/slot.png'
        imageAlt='Preview'
        onImageDimensionsChange={onImageDimensionsChange}
      />
    );

    const image = screen.getByAltText('Preview') as HTMLImageElement;
    Object.defineProperty(image, 'naturalWidth', { value: 640, configurable: true });
    Object.defineProperty(image, 'naturalHeight', { value: 480, configurable: true });

    fireEvent.load(image);

    expect(onImageDimensionsChange).toHaveBeenCalledWith({ width: 640, height: 480 });
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in image preview' }));
    expect(screen.getByText('115%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset image viewport' }));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
