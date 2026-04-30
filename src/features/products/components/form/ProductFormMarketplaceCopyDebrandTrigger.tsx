'use client';
'use no memo';

import { useCallback, useState } from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormImages } from '@/features/products/context/ProductFormImageContext';
import { buildMarketplaceCopyDebrandTriggerInput } from '@/features/products/lib/buildMarketplaceCopyDebrandTriggerInput';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import type { MarketplaceCopyDebrandTriggerInput } from '@/shared/contracts/products';
import { MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME } from '@/shared/lib/ai-paths/marketplace-copy-debrand';
import { Button } from '@/shared/ui/button';
import { StatusBadge } from '@/shared/ui/status-badge';
import { useToast } from '@/shared/ui/toast';

import {
  DEBRAND_STATUS_LABELS,
  type DebrandRunStatus,
  useRestoredMarketplaceCopyDebrandRun,
} from './ProductFormMarketplaceCopyDebrandFeedback';
import {
  launchMarketplaceCopyDebrandRun,
  type DebrandPayloadFactory,
} from './ProductFormMarketplaceCopyDebrandLaunch';
import { useTrackedMarketplaceCopyDebrandRun } from './ProductFormMarketplaceCopyDebrandTracking';

type MarketplaceCopyDebrandTriggerProps = {
  rowId: string;
  rowIndex: number;
  integrationIds: string[];
  integrationLabels: string[];
  currentTitle: string;
  currentDescription: string;
  disabled: boolean;
  resolveCurrentRowIndex: (rowId: string) => number | null;
};

const useMarketplaceCopyDebrandPayload = (
  props: MarketplaceCopyDebrandTriggerProps
): DebrandPayloadFactory => {
  const { product, draft, getValues } = useProductFormCore();
  const { imageLinks } = useProductFormImages();
  const productId = product?.id ?? null;

  const getMarketplaceCopyDebrandInput = useCallback((): MarketplaceCopyDebrandTriggerInput => {
    const values = { ...getValues(), imageLinks };
    return buildMarketplaceCopyDebrandTriggerInput({
      values,
      row: {
        id: props.rowId,
        index: props.rowIndex,
        integrationIds: props.integrationIds,
        integrationNames: props.integrationLabels,
        currentAlternateTitle: props.currentTitle,
        currentAlternateDescription: props.currentDescription,
      },
    });
  }, [getValues, imageLinks, props]);

  const getEntityJson = useCallback((): Record<string, unknown> => {
    const values = { ...getValues(), imageLinks };
    const entityJson = buildTriggeredProductEntityJson({ product, draft, values });
    entityJson['marketplaceCopyDebrandInput'] = getMarketplaceCopyDebrandInput();
    return entityJson;
  }, [draft, getMarketplaceCopyDebrandInput, getValues, imageLinks, product]);

  return { productId, getEntityJson, getMarketplaceCopyDebrandInput };
};


function MarketplaceCopyDebrandRunStatus(props: { runStatus: DebrandRunStatus | null }): React.JSX.Element | null {
  if (props.runStatus === null) return null;
  const label = DEBRAND_STATUS_LABELS[props.runStatus];
  return (
    <StatusBadge status={props.runStatus} label={label} size='sm' title={`Debrand run status: ${label}`} />
  );
}

function MarketplaceCopyDebrandActionRow(props: {
  runStatus: DebrandRunStatus | null;
  disabled: boolean;
  onTrigger: () => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center justify-end gap-2'>
      <MarketplaceCopyDebrandRunStatus runStatus={props.runStatus} />
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={props.onTrigger}
        disabled={props.disabled}
        className='gap-2'
      >
        {MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME}
      </Button>
    </div>
  );
}

export function MarketplaceCopyDebrandTrigger(
  props: MarketplaceCopyDebrandTriggerProps
): React.JSX.Element {
  const { setValue } = useProductFormCore();
  const { toast } = useToast();
  const payload = useMarketplaceCopyDebrandPayload(props);
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [isTriggerPending, setIsTriggerPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<DebrandRunStatus | null>(null);

  useRestoredMarketplaceCopyDebrandRun({
    productId: payload.productId,
    integrationIds: props.integrationIds,
    pendingRunId,
    setPendingRunId,
    setRunStatus,
  });

  useTrackedMarketplaceCopyDebrandRun({
    ...props,
    pendingRunId,
    productId: payload.productId,
    integrationIds: props.integrationIds,
    setValue,
    setError,
    setRunStatus,
    setPendingRunId,
  });

  const handleDebrandTrigger = useCallback(async (): Promise<void> => {
    await launchMarketplaceCopyDebrandRun({
      payload,
      integrationIds: props.integrationIds,
      toast,
      setError,
      setRunStatus,
      setIsTriggerPending,
      setPendingRunId,
    });
  }, [payload, props.integrationIds, toast]);

  return (
    <div className='flex min-w-0 flex-col items-end gap-2'>
      <MarketplaceCopyDebrandActionRow
        runStatus={runStatus}
        disabled={props.disabled || isTriggerPending || pendingRunId !== null}
        onTrigger={() => {
          void handleDebrandTrigger();
        }}
      />
      {error !== null ? <p className='text-right text-xs text-destructive'>{error}</p> : null}
    </div>
  );
}
