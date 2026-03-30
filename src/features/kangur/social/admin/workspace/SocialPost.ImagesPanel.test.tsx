/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/cms/public', () => ({
  MediaLibraryPanel: ({
    open,
    title,
  }: {
    open: boolean;
    title: string;
  }) => (open ? <div>{title}</div> : null),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
  ),
  FormSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

import { SocialPostImagesPanel } from './SocialPost.ImagesPanel';

describe('SocialPostImagesPanel', () => {
  it('renders the current non-comparing image list from the resolved latest assets', () => {
    render(
      <SocialPostImagesPanel
        imageAssets={[
          {
            id: 'asset-new',
            url: '/captures/game-new.png',
            filepath: '/captures/game-new.png',
            filename: 'game-new.png',
          },
          {
            id: 'manual-1',
            url: '/manual/custom.png',
            filepath: '/manual/custom.png',
            filename: 'custom.png',
          },
        ]}
        handleRemoveImage={vi.fn()}
        setShowMediaLibrary={vi.fn()}
        showMediaLibrary={false}
        handleAddImages={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Images' })).toBeInTheDocument();
    expect(screen.getByAltText('game-new.png')).toHaveAttribute('src', '/captures/game-new.png');
    expect(screen.getByAltText('custom.png')).toHaveAttribute('src', '/manual/custom.png');
    expect(screen.queryByAltText('game-old.png')).not.toBeInTheDocument();
  });
});
