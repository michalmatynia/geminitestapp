'use client';

import { CheckCircle2, Cloud, Database, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { api } from '@/shared/lib/api-client';
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

type PricingSyncTarget = {
  currencyCount: number;
  dbName: string;
  deletedCurrencyCount: number;
  deletedPriceGroupCount: number;
  modifiedCurrencyCount: number;
  modifiedPriceGroupCount: number;
  priceGroupCount: number;
  source: 'local' | 'cloud';
  upsertedCurrencyCount: number;
  upsertedPriceGroupCount: number;
};

type PricingSyncResult = {
  sourceCurrencyCount: number;
  sourcePriceGroupCount: number;
  syncedAt: string;
  targets: PricingSyncTarget[];
};

type PricingSyncResponse = {
  ok: boolean;
  sync: PricingSyncResult;
};

const PRICING_SYNC_ENDPOINT = '/api/v2/products/pages/data-sync/pricing';

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

const targetLabel = (source: PricingSyncTarget['source']): string =>
  source === 'local' ? 'Local ecommerce' : 'Cloud ecommerce';

const countChangedPricingRecords = (target: PricingSyncTarget): number =>
  target.modifiedCurrencyCount +
  target.modifiedPriceGroupCount +
  target.upsertedCurrencyCount +
  target.upsertedPriceGroupCount +
  target.deletedCurrencyCount +
  target.deletedPriceGroupCount;

const countDeletedPricingRecords = (target: PricingSyncTarget): number =>
  target.deletedCurrencyCount + target.deletedPriceGroupCount;

function PricingTargetResultRow({ target }: { target: PricingSyncTarget }): React.JSX.Element {
  const Icon = target.source === 'local' ? Database : Cloud;
  const changedCount = countChangedPricingRecords(target);
  const deletedCount = countDeletedPricingRecords(target);

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
        <Badge variant='active'>
          {target.currencyCount} currencies, {target.priceGroupCount} groups
        </Badge>
        <Badge variant={changedCount > 0 ? 'info' : 'neutral'}>{changedCount} changed</Badge>
        {deletedCount > 0 ? <Badge variant='warning'>{deletedCount} removed</Badge> : null}
      </div>
    </div>
  );
}

function PricingSyncContent({
  error,
  result,
}: {
  error: string | null;
  result: PricingSyncResult | null;
}): React.JSX.Element {
  return (
    <CardContent className='space-y-4'>
      {error !== null ? (
        <Alert
          variant='error'
          icon={<XCircle className='size-4' aria-hidden='true' />}
          title='Pricing push failed'
          description={error}
        />
      ) : null}
      {result === null ? (
        <div className='rounded-md border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground'>
          Pricing system has not been pushed in this session.
        </div>
      ) : (
        <div className='space-y-3'>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <CheckCircle2 className='size-4 text-emerald-400' aria-hidden='true' />
            <span>Last push {formatDateTime(result.syncedAt)}</span>
          </div>
          <div className='grid gap-3 lg:grid-cols-2'>
            {result.targets.map((target) => (
              <PricingTargetResultRow key={`${target.source}:${target.dbName}`} target={target} />
            ))}
          </div>
        </div>
      )}
    </CardContent>
  );
}

export function EcommercePricingSyncPanel(): React.JSX.Element {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<PricingSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const targetCountLabel = useMemo(() => {
    if (result === null) return 'No push run yet';
    return `${result.targets.length} ecommerce database${result.targets.length === 1 ? '' : 's'}`;
  }, [result]);
  const sourceCountLabel =
    result === null
      ? '0 currencies, 0 price groups'
      : `${result.sourceCurrencyCount} currencies, ${result.sourcePriceGroupCount} price groups`;

  const handleSyncClick = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    setError(null);
    try {
      const response = await api.post<PricingSyncResponse>(PRICING_SYNC_ENDPOINT, undefined, {
        logError: false,
        timeout: 120_000,
      });
      setResult(response.sync);
      toast('Pricing system pushed to ecommerce databases.', { variant: 'success' });
    } catch (syncError: unknown) {
      const message = toErrorMessage(syncError);
      setError(message);
      toast(message, { variant: 'error' });
    } finally {
      setIsSyncing(false);
    }
  }, [toast]);

  return (
    <Card variant='outline'>
      <CardHeader className='gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
        <div className='min-w-0'>
          <CardTitle className='text-base'>Pricing System</CardTitle>
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <Badge variant={result === null ? 'neutral' : 'active'}>{sourceCountLabel}</Badge>
            <Badge variant={result === null ? 'neutral' : 'info'}>{targetCountLabel}</Badge>
          </div>
        </div>
        <Button
          type='button'
          variant='solid'
          icon={<RefreshCw className={cn('size-4', isSyncing && 'animate-spin')} aria-hidden='true' />}
          loading={isSyncing}
          loadingText='Pushing'
          onClick={() => { void handleSyncClick(); }}
        >
          Push pricing system
        </Button>
      </CardHeader>
      <PricingSyncContent error={error} result={result} />
    </Card>
  );
}
