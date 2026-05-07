// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseEnginePage } from './DatabaseEnginePage';

const mocks = vi.hoisted(() => ({
  state: {
    activeView: 'engine',
    validationErrors: [],
    isLoading: false,
    isSaving: false,
    policy: {
      requireExplicitServiceRouting: false,
      requireExplicitCollectionRouting: false,
      allowAutomaticFallback: true,
      allowAutomaticBackfill: true,
      allowAutomaticMigrations: true,
      strictProviderAvailability: false,
    },
    operationControls: {
      allowManualFullSync: true,
      allowManualCollectionSync: true,
      allowManualBackfill: true,
      allowManualBackupRunNow: true,
      allowManualBackupMaintenance: true,
      allowBackupSchedulerTick: true,
      allowOperationJobCancellation: true,
    },
    backupSchedule: {
      schedulerEnabled: true,
      repeatTickEnabled: false,
      lastCheckedAt: null,
      mongodb: {
        enabled: true,
        cadence: 'daily',
        intervalDays: 1,
        weekday: 1,
        timeUtc: '02:00',
        lastQueuedAt: null,
        lastRunAt: null,
        lastStatus: 'idle',
        lastJobId: null,
        lastError: null,
        nextDueAt: null,
      },
    },
    collectionRouteMap: {},
    rows: [
      {
        name: 'users',
        existsInMongo: true,
        mongoDocumentCount: 12,
        mongoFieldCount: 4,
        assignedProvider: 'auto',
      },
    ],
    engineStatus: {
      blockingIssues: [],
      providers: {
        mongodbConfigured: true,
        redisConfigured: false,
      },
    },
    mongoSourceState: {
      timestamp: '2026-04-09T04:00:00.000Z',
      activeSource: 'local',
      defaultSource: 'local',
      lastSync: {
        direction: 'cloud_to_local',
        source: 'cloud',
        target: 'local',
        syncedAt: '2026-04-09T04:30:00.000Z',
        preSyncBackups: [
          {
            role: 'source',
            source: 'cloud',
            backupName: 'cloud-source-pre-sync.archive',
            backupPath: '/tmp/backups/cloud-source-pre-sync.archive',
            logPath: '/tmp/backups/cloud-source-pre-sync.archive.log',
            createdAt: '2026-04-09T04:29:00.000Z',
            warning: null,
          },
          {
            role: 'target',
            source: 'local',
            backupName: 'local-target-pre-sync.archive',
            backupPath: '/tmp/backups/local-target-pre-sync.archive',
            logPath: '/tmp/backups/local-target-pre-sync.archive.log',
            createdAt: '2026-04-09T04:29:30.000Z',
            warning: null,
          },
        ],
        archivePath: '/tmp/mongo-sync.archive',
        logPath: '/tmp/mongo-sync.log',
        verification: {
          status: 'passed',
          verifiedAt: '2026-04-09T04:31:00.000Z',
          source: 'cloud',
          target: 'local',
          sourceDbName: 'app_cloud',
          targetDbName: 'app_local',
          sourceCollections: 12,
          targetCollections: 12,
          collectionsCompared: 12,
          mismatches: [],
          collections: [],
        },
      },
      local: {
        source: 'local',
        configured: true,
        dbName: 'app_local',
        maskedUri: 'mongodb://localhost:27017/app_local',
        isActive: true,
        usesLegacyEnv: false,
        reachable: true,
        healthError: null,
      },
      cloud: {
        source: 'cloud',
        configured: true,
        dbName: 'app_cloud',
        maskedUri: 'mongodb+srv://cluster.example/app_cloud',
        isActive: false,
        usesLegacyEnv: false,
        reachable: true,
        healthError: null,
      },
      canSwitch: true,
      canSync: true,
      syncIssue: null,
    },
    operationsJobs: {
      jobs: [
        {
          id: 'job-12345678',
          type: 'sync',
          status: 'completed',
          createdAt: '2026-04-09T04:00:00.000Z',
        },
      ],
    },
    redisOverview: null,
    isSyncingMongoSources: false,
    isBackingUpManagedMongo: false,
    isSyncingManagedMongo: false,
  },
  actions: {
    updatePolicy: vi.fn(),
    updateBackupSchedule: vi.fn(),
    updateCollectionRoute: vi.fn(),
    updateOperationControls: vi.fn(),
    syncMongoSources: vi.fn(),
    backupManagedMongo: vi.fn(),
    syncManagedMongo: vi.fn(),
    setActiveView: vi.fn(),
    saveSettings: vi.fn(),
    refetchAll: vi.fn(),
  },
}));

const createState = () => ({
  activeView: 'engine',
  validationErrors: [],
  isLoading: false,
  isSaving: false,
  policy: {
    requireExplicitServiceRouting: false,
    requireExplicitCollectionRouting: false,
    allowAutomaticFallback: true,
    allowAutomaticBackfill: true,
    allowAutomaticMigrations: true,
    strictProviderAvailability: false,
  },
  operationControls: {
    allowManualFullSync: true,
    allowManualCollectionSync: true,
    allowManualBackfill: true,
    allowManualBackupRunNow: true,
    allowManualBackupMaintenance: true,
    allowBackupSchedulerTick: true,
    allowOperationJobCancellation: true,
  },
  backupSchedule: {
    schedulerEnabled: true,
    repeatTickEnabled: false,
    lastCheckedAt: null,
    mongodb: {
      enabled: true,
      cadence: 'daily' as const,
      intervalDays: 1,
      weekday: 1,
      timeUtc: '02:00',
      lastQueuedAt: null,
      lastRunAt: null,
      lastStatus: 'idle' as const,
      lastJobId: null,
      lastError: null,
      nextDueAt: null,
    },
  },
  collectionRouteMap: {},
  rows: [
    {
      name: 'users',
      existsInMongo: true,
      mongoDocumentCount: 12,
      mongoFieldCount: 4,
      assignedProvider: 'auto' as const,
    },
  ],
  engineStatus: {
    blockingIssues: [],
    providers: {
      mongodbConfigured: true,
      redisConfigured: false,
    },
  },
  mongoSourceState: {
    timestamp: '2026-04-09T04:00:00.000Z',
    activeSource: 'local' as const,
    defaultSource: 'local' as const,
    lastSync: {
      direction: 'cloud_to_local' as const,
      source: 'cloud' as const,
      target: 'local' as const,
      syncedAt: '2026-04-09T04:30:00.000Z',
      preSyncBackups: [
        {
          role: 'source' as const,
          source: 'cloud' as const,
          backupName: 'cloud-source-pre-sync.archive',
          backupPath: '/tmp/backups/cloud-source-pre-sync.archive',
          logPath: '/tmp/backups/cloud-source-pre-sync.archive.log',
          createdAt: '2026-04-09T04:29:00.000Z',
          warning: null,
        },
        {
          role: 'target' as const,
          source: 'local' as const,
          backupName: 'local-target-pre-sync.archive',
          backupPath: '/tmp/backups/local-target-pre-sync.archive',
          logPath: '/tmp/backups/local-target-pre-sync.archive.log',
          createdAt: '2026-04-09T04:29:30.000Z',
          warning: null,
        },
      ],
      archivePath: '/tmp/mongo-sync.archive',
      logPath: '/tmp/mongo-sync.log',
      verification: {
        status: 'passed' as const,
        verifiedAt: '2026-04-09T04:31:00.000Z',
        source: 'cloud' as const,
        target: 'local' as const,
        sourceDbName: 'app_cloud',
        targetDbName: 'app_local',
        sourceCollections: 12,
        targetCollections: 12,
        collectionsCompared: 12,
        mismatches: [],
        collections: [],
      },
    },
    local: {
      source: 'local' as const,
      configured: true,
      dbName: 'app_local',
      maskedUri: 'mongodb://localhost:27017/app_local',
      isActive: true,
      usesLegacyEnv: false,
      reachable: true,
      healthError: null,
    },
    cloud: {
      source: 'cloud' as const,
      configured: true,
      dbName: 'app_cloud',
      maskedUri: 'mongodb+srv://cluster.example/app_cloud',
      isActive: false,
      usesLegacyEnv: false,
      reachable: true,
      healthError: null,
    },
    canSwitch: true,
    canSync: true,
    syncIssue: null,
  },
  operationsJobs: {
    jobs: [
      {
        id: 'job-12345678',
        type: 'sync',
        status: 'completed',
        createdAt: '2026-04-09T04:00:00.000Z',
      },
    ],
  },
  redisOverview: null,
  isSyncingMongoSources: false,
  isBackingUpManagedMongo: false,
  isSyncingManagedMongo: false,
  managedMongoDatabases: {
    timestamp: '2026-04-09T05:00:00.000Z',
    backupRoot: '/tmp/database/mongo-backups',
    backupStorage: {
      root: '/tmp/database/mongo-backups',
      availableBytes: 10 * 1024 * 1024 * 1024,
      requiredFreeBytes: 2 * 1024 * 1024 * 1024,
      canWriteBackups: true,
      statusError: null,
    },
    canBackupAllLocal: true,
    canPushAllToCloud: true,
    canPullAllFromCloud: true,
    issues: [],
    databases: [
      {
        application: 'geminitestapp' as const,
        label: 'GeminiTest App',
        canBackupLocal: true,
        canPushToCloud: true,
        canPullFromCloud: true,
        syncIssue: null,
        local: {
          source: 'local' as const,
          configured: true,
          dbName: 'app_local',
          maskedUri: 'mongodb://localhost:27017/app_local',
          usesLegacyEnv: false,
          reachable: true,
          healthError: null,
          databaseSizeBytes: 4096,
          storageSizeBytes: 2048,
          dataSizeBytes: 1024,
          indexSizeBytes: 256,
          collectionsSizeBytes: 1280,
          collectionCount: 1,
          collections: [
            {
              name: 'users',
              documentCount: 12,
              storageSizeBytes: 1024,
              dataSizeBytes: 768,
              indexSizeBytes: 256,
              totalSizeBytes: 1280,
              statsError: null,
            },
          ],
        },
        cloud: {
          source: 'cloud' as const,
          configured: true,
          dbName: 'app_cloud',
          maskedUri: 'mongodb+srv://cluster.example/app_cloud',
          usesLegacyEnv: false,
          reachable: true,
          healthError: null,
          databaseSizeBytes: 8192,
          storageSizeBytes: 4096,
          dataSizeBytes: 2048,
          indexSizeBytes: 512,
          collectionsSizeBytes: 2560,
          collectionCount: 1,
          collections: [
            {
              name: 'users',
              documentCount: 12,
              storageSizeBytes: 2048,
              dataSizeBytes: 1536,
              indexSizeBytes: 512,
              totalSizeBytes: 2560,
              statsError: null,
            },
          ],
        },
      },
      {
        application: 'studiq' as const,
        label: 'StudiQ',
        canBackupLocal: true,
        canPushToCloud: true,
        canPullFromCloud: true,
        syncIssue: null,
        local: {
          source: 'local' as const,
          configured: true,
          dbName: 'studiq_local',
          maskedUri: 'mongodb://localhost:27018/studiq_local',
          usesLegacyEnv: false,
          reachable: true,
          healthError: null,
          databaseSizeBytes: 2048,
          storageSizeBytes: 1024,
          dataSizeBytes: 512,
          indexSizeBytes: 128,
          collectionsSizeBytes: 640,
          collectionCount: 1,
          collections: [
            {
              name: 'studiq_coll',
              documentCount: 4,
              storageSizeBytes: 512,
              dataSizeBytes: 384,
              indexSizeBytes: 128,
              totalSizeBytes: 640,
              statsError: null,
            },
          ],
        },
        cloud: {
          source: 'cloud' as const,
          configured: true,
          dbName: 'studiq_db',
          maskedUri: 'mongodb+srv://cluster.example/studiq_db',
          usesLegacyEnv: false,
          reachable: true,
          healthError: null,
          databaseSizeBytes: 2048,
          storageSizeBytes: 1024,
          dataSizeBytes: 512,
          indexSizeBytes: 128,
          collectionsSizeBytes: 640,
          collectionCount: 1,
          collections: [
            {
              name: 'studiq_coll',
              documentCount: 4,
              storageSizeBytes: 512,
              dataSizeBytes: 384,
              indexSizeBytes: 128,
              totalSizeBytes: 640,
              statsError: null,
            },
          ],
        },
      },
      {
        application: 'cms-builder' as const,
        label: 'CMS Builder',
        canBackupLocal: true,
        canPushToCloud: true,
        canPullFromCloud: true,
        syncIssue: null,
        local: {
          source: 'local' as const,
          configured: true,
          dbName: 'cms_builder_local',
          maskedUri: 'mongodb://localhost:27019/cms_builder_local',
          usesLegacyEnv: false,
          reachable: true,
          healthError: null,
          databaseSizeBytes: 1024,
          storageSizeBytes: 512,
          dataSizeBytes: 256,
          indexSizeBytes: 64,
          collectionsSizeBytes: 320,
          collectionCount: 1,
          collections: [
            {
              name: 'pages',
              documentCount: 3,
              storageSizeBytes: 256,
              dataSizeBytes: 192,
              indexSizeBytes: 64,
              totalSizeBytes: 320,
              statsError: null,
            },
          ],
        },
        cloud: {
          source: 'cloud' as const,
          configured: true,
          dbName: 'cms_builder_db',
          maskedUri: 'mongodb+srv://cluster.example/cms_builder_db',
          usesLegacyEnv: false,
          reachable: true,
          healthError: null,
          databaseSizeBytes: 1024,
          storageSizeBytes: 512,
          dataSizeBytes: 256,
          indexSizeBytes: 64,
          collectionsSizeBytes: 320,
          collectionCount: 1,
          collections: [
            {
              name: 'pages',
              documentCount: 3,
              storageSizeBytes: 256,
              dataSizeBytes: 192,
              indexSizeBytes: 64,
              totalSizeBytes: 320,
              statsError: null,
            },
          ],
        },
      },
    ],
  },
});

vi.mock('../context/DatabaseEngineContext', () => ({
  DatabaseEngineProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useDatabaseEngineStateContext: () => mocks.state,
  useDatabaseEngineActionsContext: () => mocks.actions,
}));

vi.mock('../components/DatabaseBackupsPanel', () => ({
  DatabaseBackupsPanel: () => <div data-testid='database-backups-panel' />,
}));

vi.mock('../components/DatabaseOperationsPanel', () => ({
  DatabaseOperationsPanel: () => <div data-testid='database-operations-panel' />,
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminDatabasePageLayout: ({
    children,
    headerActions,
    title,
  }: {
    children?: React.ReactNode;
    headerActions?: React.ReactNode;
    title?: string;
  }) => (
    <div>
      <h1>{title}</h1>
      {headerActions}
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    asChild: _asChild,
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    children?: React.ReactNode;
  }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children?: React.ReactNode }) => <button type='button'>{children}</button>,
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  DataTable: () => <div data-testid='data-table' />,
  DocumentationList: ({
    items,
    title,
  }: {
    items?: string[];
    title?: string;
  }) => (
    <div>
      <span>{title}</span>
      {items?.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  ),
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title?: string;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  SelectSimple: ({
    ariaLabel,
    onValueChange,
    options,
    title,
    value,
  }: {
    ariaLabel?: string;
    onValueChange: (value: string) => void;
    options: ReadonlyArray<{ label: string; value: string }>;
    title?: string;
    value: string;
  }) => (
    <select
      aria-label={ariaLabel}
      title={title}
      value={value}
      onChange={(event) => {
        onValueChange(event.target.value);
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  ToggleRow: ({
    checked,
    label,
    onCheckedChange,
  }: {
    checked: boolean;
    label: string;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <label>
      {label}
      <input
        type='checkbox'
        checked={checked}
        onChange={(event) => {
          onCheckedChange(event.target.checked);
        }}
      />
    </label>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  LoadingState: ({ message }: { message?: string }) => <div>{message}</div>,
  MetadataItem: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      {value}
    </div>
  ),
  UI_GRID_RELAXED_CLASSNAME: 'grid-relaxed',
  UI_GRID_ROOMY_CLASSNAME: 'grid-roomy',
}));

vi.mock('@/shared/ui/templates.public', () => ({
  StandardDataTablePanel: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title?: string;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

describe('DatabaseEnginePage', () => {
  beforeEach(() => {
    mocks.state = createState();
    mocks.actions.updatePolicy.mockReset();
    mocks.actions.updateBackupSchedule.mockReset();
    mocks.actions.updateCollectionRoute.mockReset();
    mocks.actions.updateOperationControls.mockReset();
    mocks.actions.syncMongoSources.mockReset();
    mocks.actions.backupManagedMongo.mockReset();
    mocks.actions.syncManagedMongo.mockReset();
    mocks.actions.setActiveView.mockReset();
    mocks.actions.saveSettings.mockReset();
    mocks.actions.refetchAll.mockReset();
    mocks.actions.syncMongoSources.mockResolvedValue(undefined);
    mocks.actions.backupManagedMongo.mockResolvedValue(undefined);
    mocks.actions.syncManagedMongo.mockResolvedValue(undefined);
  });

  it('renders Mongo source details and explains env-managed switching', () => {
    render(<DatabaseEnginePage />);

    expect(screen.getByRole('heading', { name: 'Mongo Source' })).toBeInTheDocument();
    expect(screen.getByText('Current Database')).toBeInTheDocument();
    expect(screen.getByText('Local Database')).toBeInTheDocument();
    expect(screen.getByText('Effective Env Example')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Keep both targets in the effective env files. In Next.js development, `.env.local` overrides `.env`. Change only `MONGODB_ACTIVE_SOURCE_DEFAULT` in the winning file, then restart.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/MONGODB_LOCAL_URI=mongodb:\/\/localhost:27017\/app_local/)).toBeInTheDocument();
    expect(
      screen.getByText(/MONGODB_CLOUD_URI=mongodb\+srv:\/\/cluster\.example\/app_cloud/)
    ).toBeInTheDocument();
    expect(screen.getByText(/MONGODB_ACTIVE_SOURCE_DEFAULT=local/)).toBeInTheDocument();
    expect(screen.getByText(/# To switch:\s*MONGODB_ACTIVE_SOURCE_DEFAULT=cloud/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'To switch, add or update MONGODB_ACTIVE_SOURCE_DEFAULT=cloud in the effective env file (.env.local overrides .env in development) and restart the server.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Controlled by effective env: MONGODB_ACTIVE_SOURCE_DEFAULT')
    ).toBeInTheDocument();
    expect(screen.getByText('Restart required after env file changes')).toBeInTheDocument();
    expect(screen.getByText('In dev: `.env.local` overrides `.env`')).toBeInTheDocument();
    expect(screen.getByText('Synced at: 2026-04-09T04:30:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('Direction: cloud_to_local')).toBeInTheDocument();
    expect(screen.getByText('Transfer archive: /tmp/mongo-sync.archive')).toBeInTheDocument();
    expect(screen.getByText('Transfer log: /tmp/mongo-sync.log')).toBeInTheDocument();
    expect(screen.getByText('Verified exact mirror (12 collections)')).toBeInTheDocument();
    expect(screen.getByText(/Verification: passed at 2026-04-09T04:31:00.000Z/)).toBeInTheDocument();
    expect(screen.getByText('Pre-sync backups: 2')).toBeInTheDocument();
    expect(
      screen.getByText('Source backup (geminitestapp cloud): cloud-source-pre-sync.archive')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Target backup (geminitestapp local): local-target-pre-sync.archive')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Backup file: /tmp/backups/cloud-source-pre-sync.archive')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Backup log: /tmp/backups/local-target-pre-sync.archive.log')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Connection: Reachable')).toHaveLength(2);
    expect(screen.getAllByText('mongodb://localhost:27017/app_local')).toHaveLength(2);
    expect(screen.getAllByText('mongodb+srv://cluster.example/app_cloud')).toHaveLength(2);
    expect(
      screen.getByText(
        'To activate this target, add or update MONGODB_ACTIVE_SOURCE_DEFAULT=cloud in the effective env file (.env.local overrides .env in development) and restart the server.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Switch to cloud' })).not.toBeInTheDocument();
  });

  it('renders a summarized engine status label instead of the raw status object', () => {
    render(<DatabaseEnginePage />);

    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders managed app database sizes and runs per-app and group actions', () => {
    render(<DatabaseEnginePage />);

    expect(screen.getByRole('heading', { name: 'Managed Application Databases' })).toBeInTheDocument();
    expect(screen.getByText('Backup root: /tmp/database/mongo-backups')).toBeInTheDocument();
    expect(screen.getByText(/Backup free: 10.0 GB \/ required 2.00 GB/)).toBeInTheDocument();
    expect(screen.getByText('GeminiTest App')).toBeInTheDocument();
    expect(screen.getByText('StudiQ')).toBeInTheDocument();
    expect(screen.getByText('CMS Builder')).toBeInTheDocument();
    expect(screen.getByText('Database size: 4.00 KB')).toBeInTheDocument();
    expect(screen.getByText('Database size: 8.00 KB')).toBeInTheDocument();
    expect(screen.getAllByText('studiq_coll')).toHaveLength(2);
    expect(screen.getAllByText('pages')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Backup All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Push All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pull All' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Backup' })[1]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Push' })[1]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Pull' })[1]!);

    expect(mocks.actions.backupManagedMongo).toHaveBeenNthCalledWith(1, 'all');
    expect(mocks.actions.syncManagedMongo).toHaveBeenNthCalledWith(1, 'local_to_cloud', 'all');
    expect(mocks.actions.syncManagedMongo).toHaveBeenNthCalledWith(2, 'cloud_to_local', 'all');
    expect(mocks.actions.backupManagedMongo).toHaveBeenNthCalledWith(2, 'studiq');
    expect(mocks.actions.syncManagedMongo).toHaveBeenNthCalledWith(3, 'local_to_cloud', 'studiq');
    expect(mocks.actions.syncManagedMongo).toHaveBeenNthCalledWith(4, 'cloud_to_local', 'studiq');
  });

  it('disables managed backup actions when backup storage is below the free-space threshold', () => {
    mocks.state = {
      ...mocks.state,
      managedMongoDatabases: {
        ...mocks.state.managedMongoDatabases!,
        backupStorage: {
          root: '/tmp/database/mongo-backups',
          availableBytes: 512 * 1024 * 1024,
          requiredFreeBytes: 2 * 1024 * 1024 * 1024,
          canWriteBackups: false,
          statusError: null,
        },
        canBackupAllLocal: false,
        issues: [
          'Backup storage: 512.0 MiB free at /tmp/database/mongo-backups; at least 2.0 GiB required.',
        ],
      },
    };

    render(<DatabaseEnginePage />);

    expect(screen.getByText(/Backup free: 512.0 MB \/ required 2.00 GB/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Backup storage: 512.0 MiB free at /tmp/database/mongo-backups; at least 2.0 GiB required.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Backup All' })).toBeDisabled();
    screen.getAllByRole('button', { name: 'Backup' }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('surfaces blocking issue counts in the engine status badge', () => {
    mocks.state = {
      ...mocks.state,
      engineStatus: {
        ...mocks.state.engineStatus,
        blockingIssues: ['MongoDB source is unavailable.'],
      },
    };

    render(<DatabaseEnginePage />);

    expect(screen.getByText('1 Blocking Issue')).toBeInTheDocument();
  });

  it('runs manual Mongo sync actions from the header controls', () => {
    render(<DatabaseEnginePage />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Pull Cloud -> Local (backup all apps first)' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Push Local -> Cloud (backup all apps first)' })
    );

    expect(mocks.actions.syncMongoSources).toHaveBeenNthCalledWith(1, 'cloud_to_local');
    expect(mocks.actions.syncMongoSources).toHaveBeenNthCalledWith(2, 'local_to_cloud');
  });

  it('shows server-side sync progress and disables sync controls while the lock is active', () => {
    mocks.state = {
      ...mocks.state,
      mongoSourceState: {
        ...mocks.state.mongoSourceState,
        syncInProgress: {
          direction: 'local_to_cloud',
          source: 'local',
          target: 'cloud',
          acquiredAt: '2026-04-16T00:38:12.443Z',
          pid: 28245,
        },
      },
    };

    render(<DatabaseEnginePage />);

    expect(
      screen.getByText(
        'Sync in progress: local -> cloud since 2026-04-16T00:38:12.443Z'
      )
    ).toBeInTheDocument();

    const syncButtons = screen.getAllByRole('button', { name: 'Syncing...' });
    expect(syncButtons).toHaveLength(2);
    syncButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('updates manual operation controls from the engine page', () => {
    render(<DatabaseEnginePage />);

    fireEvent.click(screen.getByLabelText('Manual Full Sync'));

    expect(mocks.actions.updateOperationControls).toHaveBeenCalledWith({
      allowManualFullSync: false,
    });
  });

  it('shows the setup hint instead of sync buttons when one source is missing', () => {
    mocks.state = {
      ...mocks.state,
      mongoSourceState: {
        ...mocks.state.mongoSourceState,
        cloud: {
          ...mocks.state.mongoSourceState.cloud,
          configured: false,
          maskedUri: null,
        },
        canSwitch: false,
        canSync: false,
      },
    };

    render(<DatabaseEnginePage />);

    expect(
      screen.getByText(
        'Configure both local and cloud URIs in the effective env and set MONGODB_ACTIVE_SOURCE_DEFAULT in the winning file to use dual-source mode.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Pull Cloud -> Local (backup all apps first)' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Push Local -> Cloud (backup all apps first)' })
    ).not.toBeInTheDocument();
  });

  it('shows an empty last-sync state when no sync has been recorded', () => {
    mocks.state = {
      ...mocks.state,
      mongoSourceState: {
        ...mocks.state.mongoSourceState,
        lastSync: null,
      },
    };

    render(<DatabaseEnginePage />);

    expect(screen.getByText('No sync recorded yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Run a cloud/local sync to create pre-sync backups for each application database and persist the latest transfer archive and log reference here.'
      )
    ).toBeInTheDocument();
  });

  it('hides sync actions when manual full sync is disabled', () => {
    mocks.state = {
      ...mocks.state,
      operationControls: {
        ...mocks.state.operationControls,
        allowManualFullSync: false,
      },
    };

    render(<DatabaseEnginePage />);

    expect(
      screen.getByText('Manual full sync is disabled by Database Engine controls.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Pull Cloud -> Local (backup all apps first)' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Push Local -> Cloud (backup all apps first)' })
    ).not.toBeInTheDocument();
  });

  it('hides sync actions and explains why when local and cloud point to the same target', () => {
    mocks.state = {
      ...mocks.state,
      mongoSourceState: {
        ...mocks.state.mongoSourceState,
        canSync: false,
        syncIssue:
          'MongoDB source sync is disabled because "local" and "cloud" point to the same URI and database.',
      },
    };

    render(<DatabaseEnginePage />);

    expect(
      screen.getByText(
        'MongoDB source sync is disabled because "local" and "cloud" point to the same URI and database.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Pull Cloud -> Local (backup all apps first)' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Push Local -> Cloud (backup all apps first)' })
    ).not.toBeInTheDocument();
  });

  it('shows connection errors for unreachable Mongo targets', () => {
    mocks.state = {
      ...mocks.state,
      mongoSourceState: {
        ...mocks.state.mongoSourceState,
        canSync: false,
        syncIssue:
          'MongoDB source sync is disabled because "cloud" is unreachable: cloud ping failed',
        cloud: {
          ...mocks.state.mongoSourceState.cloud,
          reachable: false,
          healthError: 'cloud ping failed',
        },
      },
    };

    render(<DatabaseEnginePage />);

    expect(screen.getByText('Connection error: cloud ping failed')).toBeInTheDocument();
    expect(screen.getByText('Unreachable')).toBeInTheDocument();
    expect(
      screen.getByText(
        'MongoDB source sync is disabled because "cloud" is unreachable: cloud ping failed'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Pull Cloud -> Local (backup all apps first)' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Push Local -> Cloud (backup all apps first)' })
    ).not.toBeInTheDocument();
  });
});
