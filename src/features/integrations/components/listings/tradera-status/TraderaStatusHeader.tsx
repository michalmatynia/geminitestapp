import { Badge, Button } from '@/shared/ui/primitives.public';

export function TraderaStatusHeader({ total, errorCount, onRefresh }: { total: number, errorCount: number, onRefresh: () => void }) {
  return (
    <div className='flex items-center justify-between border-b border-border/60 bg-card/40 p-4'>
      <div>
        <h2 className='text-sm font-semibold text-white'>Tradera Listings Status</h2>
        <div className='flex gap-2 mt-1'>
          <Badge variant='outline'>{total} Total</Badge>
          {errorCount > 0 && <Badge variant='destructive'>{errorCount} Errors</Badge>}
        </div>
      </div>
      <Button size='sm' variant='outline' onClick={onRefresh}>Refresh</Button>
    </div>
  );
}
