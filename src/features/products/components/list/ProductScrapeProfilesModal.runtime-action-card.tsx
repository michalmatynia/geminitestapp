'use client';

import Link from 'next/link';

import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';

import type { ProductScrapeProfileRuntimeActionSetting } from './useProductScrapeProfileRuntimeActionSetting';

type RuntimeActionConnection = NonNullable<ProductScrapeProfileRuntimeActionSetting['action']>;

const formatRuntimeActionUpdatedAt = (value: string): string | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

function ProductScrapeProfilesRuntimeStepList({
  action,
}: {
  action: RuntimeActionConnection;
}): React.JSX.Element {
  return (
    <div className='mt-3 border-t border-border/50 pt-3'>
      <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
        Playwright sequencer steps
      </p>
      <ol
        aria-label='Playwright sequencer steps'
        className='mt-2 grid max-h-44 gap-1 overflow-y-auto pr-1 md:grid-cols-2'
      >
        {action.steps.map((step, index) => (
          <li
            key={`${step.id}-${index}`}
            className='flex min-w-0 items-center gap-2 rounded-md border border-border/40 bg-background/35 px-2 py-1.5 text-xs'
          >
            <span className='w-5 shrink-0 text-right tabular-nums text-muted-foreground'>
              {index + 1}
            </span>
            <span className='min-w-0 flex-1 truncate'>{step.label}</span>
            <Badge variant={step.enabled ? 'secondary' : 'outline'}>
              {step.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ProductScrapeProfilesRuntimeActionCard({
  runtimeAction,
}: {
  runtimeAction: ProductScrapeProfileRuntimeActionSetting;
}): React.JSX.Element | null {
  const action = runtimeAction.action;
  if (action === null) return null;
  const actionUpdatedAt = formatRuntimeActionUpdatedAt(action.updatedAt);

  return (
    <div className='rounded-md border border-border/60 bg-muted/10 p-3'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 space-y-1'>
          <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
            Connected scraping action
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <Link
              href={resolveStepSequencerActionHref(action.id)}
              className='text-sm font-medium underline-offset-4 hover:underline'
            >
              {action.name}
            </Link>
            <Badge variant='secondary'>{action.runtimeKey}</Badge>
            {action.isSeedFallback ? (
              <Badge variant='outline'>Seed default</Badge>
            ) : (
              <Badge variant='success'>Saved action</Badge>
            )}
          </div>
          {action.description !== null ? (
            <p className='max-w-3xl text-xs text-muted-foreground'>{action.description}</p>
          ) : null}
        </div>
        <Badge variant='secondary'>{action.browserModeLabel}</Badge>
      </div>
      <div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
        <span>Action ID: {action.id}</span>
        <span>
          Steps: {action.enabledStepCount}/{action.totalStepCount}
        </span>
        {actionUpdatedAt !== null ? <span>Updated: {actionUpdatedAt}</span> : null}
      </div>
      {action.fallbackReason !== null ? (
        <Alert
          className='mt-3'
          variant='warning'
          title='Seed fallback active'
          description={action.fallbackReason}
        />
      ) : null}
      <ProductScrapeProfilesRuntimeStepList action={action} />
    </div>
  );
}
