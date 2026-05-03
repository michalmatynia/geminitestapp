import { Pagination } from '@/shared/ui/navigation-and-layout.public';

export function TraderaStatusSummary({ count, page, onPageChange, totalPages }: any) {
  return (
    <div className='flex items-center justify-between border-t border-border/60 p-4'>
      <div className='text-xs text-muted-foreground'>Showing {count} items</div>
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} variant='compact' />
    </div>
  );
}
