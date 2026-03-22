/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageLayout } from '@/shared/ui/PageLayout';

describe('PageLayout', () => {
  it('renders tabs, wraps content in a panel, and calls save handlers', () => {
    const onSave = vi.fn();

    render(
      <PageLayout
        title='Catalog'
        description='Manage product settings'
        wrapInPanel
        onSave={onSave}
        tabs={{
          activeTab: 'general',
          onTabChange: vi.fn(),
          tabsList: [
            { value: 'general', label: 'General' },
            { value: 'advanced', label: 'Advanced' },
          ],
        }}
      >
        <div data-testid='page-layout-body'>Body</div>
      </PageLayout>
    );

    expect(screen.getByRole('heading', { name: 'Catalog' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Advanced' })).toBeInTheDocument();
    expect(screen.getByTestId('page-layout-body').closest('.rounded-lg')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save Configuration' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
