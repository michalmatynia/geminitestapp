/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AgentPersonaMoodAvatar } from './AgentPersonaMoodAvatar';

describe('AgentPersonaMoodAvatar', () => {
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
