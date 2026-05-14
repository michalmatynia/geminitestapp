'use client';

import { CheckCircle2, Cloud, Database } from 'lucide-react';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives.public';

import type { ProviderSettingsTarget } from './EcommerceProviderSettingsPanel.types';

export function ProviderPushResults({
  targets,
}: {
  targets: ProviderSettingsTarget[];
}): React.JSX.Element | null {
  if (targets.length === 0) return null;
  const targetCountLabel = `${targets.length} ecommerce database${targets.length === 1 ? '' : 's'}`;

  return (
    <Card variant='outline'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <CheckCircle2 className='size-4 text-emerald-400' aria-hidden='true' />
          Push Results
        </CardTitle>
        <Badge variant='info' className='w-fit'>{targetCountLabel}</Badge>
      </CardHeader>
      <CardContent className='grid gap-3 lg:grid-cols-2'>
        {targets.map((target) => (
          <ProviderTargetResultRow key={`${target.source}:${target.dbName}`} target={target} />
        ))}
      </CardContent>
    </Card>
  );
}

function ProviderTargetResultRow({
  target,
}: {
  target: ProviderSettingsTarget;
}): React.JSX.Element {
  const Icon = target.source === 'local' ? Database : Cloud;
  const changedCount = target.modifiedCount + target.upsertedCount;

  return (
    <div className='flex flex-col gap-3 rounded-md border border-border/70 bg-background/35 p-3 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex min-w-0 items-center gap-3'>
        <span className='flex size-9 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'>
          <Icon className='size-4' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <div className='truncate text-sm font-medium text-foreground'>{targetLabel(target.source)}</div>
          <div className='truncate text-xs text-muted-foreground'>{target.dbName}</div>
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <Badge variant='active'>Provider settings</Badge>
        <Badge variant={changedCount > 0 ? 'info' : 'neutral'}>{changedCount} changed</Badge>
        <Badge variant={target.matchedCount > 0 ? 'neutral' : 'warning'}>
          {target.matchedCount > 0 ? 'Updated' : 'Inserted'}
        </Badge>
      </div>
    </div>
  );
}

function targetLabel(source: ProviderSettingsTarget['source']): string {
  return source === 'local' ? 'Local ecommerce' : 'Cloud ecommerce';
}
