// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminSettingsHomePage } from '@/features/admin/pages/AdminSettingsHomePage';

describe('AdminSettingsHomePage', () => {
  it('renders the text editors settings entry on the settings landing page', () => {
    render(<AdminSettingsHomePage />);

    const link = screen.getByRole('link', {
      name: /Text Editors/i,
    });

    expect(link).toHaveAttribute('href', '/admin/settings/text-editors');
    expect(
      screen.getByText('Configure reusable editor-engine instances and toolbar capabilities.')
    ).toBeInTheDocument();
  });
});
