// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ManagedPlaywrightActionSummary } from '@/features/playwright/utils/playwright-managed-runtime-actions';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children?: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    asChild,
  }: {
    children?: React.ReactNode;
    asChild?: boolean;
  }) => (asChild ? <div>{children}</div> : <button type='button'>{children}</button>),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    title,
    description,
    actions,
    children,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      {actions}
      {children}
    </section>
  ),
}));

import { PlaywrightManagedRuntimeActionsSection } from '@/features/playwright/components/PlaywrightManagedRuntimeActionsSection';

const seed = getPlaywrightRuntimeActionSeed('tradera_standard_list');

if (seed === null) {
  throw new Error('Missing tradera_standard_list runtime action seed');
}

const summary: ManagedPlaywrightActionSummary = {
  action: seed,
  browserPreparationConfig: null,
  browserPreparationSummary: ['Viewport: 1440x900'],
  executionSettingsSummary: ['Headed'],
  fallbackActive: false,
  fallbackReason: null,
  runtimeKey: 'tradera_standard_list',
};

describe('PlaywrightManagedRuntimeActionsSection', () => {
  it('links managed runtime actions to the Step Sequencer action editor', () => {
    render(
      <PlaywrightManagedRuntimeActionsSection
        description='Managed runtime action summary'
        isLoading={false}
        summaries={[summary]}
      />
    );

    expect(
      screen.getByRole('link', { name: seed.name })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=runtime_action__tradera_standard_list'
    );
    expect(
      screen.getByRole('link', { name: 'Edit action' })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=runtime_action__tradera_standard_list'
    );
  });
});
