'use client';

import type { ProductBatchEditResponse } from '@/shared/contracts/products';

type ProductBatchEditPreviewProps = {
  response: ProductBatchEditResponse | null;
  summary: string | null;
};

export function ProductBatchEditPreview({
  response,
  summary,
}: ProductBatchEditPreviewProps): React.JSX.Element | null {
  if (response === null || summary === null) return null;

  const visibleResults = response.results
    .filter((result) => result.status !== 'unchanged')
    .slice(0, 8);

  return (
    <div className='space-y-3 rounded-lg border border-border/60 bg-card/40 p-3'>
      <div className='text-sm font-medium'>{summary}</div>
      {visibleResults.length > 0 ? (
        <div className='max-h-52 space-y-2 overflow-auto text-xs text-muted-foreground'>
          {visibleResults.map((result) => (
            <div key={result.productId} className='rounded border border-border/40 p-2'>
              <div className='font-medium text-foreground'>
                {result.productId}: {result.status}
              </div>
              {result.error !== undefined && result.error.length > 0 ? (
                <div className='text-destructive'>{result.error}</div>
              ) : null}
              {result.changes.slice(0, 5).map((change) => (
                <div key={`${result.productId}-${change.field}`}>
                  {change.field}: {JSON.stringify(change.oldValue)}
                  {' -> '}
                  {JSON.stringify(change.newValue)}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
