/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SectionHeaderBackLink } from '@/shared/ui/section-header-back-link';

describe('SectionHeaderBackLink', () => {
  it('renders the shared internal back-link styling with an optional arrow prefix', () => {
    render(
      <SectionHeaderBackLink href='/admin/settings' arrow>
        Back to settings
      </SectionHeaderBackLink>
    );

    const link = screen.getByRole('link', { name: '← Back to settings' });
    expect(link).toHaveAttribute('href', '/admin/settings');
    expect(link).toHaveClass('text-blue-300', 'hover:text-blue-200');
  });
});
