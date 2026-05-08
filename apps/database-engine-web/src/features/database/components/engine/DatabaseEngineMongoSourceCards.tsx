'use client';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineMongoLastSync,
  DatabaseEngineMongoSyncApplicationTransfer,
  DatabaseEngineMongoSyncBackup,
  DatabaseEngineMongoSourceEntry,
  DatabaseEngineMongoSourceState,
  MongoSource,
} from '@/shared/contracts/database';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { Card } from '@/shared/ui/primitives.public';

import type { JSX } from 'react';

const SOURCE_LABELS: Record<MongoSource, string> = {
  local: 'Local Database',
  cloud: 'Cloud Database',
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

const resolveEnvSwitchTarget = (source: MongoSource | null): MongoSource =>
  source === 'cloud' ? 'local' : 'cloud';

const resolveConnectionLabel = (
  reachable: DatabaseEngineMongoSourceEntry['reachable']
): string => {
  if (reachable === false) return 'Unreachable';
  if (reachable === true) return 'Reachable';
  return 'Unknown';
};

const resolveVerificationSummary = (
  lastSync: DatabaseEngineMongoLastSync | null
): string | null => {
  const verification = lastSync?.verification;
  if (verification === null || verification === undefined) return null;

  if (verification.status === 'passed') {
    return `Verified exact mirror (${verification.collectionsCompared} collections)`;
  }

  return `Verification mismatches detected (${verification.mismatches.length})`;
};

const resolveMongoSourceEntryViewModel = (
  entry: DatabaseEngineMongoSourceEntry
): {
  dbName: string | null;
  healthError: string | null;
  activationHint: string | null;
  maskedUri: string;
  connectionLabel: string;
  showActiveBadge: boolean;
  showUnreachableBadge: boolean;
} => ({
  dbName: entry.dbName !== null && entry.dbName !== '' ? entry.dbName : null,
  healthError:
    entry.healthError !== null && entry.healthError !== '' ? entry.healthError : null,
  activationHint:
    !entry.isActive && entry.configured
      ? `To activate this target, add or update MONGODB_ACTIVE_SOURCE_DEFAULT=${entry.source} in the effective env file (.env.local overrides .env in development) and restart the server.`
      : null,
  maskedUri: entry.maskedUri ?? 'Not configured in the effective env yet.',
  connectionLabel: resolveConnectionLabel(entry.reachable),
  showActiveBadge: entry.isActive,
  showUnreachableBadge: entry.reachable === false,
});

const resolveMongoSourceOverviewModel = (
  mongoSourceState: DatabaseEngineMongoSourceState
): {
  activeLabel: string;
  activeDbName: string | null;
  localUri: string;
  cloudUri: string;
  envSelectedSource: MongoSource;
  envSwitchTarget: MongoSource;
} => {
  const activeSource = mongoSourceState.activeSource ?? mongoSourceState.defaultSource;
  const envSelectedSource = mongoSourceState.defaultSource ?? activeSource ?? 'local';
  const activeDbName = (() => {
    const activeEntry =
      activeSource === 'cloud' ? mongoSourceState.cloud : mongoSourceState.local;

    return activeEntry.dbName !== null && activeEntry.dbName !== '' ? activeEntry.dbName : null;
  })();
  const activeLabel =
    activeSource !== null ? `Active source: ${activeSource}` : 'No active Mongo target selected yet.';

  return {
    activeLabel,
    activeDbName,
    localUri: mongoSourceState.local.maskedUri ?? '<configure local uri>',
    cloudUri: mongoSourceState.cloud.maskedUri ?? '<configure cloud uri>',
    envSelectedSource,
    envSwitchTarget: resolveEnvSwitchTarget(envSelectedSource),
  };
};

const resolveLastTransferMetrics = (
  lastSync: DatabaseEngineMongoLastSync
): string[] => {
  const metrics = [`Synced at: ${lastSync.syncedAt}`, `Direction: ${lastSync.direction}`];

  if (lastSync.archivePath !== null && lastSync.archivePath !== '') {
    metrics.push(`Transfer archive: ${lastSync.archivePath}`);
  }
  if (lastSync.logPath !== null && lastSync.logPath !== '') {
    metrics.push(`Transfer log: ${lastSync.logPath}`);
  }
  if (lastSync.verification !== null && lastSync.verification !== undefined) {
    metrics.push(
      `Verification: ${lastSync.verification.status} at ${lastSync.verification.verifiedAt}`
    );
  }

  const verificationSummary = resolveVerificationSummary(lastSync);
  if (verificationSummary !== null) {
    metrics.push(verificationSummary);
  }

  const applicationTransferCount = lastSync.applicationTransfers?.length ?? 0;
  if (applicationTransferCount > 0) {
    metrics.push(`Application databases synced: ${applicationTransferCount}`);
  }

  metrics.push(`Pre-sync backups: ${lastSync.preSyncBackups.length}`);

  return metrics;
};

export type MongoApplicationTransferSummary = {
  application: DatabaseEngineManagedMongoApplication;
  label: string;
  transfer: DatabaseEngineMongoSyncApplicationTransfer | null;
  sourceBackup: DatabaseEngineMongoSyncBackup | null;
  targetBackup: DatabaseEngineMongoSyncBackup | null;
  backupCount: number;
};

const getBackupApplication = (
  backup: DatabaseEngineMongoSyncBackup
): DatabaseEngineManagedMongoApplication => backup.application ?? 'geminitestapp';

export const buildMongoApplicationTransferSummaries = (
  lastSync: DatabaseEngineMongoLastSync
): MongoApplicationTransferSummary[] =>
  MANAGED_APPLICATIONS.map(({ application, label }) => {
    const transfer =
      (lastSync.applicationTransfers ?? []).find(
        (item) => item.application === application
      ) ??
      (application === 'geminitestapp' &&
      (lastSync.applicationTransfers ?? []).length === 0 &&
      lastSync.verification !== null &&
      lastSync.verification !== undefined
        ? {
            application,
            sourceDbName: lastSync.verification.sourceDbName,
            targetDbName: lastSync.verification.targetDbName,
            archivePath: lastSync.archivePath ?? '',
            logPath: lastSync.logPath ?? '',
            verification: lastSync.verification,
          }
        : null);
    const backups = lastSync.preSyncBackups.filter(
      (backup) => getBackupApplication(backup) === application
    );

    return {
      application,
      label,
      transfer,
      sourceBackup: backups.find((backup) => backup.role === 'source') ?? null,
      targetBackup: backups.find((backup) => backup.role === 'target') ?? null,
      backupCount: backups.length,
    };
  });

export function MongoSourceEntryCard({
  entry,
}: {
  entry: DatabaseEngineMongoSourceEntry;
}): JSX.Element {
  const viewModel = resolveMongoSourceEntryViewModel(entry);

  return (
    <Card variant='subtle' padding='md' className='space-y-3 border-white/10'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-1'>
          <h3 className='text-sm font-semibold text-white'>{SOURCE_LABELS[entry.source]}</h3>
          {viewModel.dbName !== null ? (
            <p className='text-[11px] uppercase tracking-wide text-gray-400'>{viewModel.dbName}</p>
          ) : null}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {viewModel.showActiveBadge ? (
            <StatusBadge status='Active' variant='active' size='sm' />
          ) : null}
          {viewModel.showUnreachableBadge ? (
            <StatusBadge status='Unreachable' variant='error' size='sm' />
          ) : null}
        </div>
      </div>

      <div className='space-y-2 text-xs leading-relaxed text-gray-300'>
        <p>{viewModel.maskedUri}</p>
        <p>Connection: {viewModel.connectionLabel}</p>
        {viewModel.healthError !== null ? <p>Connection error: {viewModel.healthError}</p> : null}
        {viewModel.activationHint !== null ? <p>{viewModel.activationHint}</p> : null}
      </div>
    </Card>
  );
}

export function MongoSourceOverviewCards({
  mongoSourceState,
}: {
  mongoSourceState: DatabaseEngineMongoSourceState;
}): JSX.Element {
  const viewModel = resolveMongoSourceOverviewModel(mongoSourceState);

  return (
    <div className='grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]'>
      <Card variant='subtle' padding='md' className='space-y-3 border-white/10'>
        <h3 className='text-sm font-semibold text-white'>Current Database</h3>
        <div className='space-y-2 text-xs leading-relaxed text-gray-300'>
          <p>{viewModel.activeLabel}</p>
          {viewModel.activeDbName !== null ? <p>{viewModel.activeDbName}</p> : null}
          <p>Controlled by effective env: MONGODB_ACTIVE_SOURCE_DEFAULT</p>
          <p>Restart required after env file changes</p>
          <p>In dev: `.env.local` overrides `.env`</p>
        </div>
      </Card>

      <Card variant='subtle' padding='md' className='space-y-3 border-white/10'>
        <h3 className='text-sm font-semibold text-white'>Effective Env Example</h3>
        <p className='text-xs leading-relaxed text-gray-300'>
          Keep both targets in the effective env files. In Next.js development, `.env.local`
          overrides `.env`. Change only `MONGODB_ACTIVE_SOURCE_DEFAULT` in the winning file, then
          restart.
        </p>
        <pre className='overflow-x-auto rounded-md border border-white/10 bg-black/30 p-3 text-[11px] leading-relaxed text-gray-200'>
{`MONGODB_LOCAL_URI=${viewModel.localUri}
MONGODB_CLOUD_URI=${viewModel.cloudUri}
MONGODB_ACTIVE_SOURCE_DEFAULT=${viewModel.envSelectedSource}
# To switch:
MONGODB_ACTIVE_SOURCE_DEFAULT=${viewModel.envSwitchTarget}`}
        </pre>
        <p className='text-xs leading-relaxed text-gray-300'>
          {`To switch, add or update MONGODB_ACTIVE_SOURCE_DEFAULT=${viewModel.envSwitchTarget} in the effective env file (.env.local overrides .env in development) and restart the server.`}
        </p>
      </Card>
    </div>
  );
}

export function MongoLastTransferCard({
  lastSync,
}: {
  lastSync: DatabaseEngineMongoLastSync | null;
}): JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='space-y-3 border-white/10'>
      <h3 className='text-sm font-semibold text-white'>Latest Transfer</h3>

      {lastSync === null ? (
        <div className='space-y-2 text-xs leading-relaxed text-gray-300'>
          <p>No sync recorded yet</p>
          <p>
            Run a cloud/local sync to create pre-sync backups for each application database and
            persist the latest transfer archive and log reference here.
          </p>
        </div>
      ) : (
        <div className='space-y-2 text-xs leading-relaxed text-gray-300'>
          {resolveLastTransferMetrics(lastSync).map((metric) => (
            <p key={metric}>{metric}</p>
          ))}
          <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-4'>
            {buildMongoApplicationTransferSummaries(lastSync).map((summary) => (
              <div
                key={summary.application}
                className='space-y-2 rounded-md border border-white/10 bg-black/20 p-3'
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0 space-y-1'>
                    <p className='truncate text-sm font-semibold text-white'>{summary.label}</p>
                    <p className='text-[11px] uppercase text-gray-500'>
                      {summary.application}
                    </p>
                  </div>
                  <StatusBadge
                    status={
                      summary.transfer?.verification.status === 'passed'
                        ? 'Verified'
                        : summary.transfer === null
                          ? 'No Transfer'
                          : 'Mismatch'
                    }
                    variant={
                      summary.transfer?.verification.status === 'passed'
                        ? 'active'
                        : summary.transfer === null
                          ? 'pending'
                          : 'error'
                    }
                    size='sm'
                  />
                </div>

                {summary.transfer === null ? (
                  <p className='text-xs text-gray-400'>No transfer recorded for this database.</p>
                ) : (
                  <div className='space-y-1 text-xs text-gray-300'>
                    <p>
                      {summary.transfer.sourceDbName} -&gt; {summary.transfer.targetDbName}
                    </p>
                    <p>
                      Collections compared:{' '}
                      {summary.transfer.verification.collectionsCompared.toLocaleString()}
                    </p>
                    <p
                      className='truncate font-mono text-gray-500'
                      title={summary.transfer.archivePath}
                    >
                      {summary.transfer.archivePath || 'No archive path'}
                    </p>
                    <p
                      className='truncate font-mono text-gray-500'
                      title={summary.transfer.logPath}
                    >
                      {summary.transfer.logPath || 'No log path'}
                    </p>
                  </div>
                )}

                <div className='space-y-1 border-t border-white/10 pt-2 text-xs text-gray-400'>
                  <p>Pre-sync backups: {summary.backupCount.toLocaleString()}</p>
                  <p
                    className='truncate font-mono'
                    title={summary.sourceBackup?.backupName ?? ''}
                  >
                    Source: {summary.sourceBackup?.backupName ?? 'n/a'}
                  </p>
                  <p
                    className='truncate font-mono'
                    title={summary.targetBackup?.backupName ?? ''}
                  >
                    Target: {summary.targetBackup?.backupName ?? 'n/a'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {(lastSync.applicationTransfers ?? []).map((transfer) => (
            <div key={`${transfer.application}-${transfer.archivePath}`} className='space-y-1'>
              <p>{`Application transfer (${transfer.application}): ${transfer.sourceDbName} -> ${transfer.targetDbName}`}</p>
              <p>{`Transfer archive: ${transfer.archivePath}`}</p>
              <p>{`Transfer log: ${transfer.logPath}`}</p>
              <p>{`Verification: ${transfer.verification.status} at ${transfer.verification.verifiedAt}`}</p>
            </div>
          ))}
          {lastSync.preSyncBackups.map((backup) => (
            <div key={`${backup.role}-${backup.source}-${backup.backupName}`} className='space-y-1'>
              <p>
                {`${backup.role === 'source' ? 'Source' : 'Target'} backup (${backup.application ?? 'geminitestapp'} ${backup.source}): ${backup.backupName}`}
              </p>
              <p>{`Backup file: ${backup.backupPath}`}</p>
              <p>{`Backup log: ${backup.logPath}`}</p>
              {backup.warning !== null && backup.warning !== '' ? (
                <p>{`Backup warning: ${backup.warning}`}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
