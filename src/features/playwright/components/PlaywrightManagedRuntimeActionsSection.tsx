'use client';

import Link from 'next/link';
import React from 'react';

import type { ManagedPlaywrightActionSummary } from '@/features/playwright/utils/playwright-managed-runtime-actions';
import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button } from '@/shared/ui/primitives.public';

type PlaywrightManagedRuntimeActionsSectionProps = {
  description: string;
  isLoading: boolean;
  summaries: ManagedPlaywrightActionSummary[];
};

function ManagedActionBadges({
  emptyMessage,
  label,
  values,
}: {
  emptyMessage: string;
  label: string;
  values: string[];
}): React.JSX.Element {
  return (
    <div className='space-y-1'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      {values.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {values.map((entry) => (
            <Badge key={entry} variant='secondary'>
              {entry}
            </Badge>
          ))}
        </div>
      ) : (
        <p className='text-xs text-muted-foreground'>{emptyMessage}</p>
      )}
    </div>
  );
}

function ManagedRuntimeActionCard({
  summary,
}: {
  summary: ManagedPlaywrightActionSummary;
}): React.JSX.Element {
  const description =
    typeof summary.action.description === 'string' && summary.action.description.trim().length > 0
      ? summary.action.description
      : 'No description provided.';

  return (
    <div className='rounded-md border border-border/60 bg-muted/10 p-3'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Link
              href={resolveStepSequencerActionHref(summary.action.id)}
              className='text-sm font-medium text-foreground underline-offset-4 hover:underline'
            >
              {summary.action.name}
            </Link>
            <Badge variant='neutral'>{summary.runtimeKey}</Badge>
            {summary.fallbackActive ? <Badge variant='outline'>Fallback active</Badge> : null}
          </div>
          <p className='text-xs text-muted-foreground'>{description}</p>
        </div>
        <Button variant='ghost' size='sm' asChild>
          <Link href={resolveStepSequencerActionHref(summary.action.id)}>Edit action</Link>
        </Button>
      </div>

      <div className='mt-3 grid gap-3 md:grid-cols-2'>
        <ManagedActionBadges
          label='Action settings'
          values={summary.executionSettingsSummary}
          emptyMessage='No action-specific browser settings are configured.'
        />
        <ManagedActionBadges
          label='browser_preparation step'
          values={summary.browserPreparationSummary}
          emptyMessage='No step-level preparation overrides are configured.'
        />
      </div>

      {summary.fallbackActive && summary.fallbackReason !== null ? (
        <p className='mt-3 text-xs text-amber-400'>{summary.fallbackReason}</p>
      ) : null}
    </div>
  );
}

export function PlaywrightManagedRuntimeActionsSection({
  description,
  isLoading,
  summaries,
}: PlaywrightManagedRuntimeActionsSectionProps): React.JSX.Element {
  return (
    <FormSection
      title='Step Sequencer runtime actions'
      description={description}
      actions={
        <Button variant='outline' size='sm' asChild>
          <Link href='/admin/playwright/step-sequencer'>Open Step Sequencer</Link>
        </Button>
      }
      className='p-4'
    >
      {isLoading ? (
        <p className='mt-4 text-xs text-gray-500'>Loading managed runtime actions...</p>
      ) : (
        <div className='mt-4 space-y-3'>
          {summaries.map((summary) => (
            <ManagedRuntimeActionCard key={summary.runtimeKey} summary={summary} />
          ))}
        </div>
      )}
    </FormSection>
  );
}
