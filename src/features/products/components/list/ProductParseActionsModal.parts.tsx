import { CheckCircle2, FileSearch, Play, Search } from 'lucide-react';

import type {
  ProductParseActionsMatchResponse,
  ProductParseActionsMatchRow,
} from '@/shared/contracts/products/parse-actions';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { Textarea } from '@/shared/ui/textarea';

type ProductParseActionsBodyProps = {
  text: string;
  preview: ProductParseActionsMatchResponse | null;
  isParsing: boolean;
  onTextChange: (text: string) => void;
  onParse: () => void;
};

type ProductParseActionsFooterProps = {
  actionTargetCount: number;
  matchTargetCount: number;
  matchedRowCount: number;
  isBusy: boolean;
  isParsing: boolean;
  isMarking: boolean;
  onFindMatches: () => void;
  onMarkClosed: () => void;
  onParse: () => void;
};

const CLOSED_LISTING_STATUSES = new Set(['closed', 'ended']);

const formatPrice = (row: ProductParseActionsMatchRow['row']): string => {
  if (row.rawPrice !== null) return row.rawPrice;
  if (row.price === null) return 'No price';
  return row.currency !== null ? `${row.currency} ${row.price.toFixed(2)}` : row.price.toFixed(2);
};

const formatListingStatus = (status: string | null | undefined): string => {
  if (status === null || status === undefined || status.length === 0) return 'No listing';
  return CLOSED_LISTING_STATUSES.has(status.trim().toLowerCase()) ? 'Closed' : status;
};

const matchBadgeVariant = (
  status: ProductParseActionsMatchRow['matchStatus']
): 'success' | 'warning' | 'neutral' => {
  if (status === 'confirmed') return 'success';
  if (status === 'ambiguous') return 'warning';
  return 'neutral';
};

const getConfirmedMatchedRows = (
  preview: ProductParseActionsMatchResponse | null
): ProductParseActionsMatchRow[] =>
  preview?.rows.filter(
    (row: ProductParseActionsMatchRow): boolean =>
      row.matchStatus === 'confirmed' && row.product !== null
  ) ?? [];

const getUniqueConfirmedProductCount = (
  preview: ProductParseActionsMatchResponse | null
): number =>
  new Set(
    getConfirmedMatchedRows(preview).flatMap((row: ProductParseActionsMatchRow): string[] =>
      row.product !== null ? [row.product.id] : []
    )
  ).size;

const ProductParseActionsSummary = ({
  preview,
}: {
  preview: ProductParseActionsMatchResponse | null;
}): React.JSX.Element | null => {
  if (preview === null) return null;

  return (
    <div className='grid gap-2 sm:grid-cols-4'>
      <div className='rounded-md border border-border/60 bg-card/40 p-3'>
        <div className='text-xs text-muted-foreground'>Parsed</div>
        <div className='text-lg font-semibold'>{preview.parsedCount}</div>
      </div>
      <div className='rounded-md border border-border/60 bg-card/40 p-3'>
        <div className='text-xs text-muted-foreground'>Matched rows</div>
        <div className='text-lg font-semibold'>{preview.matchedCount}</div>
      </div>
      <div className='rounded-md border border-border/60 bg-card/40 p-3'>
        <div className='text-xs text-muted-foreground'>Unique products</div>
        <div className='text-lg font-semibold'>{getUniqueConfirmedProductCount(preview)}</div>
      </div>
      <div className='rounded-md border border-border/60 bg-card/40 p-3'>
        <div className='text-xs text-muted-foreground'>Actionable</div>
        <div className='text-lg font-semibold'>{preview.actionableCount}</div>
      </div>
    </div>
  );
};

const ProductParseActionsTableRow = ({
  row,
}: {
  row: ProductParseActionsMatchRow;
}): React.JSX.Element => (
  <TableRow>
    <TableCell className='font-medium'>
      <div className='max-w-[360px] truncate' title={row.row.title}>
        {row.row.title}
      </div>
    </TableCell>
    <TableCell>{formatPrice(row.row)}</TableCell>
    <TableCell>{row.row.objectNumber ?? '-'}</TableCell>
    <TableCell>
      <Badge variant={matchBadgeVariant(row.matchStatus)}>{row.matchStatus}</Badge>
    </TableCell>
    <TableCell>
      {row.product !== null ? (
        <div className='space-y-1'>
          <div className='max-w-[300px] truncate' title={row.product.name ?? row.product.id}>
            {row.product.name ?? row.product.id}
          </div>
          {typeof row.product.sku === 'string' && row.product.sku.length > 0 ? (
            <div className='text-xs text-muted-foreground'>{row.product.sku}</div>
          ) : null}
        </div>
      ) : (
        <span className='text-muted-foreground'>No match</span>
      )}
    </TableCell>
    <TableCell>{formatListingStatus(row.listing?.status)}</TableCell>
  </TableRow>
);

const ProductParseActionsTable = ({
  preview,
}: {
  preview: ProductParseActionsMatchResponse | null;
}): React.JSX.Element => {
  if (preview === null) {
    return (
      <div className='rounded-md border border-dashed border-border/70 p-6 text-sm text-muted-foreground'>
        No parsed rows yet.
      </div>
    );
  }

  if (preview.rows.length === 0) {
    return (
      <div className='rounded-md border border-dashed border-border/70 p-6 text-sm text-muted-foreground'>
        No product listings were detected.
      </div>
    );
  }

  return (
    <Table wrapperClassName='max-h-[420px] rounded-md border border-border/60'>
      <TableHeader className='sticky top-0 z-10 bg-card'>
        <TableRow>
          <TableHead className='min-w-[260px]'>Parsed title</TableHead>
          <TableHead className='min-w-[120px]'>Price</TableHead>
          <TableHead className='min-w-[120px]'>Object no.</TableHead>
          <TableHead className='min-w-[120px]'>Match</TableHead>
          <TableHead className='min-w-[220px]'>Product</TableHead>
          <TableHead className='min-w-[120px]'>Tradera</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {preview.rows.map((row: ProductParseActionsMatchRow) => (
          <ProductParseActionsTableRow key={row.row.rowId} row={row} />
        ))}
      </TableBody>
    </Table>
  );
};

export const ProductParseActionsFooter = ({
  actionTargetCount,
  matchTargetCount,
  matchedRowCount,
  isBusy,
  isMarking,
  isParsing,
  onFindMatches,
  onMarkClosed,
  onParse,
}: ProductParseActionsFooterProps): React.JSX.Element => (
  <>
    <Button
      type='button'
      variant='outline'
      onClick={onParse}
      disabled={isParsing}
      loading={isParsing}
      loadingText='Parsing...'
      className='gap-2'
    >
      <FileSearch className='h-4 w-4' />
      Parse
    </Button>
    <Button
      type='button'
      variant='outline'
      onClick={onFindMatches}
      disabled={isBusy || matchTargetCount === 0}
      className='gap-2'
    >
      <Search className='h-4 w-4' />
      {matchTargetCount > 0
        ? `Find ${matchTargetCount} Product${matchTargetCount === 1 ? '' : 's'}${
            matchedRowCount > matchTargetCount ? ` (${matchedRowCount} rows)` : ''
          }`
        : 'Find Products'}
    </Button>
    <Button
      type='button'
      onClick={onMarkClosed}
      disabled={isMarking || actionTargetCount === 0}
      loading={isMarking}
      loadingText='Updating...'
      className='gap-2'
    >
      <CheckCircle2 className='h-4 w-4' />
      Mark Tradera Closed
    </Button>
  </>
);

export const ProductParseActionsBody = ({
  isParsing,
  onParse,
  onTextChange,
  preview,
  text,
}: ProductParseActionsBodyProps): React.JSX.Element => (
  <div className='space-y-4'>
    <div className='space-y-2'>
      <label htmlFor='product-parse-actions-text' className='text-xs font-medium text-gray-400'>
        Marketplace text
      </label>
      <Textarea
        id='product-parse-actions-text'
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder='Paste listing text here...'
        className='min-h-[220px] resize-y font-mono text-xs leading-5'
      />
    </div>
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <ProductParseActionsSummary preview={preview} />
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={onParse}
        disabled={isParsing || text.trim().length === 0}
        className='gap-2'
      >
        <Play className='h-3.5 w-3.5' />
        Parse Preview
      </Button>
    </div>
    <ProductParseActionsTable preview={preview} />
  </div>
);
