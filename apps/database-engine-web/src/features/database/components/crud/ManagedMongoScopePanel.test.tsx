// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoDatabase,
  DatabaseEngineManagedMongoEndpoint,
  DatabaseEngineManagedMongoState,
  MongoSource,
} from '@/shared/contracts/database';

import { buildManagedMongoCrudHref, ManagedMongoScopePanel } from './ManagedMongoScopePanel';

const mocks = vi.hoisted(() => ({
  actions: {
    backupManagedMongo: vi.fn(),
    refetchAll: vi.fn(),
    syncManagedMongo: vi.fn(),
  },
  state: {
    isBackingUpManagedMongo: false,
    isSyncingManagedMongo: false,
    operationControls: {
      allowManualBackupRunNow: true,
      allowManualFullSync: true,
    },
    managedMongoDatabases: undefined as DatabaseEngineManagedMongoState | undefined,
  },
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
  Button: ({
    asChild,
    children,
    disabled,
    onClick,
    type,
  }: {
    asChild?: boolean;
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <button disabled={disabled} type={type ?? 'button'} onClick={onClick}>
        {children}
      </button>
    ),
}));

vi.mock('../../context/DatabaseEngineContext', () => ({
  useDatabaseEngineActionsContext: () => mocks.actions,
  useDatabaseEngineStateContext: () => mocks.state,
}));

const buildEndpoint = (
  source: MongoSource,
  dbName: string,
  overrides: Partial<DatabaseEngineManagedMongoEndpoint> = {}
): DatabaseEngineManagedMongoEndpoint => ({
  source,
  configured: true,
  dbName,
  maskedUri: `mongodb://example/${dbName}`,
  usesLegacyEnv: false,
  reachable: true,
  healthError: null,
  databaseSizeBytes: 4096,
  storageSizeBytes: 2048,
  dataSizeBytes: 1024,
  indexSizeBytes: 512,
  collectionsSizeBytes: 1536,
  collectionCount: 2,
  collections: [],
  ...overrides,
});

const buildDatabase = (
  application: DatabaseEngineManagedMongoApplication,
  label: string,
  overrides: Partial<DatabaseEngineManagedMongoDatabase> = {}
): DatabaseEngineManagedMongoDatabase => ({
  application,
  label,
  canBackupLocal: true,
  canPushToCloud: true,
  canPullFromCloud: true,
  syncIssue: null,
  local: buildEndpoint('local', `${application}_local`),
  cloud: buildEndpoint('cloud', `${application}_cloud`),
  ...overrides,
});

const buildManagedMongoState = (
  overrides: Partial<DatabaseEngineManagedMongoState> = {}
): DatabaseEngineManagedMongoState => ({
  timestamp: '2026-05-08T12:00:00.000Z',
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
    buildDatabase('geminitestapp', 'GeminiTest App'),
    buildDatabase('studiq', 'StudiQ'),
    buildDatabase('cms-builder', 'CMS Builder'),
    buildDatabase('products', 'Ecommerce'),
    buildDatabase('arch', 'Milkbar Designers'),
  ],
  ...overrides,
});

describe('ManagedMongoScopePanel', () => {
  beforeEach(() => {
    mocks.state.managedMongoDatabases = buildManagedMongoState();
    mocks.state.operationControls = {
      allowManualBackupRunNow: true,
      allowManualFullSync: true,
    };
    mocks.state.isBackingUpManagedMongo = false;
    mocks.state.isSyncingManagedMongo = false;
    vi.clearAllMocks();
  });

  it('builds scoped Table Manager links for managed Mongo applications', () => {
    expect(buildManagedMongoCrudHref('cms-builder')).toBe(
      '/admin/databases/engine?view=crud&application=cms-builder&source=local'
    );
    expect(buildManagedMongoCrudHref('products', 'cloud')).toBe(
      '/admin/databases/engine?view=crud&application=products&source=cloud'
    );
  });

  it('renders all managed files and runs group and per-application actions', () => {
    render(<ManagedMongoScopePanel activeApplication='geminitestapp' activeSource='local' />);

    expect(screen.getByRole('heading', { name: 'Managed MongoDB Files' })).toBeInTheDocument();
    expect(screen.getByText('Backup root: /tmp/database/mongo-backups')).toBeInTheDocument();
    expect(screen.getByText('GeminiTest App')).toBeInTheDocument();
    expect(screen.getByText('StudiQ')).toBeInTheDocument();
    expect(screen.getByText('CMS Builder')).toBeInTheDocument();
    expect(screen.getByText('Ecommerce')).toBeInTheDocument();
    expect(screen.getByText('Milkbar Designers')).toBeInTheDocument();

    const localLinks = screen.getAllByRole('link', { name: 'Local Tables' });
    const cloudLinks = screen.getAllByRole('link', { name: 'Cloud Tables' });
    expect(localLinks).toHaveLength(5);
    expect(cloudLinks).toHaveLength(5);
    expect(localLinks[2]).toHaveAttribute(
      'href',
      '/admin/databases/engine?view=crud&application=cms-builder&source=local'
    );
    expect(cloudLinks[2]).toHaveAttribute(
      'href',
      '/admin/databases/engine?view=crud&application=cms-builder&source=cloud'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Backup All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Push All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pull All' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Backup' })[1]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Push' })[1]!);
    fireEvent.click(screen.getAllByRole('button', { name: 'Pull' })[1]!);

    expect(mocks.actions.refetchAll).toHaveBeenCalledTimes(1);
    expect(mocks.actions.backupManagedMongo).toHaveBeenNthCalledWith(1, 'all');
    expect(mocks.actions.backupManagedMongo).toHaveBeenNthCalledWith(2, 'studiq');
    expect(mocks.actions.syncManagedMongo).toHaveBeenNthCalledWith(1, 'local_to_cloud', 'all');
    expect(mocks.actions.syncManagedMongo).toHaveBeenNthCalledWith(2, 'cloud_to_local', 'all');
    expect(mocks.actions.syncManagedMongo).toHaveBeenNthCalledWith(3, 'local_to_cloud', 'studiq');
    expect(mocks.actions.syncManagedMongo).toHaveBeenNthCalledWith(4, 'cloud_to_local', 'studiq');
  });

  it('keeps per-application sync available when only group push is blocked', () => {
    mocks.state.managedMongoDatabases = buildManagedMongoState({
      canPushAllToCloud: false,
      databases: [
        buildDatabase('geminitestapp', 'GeminiTest App'),
        buildDatabase('studiq', 'StudiQ', { canPushToCloud: false }),
        buildDatabase('cms-builder', 'CMS Builder'),
        buildDatabase('products', 'Ecommerce'),
        buildDatabase('arch', 'Milkbar Designers'),
      ],
    });

    render(<ManagedMongoScopePanel activeApplication='geminitestapp' activeSource='local' />);

    expect(screen.getByRole('button', { name: 'Push All' })).toBeDisabled();

    const pushButtons = screen.getAllByRole('button', { name: 'Push' });
    expect(pushButtons[0]).not.toBeDisabled();
    expect(pushButtons[1]).toBeDisabled();

    fireEvent.click(pushButtons[0]!);

    expect(mocks.actions.syncManagedMongo).toHaveBeenCalledWith(
      'local_to_cloud',
      'geminitestapp'
    );
  });
});
