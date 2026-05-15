'use client';

import { CheckCircle2, Cloud, Database, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
import { EcommercePricingSyncPanel } from './EcommercePricingSyncPanel';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useToast,
} from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

type SyncTarget = {
  categoryCount: number;
  dbName: string;
  deletedCount: number;
  matchedCount: number;
  modifiedCount: number;
  source: 'local' | 'cloud';
  upsertedCount: number;
};

type SyncResult = {
  sourceCategoryCount: number;
  syncedAt: string;
  targets: SyncTarget[];
};

type SyncResponse = {
  ok: boolean;
  sync: SyncResult;
};

const SYNC_ENDPOINT = '/api/v2/products/pages/data-sync/categories';

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const targetLabel = (source: SyncTarget['source']): string =>
  source === 'local' ? 'Local ecommerce' : 'Cloud ecommerce';

function TargetResultRow({
  changedCount,
  countLabel,
  deletedCount,
  target,
}: {
  changedCount: number;
  countLabel: string;
  deletedCount: number;
  target: Pick<SyncTarget, 'dbName' | 'source'>;
}): React.JSX.Element {
  const Icon = target.source === 'local' ? Database : Cloud;

  return (
    <div className='flex flex-col gap-3 rounded-md border border-border/70 bg-background/35 p-3 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex min-w-0 items-center gap-3'>
        <span className='flex size-9 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'>
          <Icon className='size-4' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <div className='truncate text-sm font-medium text-foreground'>{targetLabel(target.source)}</div>
          <div className='truncate text-xs text-muted-foreground'>{target.dbName}</div>
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <Badge variant='active'>{countLabel}</Badge>
        <Badge variant={changedCount > 0 ? 'info' : 'neutral'}>{changedCount} changed</Badge>
        {deletedCount > 0 ? (
          <Badge variant='warning'>{deletedCount} removed</Badge>
        ) : null}
      </div>
    </div>
  );
}

function SyncPanelHeader({
  buttonLabel,
  isSyncing,
  onSyncClick,
  result,
  sourceCountLabel,
  title,
  targetCountLabel,
}: {
  buttonLabel: string;
  isSyncing: boolean;
  onSyncClick: () => void;
  result: SyncResult | null;
  sourceCountLabel: string;
  title: string;
  targetCountLabel: string;
}): React.JSX.Element {
  return (
    <CardHeader className='gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
      <div className='min-w-0'>
        <CardTitle className='text-base'>{title}</CardTitle>
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          <Badge variant={result === null ? 'neutral' : 'active'}>
            {sourceCountLabel}
          </Badge>
          <Badge variant={result === null ? 'neutral' : 'info'}>{targetCountLabel}</Badge>
        </div>
      </div>
      <Button
        type='button'
        variant='solid'
        icon={<RefreshCw className={cn('size-4', isSyncing && 'animate-spin')} aria-hidden='true' />}
        loading={isSyncing}
        loadingText='Pushing'
        onClick={onSyncClick}
      >
        {buttonLabel}
      </Button>
    </CardHeader>
  );
}

function SyncPanelContent({
  error,
  result,
}: {
  error: string | null;
  result: SyncResult | null;
}): React.JSX.Element {
  if (result === null) {
    return (
      <CardContent className='space-y-4'>
        {error !== null ? (
          <Alert
            variant='error'
            icon={<XCircle className='size-4' aria-hidden='true' />}
            title='Category push failed'
            description={error}
          />
        ) : null}
        <div className='rounded-md border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground'>
          Categories have not been pushed in this session.
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className='space-y-4'>
      {error !== null ? (
        <Alert
          variant='error'
          icon={<XCircle className='size-4' aria-hidden='true' />}
          title='Category push failed'
          description={error}
        />
      ) : null}
      <div className='space-y-3'>
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <CheckCircle2 className='size-4 text-emerald-400' aria-hidden='true' />
          <span>Last push {formatDateTime(result.syncedAt)}</span>
        </div>
        <div className='grid gap-3 lg:grid-cols-2'>
          {result.targets.map((target) => (
            <TargetResultRow
              key={`${target.source}:${target.dbName}`}
              changedCount={target.modifiedCount + target.upsertedCount + target.deletedCount}
              countLabel={`${target.categoryCount} categories`}
              deletedCount={target.deletedCount}
              target={target}
            />
          ))}
        </div>
      </div>
    </CardContent>
  );
}

function CategoriesSyncPanel(): React.JSX.Element {
  const { toast } = useToast();
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncMutation = useMutationV2<SyncResponse, void>({
    mutationKey: ['products', 'ecommerce-pages-cms', 'data-sync', 'categories'],
    mutationFn: (): Promise<SyncResponse> =>
      api.post<SyncResponse>(SYNC_ENDPOINT, undefined, {
        logError: false,
        timeout: 120_000,
      }),
    onSuccess: (response: SyncResponse): void => {
      setResult(response.sync);
      toast('Categories pushed to ecommerce databases.', { variant: 'success' });
    },
    onError: (syncError: Error): void => {
      const message = toErrorMessage(syncError);
      setError(message);
      toast(message, { variant: 'error' });
    },
    meta: {
      source: 'products.ecommercePagesCms.CategoriesSyncPanel.sync',
      operation: 'action',
      resource: 'products.ecommerce-pages-cms.categories-data-sync',
      domain: 'products',
      description: 'Pushes ecommerce category data to local and cloud ecommerce databases.',
      errorPresentation: 'toast',
      tags: ['products', 'ecommerce', 'cms', 'categories', 'data-sync'],
    },
  });

  const targetCountLabel = useMemo(() => {
    if (result === null) return 'No push run yet';
    return `${result.targets.length} ecommerce database${result.targets.length === 1 ? '' : 's'}`;
  }, [result]);

  const handleSyncClick = useCallback((): void => {
    setError(null);
    syncMutation.mutate();
  }, [syncMutation]);

  return (
    <Card variant='outline'>
      <SyncPanelHeader
        buttonLabel='Push categories'
        isSyncing={syncMutation.isPending}
        onSyncClick={handleSyncClick}
        result={result}
        sourceCountLabel={`${result?.sourceCategoryCount ?? 0} source categories`}
        targetCountLabel={targetCountLabel}
        title='Categories'
      />
      <SyncPanelContent error={error} result={result} />
    </Card>
  );
}

export function EcommerceDataSyncPanel(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <CategoriesSyncPanel />
      <EcommercePricingSyncPanel />
    </div>
  );
}
