'use client';

import { DatabaseIcon, DownloadIcon } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

import type { DatabaseEngineManagedMongoApplication, DatabaseInfo } from '@/shared/contracts/database';
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

const APPLICATION_SET = new Set(MANAGED_APPLICATIONS.map((item) => item.application));

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
  if (value === null || value === undefined || value === '') {
    return 'Never';
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : 'Never';
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const getBackupDisabledTitle = (
  isBackupDisabled: boolean,
  isProd: boolean
): string | undefined => {
  if (!isBackupDisabled) {
    return undefined;
  }
  return isProd ? 'Disabled in production' : 'Disabled by Database Engine operation controls';
};

const getLatestBackupTimestamp = (latestBackup: DatabaseInfo | null): string => {
  if (latestBackup === null) {
    return 'Never';
  }

  return formatTimestamp(latestBackup.lastModifiedAt ?? latestBackup.createdAt);
};

const getLatestBackupName = (latestBackup: DatabaseInfo | null): string => {
  if (latestBackup === null) {
    return 'No backup yet';
  }

  return latestBackup.name;
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

type BackupApplicationSummaryCardProps = {
  summary: BackupApplicationSummaryItem;
  isBackupDisabled: boolean;
  backupTitle: string | undefined;
  onBackup: (application: DatabaseEngineManagedMongoApplication) => void;
};

function SummaryCardHeader({
  label,
  folder,
  count,
}: {
  label: string;
  folder: string;
  count: number;
}): JSX.Element {
  const badgeVariant = count > 0 ? 'active' : 'outline';
  return (
    <div className='flex items-start justify-between gap-3'>
      <div className='min-w-0 space-y-1'>
        <h3 className='flex items-center gap-2 text-sm font-semibold text-white'>
          <DatabaseIcon className='size-4 shrink-0 text-emerald-200' />
          <span className='truncate'>{label}</span>
        </h3>
        <p className='font-mono text-xs text-gray-400'>{folder}</p>
      </div>
      <Badge variant={badgeVariant} className='text-xs'>
        {count.toLocaleString()}
      </Badge>
    </div>
  );
}

function SummaryCardStats({
  totalSizeBytes,
  latestTimestamp,
  latestBackupName,
  latestBackupTitle,
}: {
  totalSizeBytes: number;
  latestTimestamp: string;
  latestBackupName: string;
  latestBackupTitle: string;
}): JSX.Element {
  return (
    <div className='space-y-1 text-xs text-gray-300'>
      <p>Total backup size: {formatBytes(totalSizeBytes)}</p>
      <p>Latest: {latestTimestamp}</p>
      <p className='truncate font-mono text-gray-500' title={latestBackupTitle}>
        {latestBackupName}
      </p>
    </div>
  );
}

function SummaryCardActions({
  isBackupDisabled,
  backupTitle,
  application,
  onBackup,
}: {
  isBackupDisabled: boolean;
  backupTitle: string | undefined;
  application: DatabaseEngineManagedMongoApplication;
  onBackup: (application: DatabaseEngineManagedMongoApplication) => void;
}): JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        type='button'
        variant='outline'
        size='xs'
        disabled={isBackupDisabled}
        title={backupTitle}
        onClick={() => {
          onBackup(application);
        }}
      >
        <DownloadIcon className='size-3.5' />
        Backup
      </Button>
      <Button asChild variant='outline' size='xs'>
        <Link href={buildManagedMongoCrudHref(application, 'local')}>Local Tables</Link>
      </Button>
      <Button asChild variant='outline' size='xs'>
        <Link href={buildManagedMongoCrudHref(application, 'cloud')}>Cloud Tables</Link>
      </Button>
    </div>
  );
}

function BackupApplicationSummaryCard({
  summary,
  isBackupDisabled,
  backupTitle,
  onBackup,
}: BackupApplicationSummaryCardProps): JSX.Element {
  const latestTimestamp = getLatestBackupTimestamp(summary.latestBackup);
  const latestBackupName = getLatestBackupName(summary.latestBackup);

  return (
    <div className='space-y-3 rounded-md border border-white/10 bg-card/30 p-3'>
      <SummaryCardHeader label={summary.label} folder={summary.folder} count={summary.count} />
      <SummaryCardStats
        totalSizeBytes={summary.totalSizeBytes}
        latestTimestamp={latestTimestamp}
        latestBackupName={latestBackupName}
        latestBackupTitle={latestBackupName}
      />
      <SummaryCardActions
        isBackupDisabled={isBackupDisabled}
        backupTitle={backupTitle}
        application={summary.application}
        onBackup={onBackup}
      />
    </div>
  );
}

export function BackupApplicationSummary(): JSX.Element {
  const { data, backupRunNowAllowed, isProd } = useDatabaseBackupsStateContext();
  const { backupManagedMongo } = useDatabaseEngineActionsContext();
  const { isBackingUpManagedMongo } = useDatabaseEngineStateContext();
  const summaries = buildBackupApplicationSummaries(data);
  const isBackupDisabled = isProd || !backupRunNowAllowed || isBackingUpManagedMongo;
  const backupTitle = getBackupDisabledTitle(isBackupDisabled, isProd);

  const handleBackup = (application: DatabaseEngineManagedMongoApplication): void => {
    void backupManagedMongo(application);
  };

  return (
    <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
      {summaries.map((summary) => (
        <BackupApplicationSummaryCard
          key={summary.application}
          summary={summary}
          isBackupDisabled={isBackupDisabled}
          backupTitle={backupTitle}
          onBackup={handleBackup}
        />
      ))}
    </div>
  );
}
