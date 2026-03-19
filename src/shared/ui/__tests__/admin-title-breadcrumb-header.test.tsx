// @vitest-environment jsdom

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';

describe('AdminTitleBreadcrumbHeader', () => {
  it('keeps the breadcrumb directly under the title and the action rail on the right', () => {
    const { container } = render(
      <AdminTitleBreadcrumbHeader
        title={<h1>Title</h1>}
        breadcrumb={<nav>Breadcrumb</nav>}
        actions={
          <>
            <button type='button'>Action A</button>
            <button type='button'>Action B</button>
          </>
        }
      />
    );

    const headerRow = container.firstElementChild as HTMLDivElement | null;
    expect(headerRow).not.toBeNull();
    expect(headerRow).toHaveClass('flex', 'flex-wrap', 'items-start', 'justify-between', 'gap-3');

    const titleStack = within(headerRow as HTMLElement).getByRole('heading', { level: 1 }).closest(
      'div'
    )?.parentElement;
    expect(titleStack).not.toBeNull();
    expect(within(titleStack as HTMLElement).getByText('Breadcrumb')).toBeInTheDocument();

    const actionsContainer = screen.getByRole('button', { name: 'Action A' }).parentElement;
    expect(actionsContainer).not.toBeNull();
    expect(actionsContainer).toHaveClass('flex', 'flex-wrap', 'items-center', 'gap-2', 'pt-1');
    expect(within(actionsContainer as HTMLElement).getByRole('button', { name: 'Action B' })).toBeInTheDocument();
  });
});
