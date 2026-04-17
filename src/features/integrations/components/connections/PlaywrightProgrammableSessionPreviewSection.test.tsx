// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { defaultPlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';
import { defaultIntegrationConnectionPlaywrightSettings } from '@/features/playwright/utils/playwright-settings-baseline';
import type { ProgrammableSessionDiagnostics } from '@/features/playwright/utils/playwright-programmable-session-diagnostics';
import type { ProgrammableSessionPreview } from '@/features/playwright/utils/playwright-programmable-session-preview';

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
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    title,
    description,
    children,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  ),
}));

import { PlaywrightProgrammableSessionPreviewSection } from './PlaywrightProgrammableSessionPreviewSection';

const createPreview = ({
  actionId,
  actionName,
  runtimeKey = null,
}: {
  actionId: string;
  actionName: string;
  runtimeKey?: string | null;
}): ProgrammableSessionPreview => ({
  action: {
    id: actionId,
    name: actionName,
    description: `${actionName} description`,
    runtimeKey,
    blocks: [],
    stepSetIds: [],
    personaId: null,
    executionSettings: defaultPlaywrightActionExecutionSettings,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
  },
  isDefault: false,
  actionBaselineSettings: defaultIntegrationConnectionPlaywrightSettings,
  actionSettingsSummary: ['Headless mode'],
  browserPreparationSummary: ['Viewport: 1440x900'],
  effectiveSummary: ['Headed'],
  overrideSummary: [],
});

describe('PlaywrightProgrammableSessionPreviewSection', () => {
  it('links selected session actions to the Step Sequencer', () => {
    const diagnostics: ProgrammableSessionDiagnostics = {
      sharedOverrideSummary: [],
      divergentActionSummary: [],
      conflictingSharedOverrideSummary: [],
    };

    render(
      <PlaywrightProgrammableSessionPreviewSection
        diagnostics={diagnostics}
        listingPreview={createPreview({
          actionId: 'listing-session-action',
          actionName: 'Listing Session Action',
          runtimeKey: 'playwright_programmable_listing',
        })}
        importPreview={createPreview({
          actionId: 'import-session-action',
          actionName: 'Import Session Action',
          runtimeKey: 'playwright_programmable_import',
        })}
      />
    );

    expect(
      screen.getByRole('link', { name: 'Listing Session Action' })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=listing-session-action'
    );
    expect(
      screen.getByRole('link', { name: 'Import Session Action' })
    ).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=import-session-action'
    );
  });
});
