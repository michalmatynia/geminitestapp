'use client';

import { DownloadCloud, Loader2 } from 'lucide-react';
import { type JSX, useCallback, useEffect, useState } from 'react';

import { Alert, Badge, Button, Card } from '@/shared/ui/primitives.public';

import type { ConnectionImportResult } from '../from-connection';
import type { ListedProgrammableConnection } from '../from-connection-server';

const apiListConnections = async (): Promise<ListedProgrammableConnection[]> => {
  const res = await fetch('/api/playwright/scripters/connections');
  if (!res.ok) throw new Error(`List connections failed (${res.status})`);
  const body = (await res.json()) as { connections: ListedProgrammableConnection[] };
  return body.connections ?? [];
};

const apiImport = async (
  connectionId: string
): Promise<ConnectionImportResult> => {
  const res = await fetch('/api/playwright/scripters/import-from-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Import failed (${res.status})`);
  }
  return (await res.json()) as ConnectionImportResult;
};

export type ScripterImportFromConnectionPanelProps = {
  onImported: (result: ConnectionImportResult) => void;
};

export function ScripterImportFromConnectionPanel({
  onImported,
}: ScripterImportFromConnectionPanelProps): JSX.Element {
  const [connections, setConnections] = useState<ListedProgrammableConnection[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadConnections = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const list = await apiListConnections();
      setConnections(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0]!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (expanded && !connections) void loadConnections();
  }, [expanded, connections, loadConnections]);

  const doImport = async (): Promise<void> => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiImport(selectedId);
      onImported(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className='space-y-2 p-3'>
      <button
        type='button'
        className='flex w-full items-center justify-between text-left text-sm font-semibold'
        onClick={() => setExpanded((v) => !v)}
      >
        <span className='flex items-center gap-2'>
          <DownloadCloud className='size-4' />
          Import from programmable connection
        </span>
        <Badge variant='outline' className='text-xs'>
          {expanded ? 'hide' : 'show'}
        </Badge>
      </button>
      {expanded ? (
        <div className='space-y-2'>
          {error ? <Alert variant='destructive'>{error}</Alert> : null}
          {busy && !connections ? (
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Loader2 className='size-4 animate-spin' />
              Loading connections…
            </div>
          ) : null}
          {connections?.length === 0 ? (
            <Alert>No programmable connections available to import.</Alert>
          ) : null}
          {connections && connections.length > 0 ? (
            <div className='flex flex-wrap items-end gap-2'>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className='h-9 flex-1 min-w-[220px] rounded-md border border-input bg-background px-2 text-sm'
              >
                {connections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name}
                    {conn.hasFieldMapper ? '' : ' (no field map)'}
                  </option>
                ))}
              </select>
              <Button
                type='button'
                size='sm'
                onClick={doImport}
                disabled={busy || !selectedId}
              >
                {busy ? (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                ) : (
                  <DownloadCloud className='mr-2 size-4' />
                )}
                Import as new scripter
              </Button>
            </div>
          ) : null}
          <p className='text-xs text-muted-foreground'>
            Pulls the base URL + field-mapper rows into a scripter draft. Save to persist.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
