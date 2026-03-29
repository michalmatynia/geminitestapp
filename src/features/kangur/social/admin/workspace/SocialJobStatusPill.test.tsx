/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/shared/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { SocialJobStatusPill } from './SocialJobStatusPill';

describe('SocialJobStatusPill', () => {
  it('normalizes queue and saved-post statuses into the same pill language', () => {
    render(
      <div>
        <SocialJobStatusPill status='waiting' label='Image analysis' />
        <SocialJobStatusPill status='active' label='Full pipeline' />
        <SocialJobStatusPill status='completed' label='Generate post' />
        <SocialJobStatusPill status='failed' label='Image analysis' />
      </div>
    );

    expect(screen.getByText('Image analysis: Queued')).toBeInTheDocument();
    expect(screen.getByText('Full pipeline: Running')).toBeInTheDocument();
    expect(screen.getByText('Generate post: Completed')).toBeInTheDocument();
    expect(screen.getByText('Image analysis: Failed')).toBeInTheDocument();
  });

  it('returns null when no status is available', () => {
    const { container } = render(<SocialJobStatusPill status={null} label='Image analysis' />);
    expect(container).toBeEmptyDOMElement();
  });
});
