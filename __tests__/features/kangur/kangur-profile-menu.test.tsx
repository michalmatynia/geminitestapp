/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';

describe('KangurProfileMenu', () => {
  it('renders a direct link to the learner profile page', () => {
    render(<KangurProfileMenu basePath='/kangur' />);

    expect(screen.getByRole('link', { name: /profil/i })).toHaveAttribute(
      'href',
      '/kangur/profile'
    );
  });

  it('renders the active navigation styles when the profile page is selected', () => {
    render(<KangurProfileMenu basePath='/kangur' isActive />);

    expect(screen.getByRole('link', { name: /profil/i })).toHaveAttribute('aria-current', 'page');
  });
});
