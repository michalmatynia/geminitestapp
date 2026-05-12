'use client';

import type { JSX } from 'react';

import type {
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineOperationJob,
} from '@/shared/contracts/database';
import { Badge } from '@/shared/ui/primitives.public';

import { useDatabaseEngineStateContext } from '../../context/DatabaseEngineContext';

type BackupJobSummary = {
  id: string;
  status: DatabaseEngineOperationJob['status'];
  target: DatabaseEngineManagedMongoApplicationTarget;
  source: string;
  createdAt: string;
  resultSummary: string | null;
  errorMessage: string | null;
};

const isManagedMongoApplicationTarget = (
  value: unknown
): value is DatabaseEngineManagedMongoApplicationTarget =>
  value === 'all' ||
  value === 'geminitestapp' ||
  value === 'studiq' ||
  value === 'cms-builder' ||
  value === 'products';

const getJobTarget = (
  payload: Record<string, unknown> | undefined
): DatabaseEngineManagedMongoApplicationTarget => {
  const application = payload?.['application'];
  return isManagedMongoApplicationTarget(application) ? application : 'all';
};

const hasValue = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== '';

const getJobCreatedAt = (job: DatabaseEngineOperationJob): string => {
  if (hasValue(job.createdAt)) {
    return job.createdAt;
  }

  if (hasValue(job.startedAt)) {
    return job.startedAt;
  }

  if (hasValue(job.finishedAt)) {
    return job.finishedAt;
  }

  return 'unknown';
};

const getResultSummary = (resultSummary: unknown): string | null => {
  if (typeof resultSummary === 'string') {
    return resultSummary;
  }

  if (resultSummary === null || resultSummary === undefined) {
    return null;
  }

  return JSON.stringify(resultSummary);
};

const formatTimestamp = (value: string): string => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : value;
};

export const buildBackupJobSummaries = (
  jobs: DatabaseEngineOperationJob[],
  limit = 5
): BackupJobSummary[] =>
  jobs
    .filter((job) => job.type === 'db_backup')
    .slice(0, limit)
    .map((job) => ({
      id: job.id,
      status: job.status,
      target: getJobTarget(job.payload),
      source: job.source ?? 'db_backup',
      createdAt: getJobCreatedAt(job),
      resultSummary: getResultSummary(job.resultSummary),
      errorMessage: job.errorMessage ?? null,
    }));

const getStatusVariant = (
  status: DatabaseEngineOperationJob['status']
): 'active' | 'error' | 'pending' | 'warning' => {
  if (status === 'completed') return 'active';
  if (status === 'failed' || status === 'canceled') return 'error';
  if (status === 'running') return 'warning';
  return 'pending';
};

export function BackupOperationJobsSummary(): JSX.Element {
  const { operationsJobs } = useDatabaseEngineStateContext();
  const jobs = buildBackupJobSummaries(operationsJobs?.jobs ?? []);

  return (
    <div className='space-y-3 rounded-md border border-white/10 bg-card/30 p-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='space-y-1'>
          <h3 className='text-sm font-semibold text-white'>Recent Backup Jobs</h3>
          <p className='text-xs text-gray-400'>
            Queue snapshot: {operationsJobs?.timestamp ?? 'not loaded yet'}
          </p>
        </div>
        <Badge variant='outline' className='text-xs'>
          {jobs.length.toLocaleString()} shown
        </Badge>
      </div>

      {jobs.length === 0 ? (
        <p className='text-xs text-gray-400'>No backup jobs recorded yet.</p>
      ) : (
        <div className='grid gap-2 lg:grid-cols-2 xl:grid-cols-5'>
          {jobs.map((job) => (
            <div key={job.id} className='rounded-md border border-white/10 bg-black/20 p-3'>
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0 space-y-1'>
                  <p className='truncate font-mono text-xs text-gray-200' title={job.id}>
                    {job.id}
                  </p>
                  <p className='text-xs text-gray-400'>{formatTimestamp(job.createdAt)}</p>
                </div>
                <Badge variant={getStatusVariant(job.status)} className='text-xs'>
                  {job.status}
                </Badge>
              </div>
              <div className='mt-2 space-y-1 text-xs text-gray-300'>
                <p>Target: {job.target}</p>
                <p>Source: {job.source}</p>
                {job.resultSummary !== null && job.resultSummary !== '' ? (
                  <p className='line-clamp-2 text-gray-400' title={job.resultSummary}>
                    {job.resultSummary}
                  </p>
                ) : null}
                {job.errorMessage !== null && job.errorMessage !== '' ? (
                  <p className='line-clamp-2 text-rose-200' title={job.errorMessage}>
                    {job.errorMessage}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
