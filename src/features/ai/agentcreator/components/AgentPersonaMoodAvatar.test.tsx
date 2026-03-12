/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    fill: _fill,
    unoptimized: _unoptimized,
    sizes: _sizes,
    ...rest
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    src: string;
    unoptimized?: boolean;
    sizes?: string;
  }) => <img alt={alt} data-next-image='true' src={src} {...rest} />,
}));

import { AgentPersonaMoodAvatar } from './AgentPersonaMoodAvatar';

describe('AgentPersonaMoodAvatar', () => {
  it('renders uploaded image avatars when an image URL is provided', () => {
    render(
      <AgentPersonaMoodAvatar
        avatarImageUrl='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s2g9n0AAAAASUVORK5CYII='
        label='Tutor avatar image'
        data-testid='persona-avatar-image'
      />
    );

    const avatar = screen.getByTestId('persona-avatar-image');
    const image = avatar.querySelector('img');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toContain('data:image/png;base64,');
    expect(image).toHaveAttribute('data-next-image', 'true');
  });

  it('renders sanitized SVG markup when an avatar is provided', () => {
    render(
      <AgentPersonaMoodAvatar
        svgContent={
          '<svg viewBox="0 0 100 100"><script>alert(1)</script><circle cx="50" cy="50" r="32" /></svg>'
        }
        label='Tutor avatar'
        data-testid='persona-avatar'
      />
    );

    const avatar = screen.getByTestId('persona-avatar');
    expect(avatar.querySelector('svg')).not.toBeNull();
    expect(avatar.innerHTML).not.toContain('<script');
  });

  it('falls back to the default icon when no SVG markup exists', () => {
    render(
      <AgentPersonaMoodAvatar
        svgContent=''
        label='Tutor avatar fallback'
        data-testid='persona-avatar-fallback'
      />
    );

    expect(screen.getByTestId('persona-avatar-fallback').querySelector('svg')).not.toBeNull();
  });
});
