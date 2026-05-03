'use client';

import { ArrowRight, GitPullRequest, Loader2 } from 'lucide-react';
import { type JSX, useState } from 'react';

import { Alert, Badge, Button, Card } from '@/shared/ui/primitives.public';

import type { ScripterCommitDiff, ScripterDiffEntry } from '../commit-diff';
import type { ScripterImportSourceResult } from '../scripter-import-source';

type DiffResponse = {
  source: ScripterImportSourceResult;
  diff: ScripterCommitDiff;
};

const callDiff = async (scripterId: string): Promise<DiffResponse> => {
  const res = await fetch(`/api/playwright/scripters/${scripterId}/diff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Diff failed (${res.status})`);
  }
  return (await res.json()) as DiffResponse;
};

const fmt = (value: number | string | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : String(value);

const DiffSection = ({
  title,
  entries,
  variant,
  emptyText,
  showExisting,
}: {
  title: string;
  entries: ScripterDiffEntry[];
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  emptyText: string;
  showExisting?: boolean;
}): JSX.Element => (
  <details className='rounded border border-border/40' open={entries.length > 0}>
    <summary className='flex cursor-pointer items-center justify-between gap-2 px-2 py-1.5 text-sm font-semibold'>
      <span className='flex items-center gap-2'>
        <Badge variant={variant}>{entries.length}</Badge>
        {title}
      </span>
    </summary>
    {entries.length === 0 ? (
      <p className='px-3 py-2 text-xs text-muted-foreground'>{emptyText}</p>
    ) : (
      <div className='max-h-[260px] overflow-auto'>
        <table className='w-full text-xs'>
          <thead className='sticky top-0 bg-muted/60'>
            <tr>
              <th className='px-2 py-1 text-left'>#</th>
              <th className='px-2 py-1 text-left'>key</th>
              <th className='px-2 py-1 text-left'>draft</th>
              {showExisting ? <th className='px-2 py-1 text-left'>existing</th> : null}
              <th className='px-2 py-1 text-left'>changed</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.index} className='border-t border-border/30'>
                <td className='px-2 py-1 text-muted-foreground'>{entry.index}</td>
                <td className='px-2 py-1 font-mono'>{fmt(entry.externalId)}</td>
                <td className='px-2 py-1'>
                  <div className='font-medium'>{fmt(entry.draftName)}</div>
                  <div className='text-[10px] text-muted-foreground'>{fmt(entry.draftPrice)}</div>
                </td>
                {showExisting ? (
                  <td className='px-2 py-1'>
                    {entry.existing ? (
                      <>
                        <div className='font-medium'>{fmt(entry.existing.name)}</div>
                        <div className='text-[10px] text-muted-foreground'>
                          {fmt(entry.existing.price)}
                        </div>
                      </>
                    ) : (
                      <span className='text-muted-foreground'>—</span>
                    )}
                  </td>
                ) : null}
                <td className='px-2 py-1'>
                  {entry.changedFields.length === 0 ? (
                    <span className='text-muted-foreground'>—</span>
                  ) : (
                    <div className='flex flex-wrap gap-1'>
                      {entry.changedFields.map((field) => (
                        <Badge key={field} variant='outline' className='gap-0.5 text-[10px]'>
                          {field}
                          <ArrowRight className='size-3' />
                        </Badge>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </details>
);

export type ScripterDiffPanelProps = {
  scripterId: string;
};

export function ScripterDiffPanel({ scripterId }: ScripterDiffPanelProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DiffResponse | null>(null);

  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setData(await callDiff(scripterId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className='space-y-3 p-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold'>Catalog impact preview</h3>
        <Button type='button' size='sm' variant='outline' onClick={run} disabled={busy}>
          {busy ? <Loader2 className='mr-2 size-4 animate-spin' /> : <GitPullRequest className='mr-2 size-4' />}
          Diff against catalog
        </Button>
      </div>
      {error ? <Alert variant='destructive'>{error}</Alert> : null}
      {data ? (
        <div className='space-y-2'>
          <div className='flex flex-wrap gap-2 text-xs'>
            <Badge variant='secondary'>{data.diff.totals.new} new</Badge>
            <Badge variant='outline'>{data.diff.totals.update} would-update</Badge>
            <Badge variant='outline'>{data.diff.totals.unchanged} unchanged</Badge>
            <Badge variant='destructive'>{data.diff.totals.noKey} no key</Badge>
          </div>
          <DiffSection
            title='New (will create)'
            entries={data.diff.new}
            variant='secondary'
            emptyText='Nothing new to create.'
          />
          <DiffSection
            title='Would update existing'
            entries={data.diff.update}
            variant='outline'
            emptyText='Nothing changes for existing products.'
            showExisting
          />
          <DiffSection
            title='Unchanged (already match)'
            entries={data.diff.unchanged}
            variant='outline'
            emptyText='No matching unchanged products.'
            showExisting
          />
          <DiffSection
            title='No usable key (will skip on commit)'
            entries={data.diff.noKey}
            variant='destructive'
            emptyText='All drafts have a usable identifier.'
          />
        </div>
      ) : null}
    </Card>
  );
}
