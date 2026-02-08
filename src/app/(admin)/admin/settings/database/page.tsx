'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, ChangeEvent } from 'react';

import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import { PRODUCT_DB_PROVIDER_SETTING_KEY } from '@/features/products/constants';
import type {
  AppProviderValueDto as ProviderValueStatus,
  AppProviderServiceDto as ProviderService,
  AppProviderServiceStatusDto as ProviderServiceStatus,
  AppProviderDiagnosticsDto as ProviderDiagnosticsResponse,
} from '@/shared/dtos/system';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast, Button, Label } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const providerOptions = [
  {
    value: 'prisma',
    label: 'PostgreSQL (Prisma)',
    description: 'Use Prisma-backed Postgres for all app data.',
  },
  {
    value: 'mongodb',
    label: 'MongoDB',
    description: 'Use MongoDB for all app data.',
  },
] as const;

type ProviderValue = (typeof providerOptions)[number]['value'];

const authProviderOptions = [
  {
    value: 'mongodb',
    label: 'MongoDB',
    description: 'Use MongoDB for users, sessions, accounts, and auth security.',
  },
  {
    value: 'prisma',
    label: 'PostgreSQL (Prisma)',
    description: 'Use Prisma-backed Postgres for users, sessions, and auth security.',
  },
] as const;

type AuthProviderValue = (typeof authProviderOptions)[number]['value'];

const productProviderOptions = [
  {
    value: 'mongodb',
    label: 'MongoDB',
    description: 'Use MongoDB for products, catalogs, categories, tags, and listings.',
  },
  {
    value: 'prisma',
    label: 'PostgreSQL (Prisma)',
    description: 'Use Prisma-backed Postgres for products and related entities.',
  },
] as const;

type ProductProviderValue = (typeof productProviderOptions)[number]['value'];

type SettingsBackfillResult = {
  matched: number;
  modified: number;
  remaining: number;
  sampleIds?: string[];
};

const providerServiceLabel: Record<ProviderService, string> = {
  app: 'App',
  auth: 'Auth',
  product: 'Product',
  integrations: 'Integrations',
  cms: 'CMS',
};

const formatProvider = (value: ProviderValueStatus | null): string =>
  value ? value.toUpperCase() : 'N/A';

export default function DatabaseSettingsPage() {
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return <div className='p-10 text-center text-gray-400'>Loading settings...</div>;
  }

  const initialProvider: ProviderValue =
    settingsQuery.data.get('app_db_provider') === 'mongodb' ? 'mongodb' : 'prisma';
  const initialAuthProvider: AuthProviderValue =
    settingsQuery.data.get(AUTH_SETTINGS_KEYS.provider) === 'prisma' ? 'prisma' : 'mongodb';
  const initialProductProvider: ProductProviderValue =
    settingsQuery.data.get(PRODUCT_DB_PROVIDER_SETTING_KEY) === 'prisma' ? 'prisma' : 'mongodb';

  return (
    <DatabaseSettingsForm
      initialProvider={initialProvider}
      initialAuthProvider={initialAuthProvider}
      initialProductProvider={initialProductProvider}
    />
  );
}

function DatabaseSettingsForm({
  initialProvider,
  initialAuthProvider,
  initialProductProvider,
}: {
  initialProvider: ProviderValue;
  initialAuthProvider: AuthProviderValue;
  initialProductProvider: ProductProviderValue;
}) {
  const { toast } = useToast();
  const [provider, setProvider] = useState<ProviderValue>(initialProvider);
  const [dirty, setDirty] = useState(false);
  const [authProvider, setAuthProvider] = useState<AuthProviderValue>(initialAuthProvider);
  const [authDirty, setAuthDirty] = useState(false);
  const [productProvider, setProductProvider] = useState<ProductProviderValue>(initialProductProvider);
  const [productDirty, setProductDirty] = useState(false);
  const [syncing, setSyncing] = useState<'mongo_to_prisma' | 'prisma_to_mongo' | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillLimit, setBackfillLimit] = useState(500);
  const [backfillResult, setBackfillResult] = useState<SettingsBackfillResult | null>(null);
  const updateSetting = useUpdateSetting();
  const settingsQuery = useSettingsMap();
  const providerDiagnosticsQuery = useQuery<ProviderDiagnosticsResponse, Error>({
    queryKey: ['settings', 'provider-diagnostics'],
    queryFn: async (): Promise<ProviderDiagnosticsResponse> => {
      const res = await fetch('/api/settings/providers', { cache: 'no-store' });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Failed to fetch provider diagnostics.');
      }
      return (await res.json()) as ProviderDiagnosticsResponse;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const refreshProviderDiagnostics = (): void => {
    void providerDiagnosticsQuery.refetch();
  };

  const providerDescription = useMemo(
    () =>
      providerOptions.find((option: (typeof providerOptions)[number]) => option.value === provider)?.description ??
      '',
    [provider]
  );

  const authProviderDescription = useMemo(
    () =>
      authProviderOptions.find((option: (typeof authProviderOptions)[number]) => option.value === authProvider)
        ?.description ?? '',
    [authProvider]
  );

  const productProviderDescription = useMemo(
    () =>
      productProviderOptions.find((option: (typeof productProviderOptions)[number]) => option.value === productProvider)
        ?.description ?? '',
    [productProvider]
  );

  const saveProvider = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: 'app_db_provider',
        value: provider,
      });
      setDirty(false);
      refreshProviderDiagnostics();
      toast('Database provider saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'DatabaseSettingsPage', action: 'saveProvider', provider } });
      toast(
        error instanceof Error ? error.message : 'Failed to save settings.',
        { variant: 'error' }
      );
    }
  };

  const saveAuthProvider = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: AUTH_SETTINGS_KEYS.provider,
        value: authProvider,
      });
      setAuthDirty(false);
      refreshProviderDiagnostics();
      toast('Auth data provider saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'DatabaseSettingsPage', action: 'saveAuthProvider', authProvider } });
      toast(
        error instanceof Error ? error.message : 'Failed to save settings.',
        { variant: 'error' }
      );
    }
  };

  const saveProductProvider = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: PRODUCT_DB_PROVIDER_SETTING_KEY,
        value: productProvider,
      });
      setProductDirty(false);
      refreshProviderDiagnostics();
      toast('Product data provider saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'DatabaseSettingsPage', action: 'saveProductProvider', productProvider } });
      toast(
        error instanceof Error ? error.message : 'Failed to save settings.',
        { variant: 'error' }
      );
    }
  };

  const runSync = async (direction: 'mongo_to_prisma' | 'prisma_to_mongo'): Promise<void> => {
    const label = direction === 'mongo_to_prisma' ? 'MongoDB → Prisma' : 'Prisma → MongoDB';
    const confirmed = window.confirm(
      `Run full database sync (${label})?\n\nThis will overwrite the target database and create backups first.`
    );
    if (!confirmed) return;

    setSyncing(direction);
    try {
      const res = await fetch('/api/settings/database/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload?.error || 'Failed to enqueue database sync.');
      }
      refreshProviderDiagnostics();
      toast('Database sync job queued. Track progress in Job Queue.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'DatabaseSettingsPage', action: 'runSync', direction } });
      toast(
        error instanceof Error ? error.message : 'Failed to start database sync.',
        { variant: 'error' }
      );
    } finally {
      setSyncing(null);
    }
  };

  const runSettingsBackfill = async (dryRun: boolean): Promise<void> => {
    setBackfillLoading(true);
    try {
      const res = await fetch('/api/settings/migrate/backfill-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, limit: backfillLimit }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Failed to backfill settings keys.');
      }
      const payload = (await res.json()) as SettingsBackfillResult;
      setBackfillResult(payload);
      refreshProviderDiagnostics();
      toast(
        dryRun ? 'Backfill dry run complete.' : 'Backfill completed.',
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error, { context: { source: 'DatabaseSettingsPage', action: 'runSettingsBackfill', dryRun } });
      toast(
        error instanceof Error ? error.message : 'Failed to run backfill.',
        { variant: 'error' }
      );
    } finally {
      setBackfillLoading(false);
    }
  };

  const providerDiagnostics = providerDiagnosticsQuery.data;
  const hasProviderDrift = (providerDiagnostics?.driftCount ?? 0) > 0;
  const providerPanelTone = hasProviderDrift
    ? 'border-red-500/40 bg-red-500/10'
    : 'border-emerald-500/40 bg-emerald-500/10';
  const providerStateTone = hasProviderDrift
    ? 'text-red-100'
    : 'text-emerald-100';

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white'>Database Provider</h1>
        <p className='mt-2 text-sm text-gray-400'>
          Choose the single database provider for the entire application.
        </p>
      </div>

      <div className='rounded-lg border border-gray-800 bg-gray-950 p-6'>
        <div className={`rounded-md border p-4 ${providerPanelTone}`}>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h2 className={`text-lg font-semibold ${providerStateTone}`}>Provider Drift Monitor</h2>
              <p className='mt-1 text-xs text-gray-200/90'>
                Live effective provider routing across key services.
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              onClick={refreshProviderDiagnostics}
              disabled={providerDiagnosticsQuery.isFetching}
              className='border-gray-700 text-gray-200 hover:bg-gray-900'
            >
              {providerDiagnosticsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {providerDiagnosticsQuery.isLoading && (
            <p className='mt-3 text-xs text-gray-300'>Loading provider diagnostics...</p>
          )}

          {providerDiagnosticsQuery.isError && (
            <p className='mt-3 text-xs text-red-200'>
              {providerDiagnosticsQuery.error?.message || 'Failed to load provider diagnostics.'}
            </p>
          )}

          {providerDiagnostics && (
            <>
              <div className='mt-3 grid gap-2'>
                {providerDiagnostics.services.map((service: ProviderServiceStatus) => (
                  <div
                    key={service.service}
                    className='flex flex-wrap items-center justify-between gap-3 rounded border border-gray-800/80 bg-black/25 px-3 py-2'
                  >
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-medium text-gray-100'>
                        {providerServiceLabel[service.service]}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                          service.driftFromApp
                            ? 'border border-red-500/50 bg-red-500/20 text-red-100'
                            : 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-100'
                        }`}
                      >
                        {service.driftFromApp ? 'Drift' : 'Aligned'}
                      </span>
                    </div>
                    <div className='text-[11px] text-gray-300'>
                      Configured {formatProvider(service.configured)}
                      {service.configuredSource ? ` (${service.configuredSource})` : ''}
                      {' -> Effective '}
                      {formatProvider(service.effective)}
                    </div>
                  </div>
                ))}
              </div>

              <div className='mt-3 text-[11px] text-gray-300'>
                Env: DATABASE_URL {providerDiagnostics.env.hasDatabaseUrl ? 'present' : 'missing'} | MONGODB_URI{' '}
                {providerDiagnostics.env.hasMongoUri ? 'present' : 'missing'}
                {providerDiagnostics.env.appDbProviderEnv
                  ? ` | APP_DB_PROVIDER=${providerDiagnostics.env.appDbProviderEnv}`
                  : ''}
              </div>

              {providerDiagnostics.warnings.length > 0 && (
                <div className='mt-3 rounded border border-amber-500/40 bg-amber-500/10 p-3'>
                  <div className='text-xs font-medium text-amber-100'>Warnings</div>
                  <div className='mt-2 grid gap-1 text-[11px] text-amber-100/90'>
                    {providerDiagnostics.warnings.map((warning: string, index: number) => (
                      <div key={`${warning}-${index}`}>{warning}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className='mt-6 flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h2 className='text-lg font-semibold text-white'>Global provider</h2>
            <p className='mt-1 text-sm text-gray-400'>
              This overrides product, integration, auth, and notes data sources.
            </p>
          </div>
          <Button
            type='button'
            onClick={() => void saveProvider()}
            disabled={settingsQuery.isPending || updateSetting.isPending || !dirty}
            className='inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300'
          >
            {updateSetting.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className='mt-6 max-w-lg space-y-2'>
          <Label className='text-sm font-medium text-gray-200' htmlFor='app-db-provider'>
            Database provider
          </Label>
          <select
            id='app-db-provider'
            className='w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:cursor-not-allowed disabled:text-gray-500'
            value={provider}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              const value = event.target.value === 'mongodb' ? 'mongodb' : 'prisma';
              setProvider(value);
              setDirty(true);
            }}
            disabled={settingsQuery.isPending}
          >
            {providerOptions.map((option: (typeof providerOptions)[number]) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className='text-xs text-gray-400'>{providerDescription}</p>
        </div>

        <div className='mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
          Switching providers does not migrate existing data. Make sure the target
          database is prepared before switching.
        </div>

        <div className='mt-8 border-t border-gray-800 pt-6'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <h2 className='text-lg font-semibold text-white'>Auth data provider</h2>
              <p className='mt-1 text-sm text-gray-400'>
                Choose where auth users, sessions, and security data are read/written.
              </p>
            </div>
            <Button
              type='button'
              onClick={() => void saveAuthProvider()}
              disabled={settingsQuery.isPending || updateSetting.isPending || !authDirty}
              className='inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300'
            >
              {updateSetting.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>

          <div className='mt-6 max-w-lg space-y-2'>
            <Label className='text-sm font-medium text-gray-200' htmlFor='auth-db-provider'>
              Auth provider
            </Label>
            <select
              id='auth-db-provider'
              className='w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:cursor-not-allowed disabled:text-gray-500'
              value={authProvider}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const value = event.target.value === 'prisma' ? 'prisma' : 'mongodb';
                setAuthProvider(value);
                setAuthDirty(true);
              }}
              disabled={settingsQuery.isPending}
            >
              {authProviderOptions.map((option: (typeof authProviderOptions)[number]) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className='text-xs text-gray-400'>{authProviderDescription}</p>
          </div>

          <div className='mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
            Changing auth provider does not migrate auth data. Run the Database Sync tool
            before switching if you need data in both stores.
          </div>
        </div>

        <div className='mt-8 border-t border-gray-800 pt-6'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <h2 className='text-lg font-semibold text-white'>Product data provider</h2>
              <p className='mt-1 text-sm text-gray-400'>
                Choose where products, catalogs, categories, tags, and listings are read/written.
              </p>
            </div>
            <Button
              type='button'
              onClick={() => void saveProductProvider()}
              disabled={settingsQuery.isPending || updateSetting.isPending || !productDirty}
              className='inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300'
            >
              {updateSetting.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>

          <div className='mt-6 max-w-lg space-y-2'>
            <Label className='text-sm font-medium text-gray-200' htmlFor='product-db-provider'>
              Product provider
            </Label>
            <select
              id='product-db-provider'
              className='w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:cursor-not-allowed disabled:text-gray-500'
              value={productProvider}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const value = event.target.value === 'prisma' ? 'prisma' : 'mongodb';
                setProductProvider(value);
                setProductDirty(true);
              }}
              disabled={settingsQuery.isPending}
            >
              {productProviderOptions.map((option: (typeof productProviderOptions)[number]) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className='text-xs text-gray-400'>{productProviderDescription}</p>
          </div>

          <div className='mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100'>
            Changing product provider does not migrate data. Run the Database Sync tool
            before switching if you need data in both stores.
          </div>
        </div>

        <div className='mt-8 border-t border-gray-800 pt-6'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <h2 className='text-lg font-semibold text-white'>Settings Key Backfill</h2>
              <p className='mt-1 text-sm text-gray-400'>
                Backfills missing MongoDB settings keys when only a string _id exists.
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                variant='outline'
                disabled={backfillLoading}
                onClick={() => void runSettingsBackfill(true)}
                className='border-gray-700 text-gray-200 hover:bg-gray-900'
              >
                {backfillLoading ? 'Running...' : 'Dry Run'}
              </Button>
              <Button
                type='button'
                variant='outline'
                disabled={backfillLoading}
                onClick={() => void runSettingsBackfill(false)}
                className='border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/20'
              >
                {backfillLoading ? 'Running...' : 'Run Backfill'}
              </Button>
            </div>
          </div>

          <div className='mt-4 max-w-xs space-y-2'>
            <Label className='text-sm font-medium text-gray-200' htmlFor='settings-backfill-limit'>
              Batch size
            </Label>
            <input
              id='settings-backfill-limit'
              type='number'
              min={1}
              max={5000}
              value={backfillLimit}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const next = Number.parseInt(event.target.value, 10);
                setBackfillLimit(Number.isFinite(next) ? Math.min(Math.max(next, 1), 5000) : 500);
              }}
              className='w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:cursor-not-allowed disabled:text-gray-500'
              disabled={backfillLoading}
            />
            <p className='text-xs text-gray-400'>
              Updates up to this many missing keys per run.
            </p>
          </div>

          {backfillResult && (
            <div className='mt-4 rounded-md border border-slate-700/60 bg-slate-900/40 p-3 text-xs text-slate-200'>
              <div>Matched: {backfillResult.matched}</div>
              <div>Modified: {backfillResult.modified}</div>
              <div>Remaining: {backfillResult.remaining}</div>
              {backfillResult.sampleIds && backfillResult.sampleIds.length > 0 && (
                <div className='mt-2 text-slate-300'>
                  Sample ids: {backfillResult.sampleIds.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className='mt-6 rounded-md border border-red-500/30 bg-red-500/10 p-4'>
          <h3 className='text-sm font-semibold text-red-200'>Database Sync (Destructive)</h3>
          <p className='mt-1 text-xs text-red-200/80'>
            Runs a full sync between MongoDB and Prisma. The target database will be overwritten.
            Backups are created automatically before each run.
          </p>
          <div className='mt-3 flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              disabled={syncing !== null}
              onClick={() => void runSync('mongo_to_prisma')}
              className='border-red-400/60 text-red-100 hover:bg-red-500/20'
            >
              {syncing === 'mongo_to_prisma' ? 'Syncing...' : 'Sync MongoDB → Prisma'}
            </Button>
            <Button
              type='button'
              variant='outline'
              disabled={syncing !== null}
              onClick={() => void runSync('prisma_to_mongo')}
              className='border-red-400/60 text-red-100 hover:bg-red-500/20'
            >
              {syncing === 'prisma_to_mongo' ? 'Syncing...' : 'Sync Prisma → MongoDB'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
