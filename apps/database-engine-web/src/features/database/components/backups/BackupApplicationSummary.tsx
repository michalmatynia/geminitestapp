'use client';

import { DatabaseIcon, DownloadIcon } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseInfo,
} from '@/shared/contracts/database';
import { Badge, Button } from '@/shared/ui/primitives.public';

import { buildManagedMongoCrudHref } from '../crud/ManagedMongoScopePanel';
import { useDatabaseBackupsStateContext } from '../../context/DatabaseBackupsContext';
import {
  useDatabaseEngineActionsContext,
  useDatabaseEngineStateContext,
} from '../../context/DatabaseEngineContext';

type BackupApplicationSummaryItem = {
  application: DatabaseEngineManagedMongoApplication;
  label: string;
  folder: string;
  count: number;
  totalSizeBytes: number;
  latestBackup: DatabaseInfo | null;
};

const MANAGED_APPLICATIONS: Array<{
  application: DatabaseEngineManagedMongoApplication;
  label: string;
}> = [
  { application: 'geminitestapp', label: 'GeminiTest App' },
  { application: 'studiq', label: 'StudiQ' },
  { application: 'cms-builder', label: 'CMS Builder' },
  { application: 'products', label: 'Ecommerce' },
];

const APPLICATION_SET = new Set(
  MANAGED_APPLICATIONS.map((item) => item.application)
);

const getBackupApplication = (
  backupName: string
): DatabaseEngineManagedMongoApplication => {
  const [firstSegment] = backupName.split('/');
  return APPLICATION_SET.has(firstSegment as DatabaseEngineManagedMongoApplication)
    ? (firstSegment as DatabaseEngineManagedMongoApplication)
    : 'geminitestapp';
};

const getBackupTimestamp = (backup: DatabaseInfo): number => {
  const timestamp = Date.parse(backup.lastModifiedAt ?? backup.createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'Never';
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : 'Never';
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

export const buildBackupApplicationSummaries = (
  backups: DatabaseInfo[]
): BackupApplicationSummaryItem[] =>
  MANAGED_APPLICATIONS.map(({ application, label }) => {
    const applicationBackups = backups.filter(
      (backup) => getBackupApplication(backup.name) === application
    );
    const latestBackup =
      applicationBackups.length === 0
        ? null
        : [...applicationBackups].sort(
            (left, right) => getBackupTimestamp(right) - getBackupTimestamp(left)
          )[0] ?? null;

    return {
      application,
      label,
      folder: `${application}/`,
      count: applicationBackups.length,
      totalSizeBytes: applicationBackups.reduce((sum, backup) => sum + backup.size, 0),
      latestBackup,
    };
  });

export function BackupApplicationSummary(): JSX.Element {
  const { data, backupRunNowAllowed, isProd } = useDatabaseBackupsStateContext();
  const { backupManagedMongo } = useDatabaseEngineActionsContext();
  const { isBackingUpManagedMongo } = useDatabaseEngineStateContext();
  const summaries = buildBackupApplicationSummaries(data);
  const isBackupDisabled = isProd || !backupRunNowAllowed || isBackingUpManagedMongo;
  const backupTitle = isBackupDisabled
    ? isProd
      ? 'Disabled in production'
      : 'Disabled by Database Engine operation controls'
    : undefined;

  return (
    <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
      {summaries.map((summary) => (
        <div
          key={summary.application}
          className='space-y-3 rounded-md border border-white/10 bg-card/30 p-3'
        >
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0 space-y-1'>
              <h3 className='flex items-center gap-2 text-sm font-semibold text-white'>
                <DatabaseIcon className='size-4 shrink-0 text-emerald-200' />
                <span className='truncate'>{summary.label}</span>
              </h3>
              <p className='font-mono text-xs text-gray-400'>{summary.folder}</p>
            </div>
            <Badge variant={summary.count > 0 ? 'active' : 'outline'} className='text-xs'>
              {summary.count.toLocaleString()}
            </Badge>
          </div>

          <div className='space-y-1 text-xs text-gray-300'>
            <p>Total backup size: {formatBytes(summary.totalSizeBytes)}</p>
            <p>Latest: {formatTimestamp(summary.latestBackup?.lastModifiedAt ?? summary.latestBackup?.createdAt)}</p>
            <p
              className='truncate font-mono text-gray-500'
              title={summary.latestBackup?.name ?? ''}
            >
              {summary.latestBackup?.name ?? 'No backup yet'}
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='xs'
              disabled={isBackupDisabled}
              title={backupTitle}
              onClick={() => {
                void backupManagedMongo(summary.application);
              }}
            >
              <DownloadIcon className='size-3.5' />
              Backup
            </Button>
            <Button asChild variant='outline' size='xs'>
              <Link href={buildManagedMongoCrudHref(summary.application, 'local')}>
                Local Tables
              </Link>
            </Button>
            <Button asChild variant='outline' size='xs'>
              <Link href={buildManagedMongoCrudHref(summary.application, 'cloud')}>
                Cloud Tables
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
