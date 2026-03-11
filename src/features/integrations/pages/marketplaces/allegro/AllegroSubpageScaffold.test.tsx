/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AllegroSubpageScaffold } from './AllegroSubpageScaffold';

describe('AllegroSubpageScaffold', () => {
  it('renders the shared Allegro back link and compact placeholder state', () => {
    render(
      <AllegroSubpageScaffold
        title='Connections'
        description='Manage Allegro accounts.'
        emptyState={{
          title: 'Setup required',
          description: 'Connection setup will appear here.',
        }}
      />
    );

    expect(screen.getByRole('link', { name: '← Allegro' })).toHaveAttribute(
      'href',
      '/admin/integrations/marketplaces/allegro'
    );
    expect(screen.getByRole('heading', { name: 'Connections' })).toBeInTheDocument();
    expect(screen.getByText('Connection setup will appear here.')).toBeInTheDocument();
  });
});
