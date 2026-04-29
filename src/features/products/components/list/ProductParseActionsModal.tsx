'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import {
  useMarkParsedTraderaMatchesClosed,
  useMatchProductParseActions,
} from '@/features/products/hooks/useProductParseActionsMutations';
import type {
  ProductParseActionsMarkClosedTarget,
  ProductParseActionsMatchResponse,
  ProductParseActionsMatchRow,
} from '@/shared/contracts/products/parse-actions';
import { AppModal } from '@/shared/ui/app-modal';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  ProductParseActionsBody,
  ProductParseActionsFooter,
} from './ProductParseActionsModal.parts';

type ProductParseActionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onFindMatches: (productIds: string[], meta: { matchedRowCount: number }) => void;
};
type MatchMutation = ReturnType<typeof useMatchProductParseActions>;
type MarkClosedMutation = ReturnType<typeof useMarkParsedTraderaMatchesClosed>;
type ToastFn = ReturnType<typeof useToast>['toast'];

const CLOSED_LISTING_STATUS = 'closed';

const buildActionTargets = (
  preview: ProductParseActionsMatchResponse | null
): ProductParseActionsMarkClosedTarget[] =>
  preview?.rows.flatMap((row: ProductParseActionsMatchRow) => {
    if (row.matchStatus !== 'confirmed' || row.product === null || row.listing === null) {
      return [];
    }
    return [
      {
        rowId: row.row.rowId,
        productId: row.product.id,
        listingId: row.listing.id,
        objectNumber: row.row.objectNumber,
        title: row.row.title,
      },
    ];
  }) ?? [];

const buildMatchedProductIds = (
  preview: ProductParseActionsMatchResponse | null
): string[] => {
  const productIds = new Set<string>();
  preview?.rows.forEach((row: ProductParseActionsMatchRow) => {
    if (row.matchStatus !== 'confirmed' || row.product === null) return;
    productIds.add(row.product.id);
  });
  return Array.from(productIds);
};

const countMatchedRows = (preview: ProductParseActionsMatchResponse | null): number =>
  preview?.rows.filter(
    (row: ProductParseActionsMatchRow): boolean =>
      row.matchStatus === 'confirmed' && row.product !== null
  ).length ?? 0;

const updateClosedPreview = (
  current: ProductParseActionsMatchResponse | null,
  closedListingIds: Set<string>
): ProductParseActionsMatchResponse | null => {
  if (current === null) return current;
  return {
    ...current,
    rows: current.rows.map((row: ProductParseActionsMatchRow) =>
      row.listing !== null && closedListingIds.has(row.listing.id)
        ? { ...row, listing: { ...row.listing, status: CLOSED_LISTING_STATUS } }
        : row
    ),
  };
};

const runParsePreview = async (options: {
  text: string;
  matchMutation: MatchMutation;
  setPreview: (preview: ProductParseActionsMatchResponse) => void;
  toast: ToastFn;
}): Promise<void> => {
  const { text, matchMutation, setPreview, toast } = options;
  if (text.trim().length === 0) {
    toast('Paste marketplace text before parsing.', { variant: 'error' });
    return;
  }

  try {
    const response = await matchMutation.mutateAsync({ source: 'tradera', text });
    setPreview(response);
    toast(`Parsed ${response.parsedCount} row${response.parsedCount === 1 ? '' : 's'}.`, {
      variant: 'success',
    });
  } catch (error) {
    logClientError(error);
    toast(error instanceof Error ? error.message : 'Failed to parse product actions.', {
      variant: 'error',
    });
  }
};

const runMarkClosed = async (options: {
  actionTargets: ProductParseActionsMarkClosedTarget[];
  markClosedMutation: MarkClosedMutation;
  setPreview: Dispatch<SetStateAction<ProductParseActionsMatchResponse | null>>;
  toast: ToastFn;
}): Promise<void> => {
  const { actionTargets, markClosedMutation, setPreview, toast } = options;
  if (actionTargets.length === 0) {
    toast('No confirmed Tradera listing matches to update.', { variant: 'error' });
    return;
  }

  try {
    const response = await markClosedMutation.mutateAsync({ matches: actionTargets });
    const changed = new Set(
      response.results
        .filter((result) => result.status === 'updated' || result.status === 'skipped')
        .map((result) => result.listingId)
    );
    setPreview((current) => updateClosedPreview(current, changed));
    toast(`Closed ${response.updated} Tradera listing${response.updated === 1 ? '' : 's'}.`, {
      variant: response.failed > 0 ? 'warning' : 'success',
    });
  } catch (error) {
    logClientError(error);
    toast(error instanceof Error ? error.message : 'Failed to update Tradera listings.', {
      variant: 'error',
    });
  }
};

export function ProductParseActionsModal(
  props: ProductParseActionsModalProps
): React.JSX.Element {
  const { isOpen, onClose, onFindMatches } = props;
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ProductParseActionsMatchResponse | null>(null);
  const matchMutation = useMatchProductParseActions();
  const markClosedMutation = useMarkParsedTraderaMatchesClosed();
  const actionTargets = useMemo(() => buildActionTargets(preview), [preview]);
  const matchedProductIds = useMemo(() => buildMatchedProductIds(preview), [preview]);
  const matchedRowCount = useMemo(() => countMatchedRows(preview), [preview]);
  const isBusy = matchMutation.isPending || markClosedMutation.isPending;
  const parse = (): void => {
    void runParsePreview({ text, matchMutation, setPreview, toast });
  };
  const markClosed = (): void => {
    void runMarkClosed({ actionTargets, markClosedMutation, setPreview, toast });
  };
  const findMatches = (): void => {
    if (matchedProductIds.length === 0) {
      toast('No confirmed product matches to find.', { variant: 'error' });
      return;
    }
    onFindMatches(matchedProductIds, { matchedRowCount });
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Parse Actions'
      subtitle='Extract marketplace rows, match products, and apply listing actions.'
      size='xl'
      lockClose={isBusy}
      footer={
        <ProductParseActionsFooter
          actionTargetCount={actionTargets.length}
          matchTargetCount={matchedProductIds.length}
          matchedRowCount={matchedRowCount}
          isBusy={isBusy}
          isMarking={markClosedMutation.isPending}
          isParsing={matchMutation.isPending}
          onFindMatches={findMatches}
          onMarkClosed={markClosed}
          onParse={parse}
        />
      }
    >
      <ProductParseActionsBody
        isParsing={matchMutation.isPending}
        onParse={parse}
        onTextChange={setText}
        preview={preview}
        text={text}
      />
    </AppModal>
  );
}
