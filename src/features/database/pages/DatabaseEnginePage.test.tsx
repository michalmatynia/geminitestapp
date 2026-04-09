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
        archivePath: '/tmp/mongo-sync.archive',
        logPath: '/tmp/mongo-sync.log',
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
  },
  actions: {
    updatePolicy: vi.fn(),
    updateCollectionRoute: vi.fn(),
    updateOperationControls: vi.fn(),
    syncMongoSources: vi.fn(),
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
      archivePath: '/tmp/mongo-sync.archive',
      logPath: '/tmp/mongo-sync.log',
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
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
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
    mocks.actions.updateCollectionRoute.mockReset();
    mocks.actions.updateOperationControls.mockReset();
    mocks.actions.syncMongoSources.mockReset();
    mocks.actions.setActiveView.mockReset();
    mocks.actions.saveSettings.mockReset();
    mocks.actions.refetchAll.mockReset();
  });

  it('renders Mongo source details and explains env-managed switching', () => {
    render(<DatabaseEnginePage />);

    expect(screen.getByRole('heading', { name: 'Mongo Source' })).toBeInTheDocument();
    expect(screen.getByText('Current Database')).toBeInTheDocument();
    expect(screen.getByText('Local Database')).toBeInTheDocument();
    expect(screen.getByText('.env Example')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Keep both targets in `.env`, then change only `MONGODB_ACTIVE_SOURCE_DEFAULT` and restart.'
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
        'To switch, add or update MONGODB_ACTIVE_SOURCE_DEFAULT=cloud in .env and restart the server.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Controlled by `.env`: MONGODB_ACTIVE_SOURCE_DEFAULT')
    ).toBeInTheDocument();
    expect(screen.getByText('Restart required after `.env` changes')).toBeInTheDocument();
    expect(screen.getByText('Synced at: 2026-04-09T04:30:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('Direction: cloud_to_local')).toBeInTheDocument();
    expect(screen.getByText('Archive: /tmp/mongo-sync.archive')).toBeInTheDocument();
    expect(screen.getByText('Log: /tmp/mongo-sync.log')).toBeInTheDocument();
    expect(screen.getAllByText('Connection: Reachable')).toHaveLength(2);
    expect(screen.getByText('mongodb://localhost:27017/app_local')).toBeInTheDocument();
    expect(screen.getByText('mongodb+srv://cluster.example/app_cloud')).toBeInTheDocument();
    expect(
      screen.getByText(
        'To activate this target, add or update MONGODB_ACTIVE_SOURCE_DEFAULT=cloud in .env and restart the server.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Switch to cloud' })).not.toBeInTheDocument();
  });

  it('runs manual Mongo sync actions from the header controls', () => {
    render(<DatabaseEnginePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Pull Cloud -> Local' }));
    fireEvent.click(screen.getByRole('button', { name: 'Push Local -> Cloud' }));

    expect(mocks.actions.syncMongoSources).toHaveBeenNthCalledWith(1, 'cloud_to_local');
    expect(mocks.actions.syncMongoSources).toHaveBeenNthCalledWith(2, 'local_to_cloud');
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
        'Configure both local and cloud URIs and set MONGODB_ACTIVE_SOURCE_DEFAULT in `.env` to use dual-source mode.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pull Cloud -> Local' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Push Local -> Cloud' })).not.toBeInTheDocument();
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
      screen.getByText('Run a cloud/local sync to persist the latest archive and log reference here.')
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
    expect(screen.queryByRole('button', { name: 'Pull Cloud -> Local' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Push Local -> Cloud' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Pull Cloud -> Local' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Push Local -> Cloud' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Pull Cloud -> Local' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Push Local -> Cloud' })).not.toBeInTheDocument();
  });
});
