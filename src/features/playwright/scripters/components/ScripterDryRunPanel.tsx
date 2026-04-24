'use client';

import { Loader2, Play, Save } from 'lucide-react';
import { type JSX, useState } from 'react';

import { Alert, Badge, Button, Card } from '@/shared/ui/primitives.public';

import type { ScripterImportSourceResult } from '../scripter-import-source';

export type ScripterDryRunPanelProps = {
  scripterId: string;
  onCommit?: () => void;
  committing?: boolean;
};

const callDryRun = async (scripterId: string): Promise<ScripterImportSourceResult> => {
  const res = await fetch(`/api/playwright/scripters/${scripterId}/dry-run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Dry-run failed (${res.status})`);
  }
  return (await res.json()) as ScripterImportSourceResult;
};

export function ScripterDryRunPanel({
  scripterId,
  onCommit,
  committing,
}: ScripterDryRunPanelProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScripterImportSourceResult | null>(null);

  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setResult(await callDryRun(scripterId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className='space-y-3 p-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold'>Dry-run preview</h3>
        <div className='flex gap-2'>
          <Button type='button' size='sm' variant='outline' onClick={run} disabled={busy}>
            {busy ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Play className='mr-2 size-4' />}
            Run preview
          </Button>
          {onCommit && result ? (
            <Button type='button' size='sm' onClick={onCommit} disabled={committing}>
              {committing ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Save className='mr-2 size-4' />}
              Commit drafts
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <Alert variant='destructive'>{error}</Alert> : null}

      {result ? (
        <>
          <div className='flex flex-wrap gap-2 text-xs'>
            <Badge variant='secondary'>{result.summary.rawCount} records</Badge>
            <Badge variant={result.summary.recordsWithErrors > 0 ? 'destructive' : 'secondary'}>
              {result.summary.recordsWithErrors} with errors
            </Badge>
            <Badge variant='outline'>{result.source.visitedUrls.length} pages visited</Badge>
          </div>
          <div className='max-h-[420px] overflow-auto rounded border border-border/40'>
            <table className='w-full text-xs'>
              <thead className='sticky top-0 bg-muted/60'>
                <tr>
                  <th className='px-2 py-1 text-left'>#</th>
                  <th className='px-2 py-1 text-left'>title</th>
                  <th className='px-2 py-1 text-left'>price</th>
                  <th className='px-2 py-1 text-left'>sku</th>
                  <th className='px-2 py-1 text-left'>issues</th>
                </tr>
              </thead>
              <tbody>
                {result.drafts.map((draft) => (
                  <tr key={draft.index} className='border-t border-border/30'>
                    <td className='px-2 py-1 text-muted-foreground'>{draft.index}</td>
                    <td className='px-2 py-1 font-medium'>{draft.draft.name ?? '—'}</td>
                    <td className='px-2 py-1'>{draft.draft.price ?? '—'}</td>
                    <td className='px-2 py-1 font-mono'>{draft.draft.sku ?? '—'}</td>
                    <td className='px-2 py-1'>
                      {draft.issues.length === 0 ? (
                        <span className='text-emerald-500'>ok</span>
                      ) : (
                        <span className='text-destructive'>
                          {draft.issues.map((i) => i.field).join(', ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </Card>
  );
}
