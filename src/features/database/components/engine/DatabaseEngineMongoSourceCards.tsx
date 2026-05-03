'use client';

import type {
  DatabaseEngineMongoLastSync,
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

  metrics.push(`Pre-sync backups: ${lastSync.preSyncBackups.length}`);

  return metrics;
};

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
            Run a cloud/local sync to create two pre-sync backups and persist the latest transfer
            archive and log reference here.
          </p>
        </div>
      ) : (
        <div className='space-y-2 text-xs leading-relaxed text-gray-300'>
          {resolveLastTransferMetrics(lastSync).map((metric) => (
            <p key={metric}>{metric}</p>
          ))}
          {lastSync.preSyncBackups.map((backup) => (
            <div key={`${backup.role}-${backup.source}-${backup.backupName}`} className='space-y-1'>
              <p>
                {`${backup.role === 'source' ? 'Source' : 'Target'} backup (${backup.source}): ${backup.backupName}`}
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
