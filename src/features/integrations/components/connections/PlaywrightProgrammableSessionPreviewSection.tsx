'use client';

import Link from 'next/link';
import React from 'react';

import type { ProgrammableSessionDiagnostics } from '@/features/playwright/utils/playwright-programmable-session-diagnostics';
import type { ProgrammableSessionPreview } from '@/features/playwright/utils/playwright-programmable-session-preview';
import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import { Alert, Badge, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

type PlaywrightProgrammableSessionPreviewSectionProps = {
  diagnostics: ProgrammableSessionDiagnostics;
  listingPreview: ProgrammableSessionPreview;
  importPreview: ProgrammableSessionPreview;
};

function SummaryBadges({
  values,
  emptyMessage,
}: {
  values: string[];
  emptyMessage: string;
}): React.JSX.Element {
  return values.length > 0 ? (
    <div className='flex flex-wrap gap-1.5'>
      {values.map((value) => (
        <Badge key={value} variant='secondary'>
          {value}
        </Badge>
      ))}
    </div>
  ) : (
    <p className='text-xs text-muted-foreground'>{emptyMessage}</p>
  );
}

function PreviewSection({
  title,
  values,
  emptyMessage,
}: {
  title: string;
  values: string[];
  emptyMessage: string;
}): React.JSX.Element {
  return (
    <div className='space-y-1'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        {title}
      </p>
      <SummaryBadges values={values} emptyMessage={emptyMessage} />
    </div>
  );
}

function SessionPreviewHeader({
  title,
  preview,
}: {
  title: string;
  preview: ProgrammableSessionPreview;
}): React.JSX.Element {
  const actionDescription =
    typeof preview.action.description === 'string' && preview.action.description.trim().length > 0
      ? preview.action.description
      : 'No action description provided.';

  return (
    <div className='space-y-1'>
      <div className='flex flex-wrap items-center gap-2'>
        <p className='text-sm font-medium text-foreground'>{title}</p>
        <Badge variant={preview.isDefault ? 'outline' : 'info'}>
          {preview.isDefault ? 'Default action' : 'Custom action'}
        </Badge>
        {preview.action.runtimeKey !== null ? (
          <Badge variant='neutral'>{preview.action.runtimeKey}</Badge>
        ) : null}
      </div>
      <Link
        href={resolveStepSequencerActionHref(preview.action.id)}
        className='text-sm font-medium text-foreground underline-offset-4 hover:underline'
      >
        {preview.action.name}
      </Link>
      <p className='text-xs text-muted-foreground'>{actionDescription}</p>
    </div>
  );
}

function SessionPreviewCard({
  title,
  preview,
}: {
  title: string;
  preview: ProgrammableSessionPreview;
}): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border border-border/50 bg-background/20'>
      <div className='space-y-4'>
        <SessionPreviewHeader title={title} preview={preview} />

        <PreviewSection
          title='Effective session'
          values={preview.effectiveSummary}
          emptyMessage='No effective session details are available.'
        />

        <div className='grid gap-3 md:grid-cols-2'>
          <PreviewSection
            title='Action-owned settings'
            values={preview.actionSettingsSummary}
            emptyMessage='No action-specific browser settings are configured.'
          />
          <PreviewSection
            title='browser_preparation step'
            values={preview.browserPreparationSummary}
            emptyMessage='No step-level browser preparation overrides are configured.'
          />
        </div>

        <PreviewSection
          title='Legacy connection overrides'
          values={preview.overrideSummary}
          emptyMessage='Programmable runtime ignores connection-level browser overrides. Browser behavior follows persona baseline plus the selected action.'
        />
      </div>
    </Card>
  );
}

export function PlaywrightProgrammableSessionPreviewSection({
  diagnostics,
  listingPreview,
  importPreview,
}: PlaywrightProgrammableSessionPreviewSectionProps): React.JSX.Element {
  const hasSharedOverrideConflict = diagnostics.conflictingSharedOverrideSummary.length > 0;
  const hasSharedOverrides = diagnostics.sharedOverrideSummary.length > 0;
  const hasActionDivergence = diagnostics.divergentActionSummary.length > 0;
  let diagnosticsAlert: React.JSX.Element | null = null;

  if (hasSharedOverrideConflict) {
    diagnosticsAlert = (
      <Alert variant='warning' className='text-xs'>
        This connection keeps one shared override set for listing and import. The current
        overrides flatten differences between the selected session actions for{' '}
        <strong>{diagnostics.conflictingSharedOverrideSummary.join(', ')}</strong>.
      </Alert>
    );
  } else if (hasSharedOverrides) {
    diagnosticsAlert = (
      <Alert variant='info' className='text-xs'>
        The current programmable connection overrides apply to both listing and import sessions:{' '}
        <strong>{diagnostics.sharedOverrideSummary.join(', ')}</strong>.
        {hasActionDivergence ? (
          <>
            {' '}The selected session actions still diverge on{' '}
            <strong>{diagnostics.divergentActionSummary.join(', ')}</strong>.
          </>
        ) : null}
      </Alert>
    );
  }

  return (
    <FormSection
      title='Programmable session preview'
      description='Review the browser session posture for listing and import after persona baseline and the selected Step Sequencer action are applied.'
      className='p-4'
    >
      <div className='mt-4 space-y-4'>
        {diagnosticsAlert}

        <div className='grid gap-4 xl:grid-cols-2'>
          <SessionPreviewCard title='Listing session' preview={listingPreview} />
          <SessionPreviewCard title='Import session' preview={importPreview} />
        </div>
      </div>
    </FormSection>
  );
}
