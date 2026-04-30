'use client';

import type { ProductScrapeProfileRunResponse } from '@/shared/contracts/products/scrape-profiles';

const RESULT_ROW_LIMIT = 8;

export function ProductScrapeProfilesResult({
  result,
}: {
  result: ProductScrapeProfileRunResponse;
}): React.JSX.Element {
  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-card/35 p-4'>
      <div className='grid gap-2 sm:grid-cols-5'>
        {[
          ['Scraped', result.scrapedCount],
          ['Created', result.createdCount],
          ['Updated', result.updatedCount],
          ['Skipped', result.skippedCount],
          ['Failed', result.failedCount],
        ].map(([label, value]) => (
          <div key={label}>
            <div className='text-[10px] uppercase text-muted-foreground'>{label}</div>
            <div className='text-sm font-semibold'>{value}</div>
          </div>
        ))}
      </div>
      <div className='max-h-64 overflow-auto rounded-md border border-white/5'>
        <table className='w-full text-left text-xs'>
          <thead className='sticky top-0 bg-card text-muted-foreground'>
            <tr>
              <th className='px-3 py-2 font-medium'>Status</th>
              <th className='px-3 py-2 font-medium'>SKU</th>
              <th className='px-3 py-2 font-medium'>Product</th>
            </tr>
          </thead>
          <tbody>
            {result.products.slice(0, RESULT_ROW_LIMIT).map((product) => (
              <tr
                key={`${product.index}-${product.sku ?? 'missing'}`}
                className='border-t border-white/5'
              >
                <td className='px-3 py-2 capitalize text-muted-foreground'>
                  {product.status.replace('_', ' ')}
                </td>
                <td className='px-3 py-2 font-mono'>{product.sku ?? '-'}</td>
                <td className='px-3 py-2'>
                  <div className='max-w-[360px] truncate'>{product.title ?? '-'}</div>
                  {product.error !== null ? (
                    <div className='mt-1 text-[11px] text-red-300'>{product.error}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
