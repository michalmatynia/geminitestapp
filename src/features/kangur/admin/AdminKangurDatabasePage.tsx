'use client';

import { CloudUpload, Database } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert, Button } from '@/features/kangur/shared/ui';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';

// ---------------------------------------------------------------------------
// Types (mirror the server-side types)
// ---------------------------------------------------------------------------

type StudiqPushProgress = {
  step: number;
  total: number;
  phase: 'connecting' | 'scanning' | 'writing' | 'done';
  message: string;
};

type StudiqPushToCloudResult = {
  collections: string[];
  collectionCount: number;
  documentCount: number;
  updatedAt: string;
};

type JobStatus = {
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress: StudiqPushProgress | null;
  failedReason?: string;
  result?: StudiqPushToCloudResult;
};

type PushState =
  | { kind: 'idle' }
  | { kind: 'enqueuing' }
  | { kind: 'active'; jobId: string | null; progress: StudiqPushProgress | null }
  | { kind: 'done'; result: StudiqPushToCloudResult; triggeredAt: string }
  | { kind: 'error'; message: string };

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const PUSH_API = '/api/v2/kangur/push-to-cloud';
const POLL_INTERVAL_MS = 800;

async function triggerPush(): Promise<{ ok: boolean; jobId: string | null; mode: string; triggeredAt: string; result?: StudiqPushToCloudResult; error?: string }> {
  const res = await fetch(PUSH_API, { method: 'POST' });
  return res.json() as Promise<{ ok: boolean; jobId: string | null; mode: string; triggeredAt: string; result?: StudiqPushToCloudResult; error?: string }>;
}

async function pollJob(jobId: string): Promise<JobStatus | null> {
  const res = await fetch(`${PUSH_API}?jobId=${encodeURIComponent(jobId)}`);
  if (!res.ok) return null;
  const body = await res.json() as { ok: boolean; jobStatus: JobStatus | null };
  return body.jobStatus ?? null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function useStudiqPushController() {
  const [pushState, setPushState] = useState<PushState>({ kind: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback((jobId: string) => {
    stopPolling();
    pollRef.current = setInterval(() => {
      void (async () => {
        const status = await pollJob(jobId);
        if (status === null) return;

        if (status.state === 'completed' && status.result) {
          stopPolling();
          setPushState({ kind: 'done', result: status.result, triggeredAt: new Date().toISOString() });
          return;
        }

        if (status.state === 'failed') {
          stopPolling();
          setPushState({ kind: 'error', message: status.failedReason ?? 'Job failed.' });
          return;
        }

        if (status.progress) {
          setPushState({ kind: 'active', jobId, progress: status.progress });
        }
      })();
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const handlePush = useCallback(async () => {
    setPushState({ kind: 'enqueuing' });
    try {
      const outcome = await triggerPush();
      if (!outcome.ok) {
        setPushState({ kind: 'error', message: outcome.error ?? 'Failed to start push.' });
        return;
      }
      if (outcome.result) {
        // inline mode — result already available
        setPushState({ kind: 'done', result: outcome.result, triggeredAt: outcome.triggeredAt });
        return;
      }
      if (outcome.jobId) {
        setPushState({ kind: 'active', jobId: outcome.jobId, progress: null });
        startPolling(outcome.jobId);
      } else {
        setPushState({ kind: 'error', message: 'No job ID returned and no inline result.' });
      }
    } catch (err) {
      setPushState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [startPolling]);

  const handleReset = useCallback(() => {
    stopPolling();
    setPushState({ kind: 'idle' });
  }, [stopPolling]);

  return { pushState, handlePush, handleReset };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((step / total) * 100)) : 0;
  return (
    <div className='h-1.5 w-full overflow-hidden rounded-full bg-border/40'>
      <div
        className='h-full rounded-full bg-indigo-500 transition-all duration-300'
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PushResultCard({ result }: { result: StudiqPushToCloudResult }) {
  return (
    <div className='rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm'>
      <p className='font-medium text-green-400'>Push complete</p>
      <dl className='mt-1.5 grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground'>
        <div>
          <dt>Collections</dt>
          <dd className='font-semibold text-foreground'>{result.collectionCount}</dd>
        </div>
        <div>
          <dt>Documents</dt>
          <dd className='font-semibold text-foreground'>{result.documentCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Synced at</dt>
          <dd className='font-semibold text-foreground'>
            {new Date(result.updatedAt).toLocaleTimeString()}
          </dd>
        </div>
      </dl>
      {result.collections.length > 0 && (
        <details className='mt-2'>
          <summary className='cursor-pointer text-xs text-muted-foreground hover:text-foreground'>
            Show collections ({result.collections.length})
          </summary>
          <ul className='mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground'>
            {result.collections.map((col) => (
              <li key={col} className='truncate font-mono'>
                {col}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function AdminKangurDatabasePage(): React.JSX.Element {
  const { pushState, handlePush, handleReset } = useStudiqPushController();

  return (
    <KangurAdminContentShell
      title='StudiQ Database'
      description='Manage the StudiQ local database mirror and sync to cloud.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Database' },
      ]}
      headerActions={
        pushState.kind !== 'idle' && pushState.kind !== 'enqueuing' && pushState.kind !== 'active' ? (
          <Button variant='outline' size='sm' onClick={handleReset}>
            Reset
          </Button>
        ) : null
      }
    >
      <div className='space-y-6'>
        {/* Push to cloud panel */}
        <div className='rounded-lg border border-border/60 bg-card/35 p-5 shadow-sm'>
          <div className='mb-4 flex items-start gap-3'>
            <div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-card/60'>
              <CloudUpload className='size-4 text-indigo-400' />
            </div>
            <div className='min-w-0'>
              <p className='font-medium text-sm'>Push local StudiQ database to cloud</p>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                Copies all StudiQ collections from the local mirror (port 27018) to the Atlas cloud
                database. Existing cloud records matching the selection are replaced.
              </p>
            </div>
          </div>

          {/* Idle state */}
          {pushState.kind === 'idle' && (
            <Button
              size='sm'
              onClick={() => { void handlePush(); }}
              className='gap-1.5'
            >
              <Database className='size-3.5' />
              Push to cloud
            </Button>
          )}

          {/* Enqueuing */}
          {pushState.kind === 'enqueuing' && (
            <div className='space-y-2 text-xs text-muted-foreground'>
              <ProgressBar step={0} total={1} />
              <p>Starting push job…</p>
            </div>
          )}

          {/* Active with progress */}
          {pushState.kind === 'active' && (
            <div className='space-y-2 text-xs text-muted-foreground'>
              {pushState.progress && (
                <>
                  <ProgressBar step={pushState.progress.step} total={pushState.progress.total} />
                  <p>
                    Step {pushState.progress.step}/{pushState.progress.total} — {pushState.progress.message}
                  </p>
                </>
              )}
              {!pushState.progress && (
                <>
                  <ProgressBar step={0} total={1} />
                  <p>Waiting for worker…</p>
                </>
              )}
            </div>
          )}

          {/* Done */}
          {pushState.kind === 'done' && (
            <PushResultCard result={pushState.result} />
          )}

          {/* Error */}
          {pushState.kind === 'error' && (
            <Alert variant='error' className='text-xs'>
              {pushState.message}
            </Alert>
          )}
        </div>

        {/* Environment info */}
        <div className='rounded-lg border border-border/60 bg-card/20 px-4 py-3 text-xs text-muted-foreground'>
          <p className='mb-1 font-medium text-foreground/70'>Required environment variables</p>
          <ul className='space-y-0.5 font-mono'>
            <li>
              <span className='text-indigo-400'>STUDIQ_MONGODB_CLOUD_URI</span>
              {' '}— Atlas connection string for cloud target
            </li>
            <li>
              <span className='text-indigo-400'>STUDIQ_MONGODB_CLOUD_DB</span>
              {' '}— cloud database name (default: inferred from URI)
            </li>
            <li>
              <span className='text-muted-foreground/60'>STUDIQ_MONGODB_LOCAL_URI</span>
              {' '}— local source URI (default: mongodb://127.0.0.1:27018/studiq_local)
            </li>
          </ul>
        </div>
      </div>
    </KangurAdminContentShell>
  );
}
