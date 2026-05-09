import { Button, Badge } from '@/features/kangur/shared/ui';
import { Plus, Grid2x2, Image as ImageIcon, Copy, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { cn } from '@/features/kangur/shared/utils';

export function LessonPagesPanel({ controller }: { controller: any }) {
  const { pages, activePage, setActivePageId, mutations, pageDraftReviews } = controller;

  return (
    <div className='rounded-2xl border border-border/60 bg-card/30 p-4'>
      <div className='mb-3 flex items-center justify-between'>
        <div>
          <div className='text-sm font-semibold text-foreground'>Lesson pages</div>
          <div className='text-xs text-muted-foreground'>{pages.length} pages</div>
        </div>
      </div>
      <div className='flex flex-wrap gap-2'>
        {pages.map((page: any, index: number) => {
          const isActive = page.id === activePage?.id;
          const pageReview = pageDraftReviews.get(page.id);
          const hasIssues = pageReview?.issueCount > 0;
          const narrationSummary = pageReview?.narrationCoverage.summaryLabel;
          const narrationState = pageReview?.narrationCoverage.state;

          return (
            <button
              key={page.id}
              onClick={() => setActivePageId(page.id)}
              className={cn(
                'rounded-2xl border px-3 py-2 text-left transition',
                isActive ? 'border-primary/30 bg-primary/10' : 'border-border/60 bg-background/60'
              )}
            >
              <div className='text-sm font-semibold'>{page.title || `Page ${index + 1}`}</div>
              <div className='mt-1 flex flex-wrap gap-1.5'>
                {hasIssues && (
                  <Badge variant='outline' className='h-4 border-rose-200 bg-rose-50 px-1 text-[9px] text-rose-600'>
                    {pageReview.isEmpty ? 'Blank page' : 'Has issues'}
                  </Badge>
                )}
                {narrationSummary && (
                  <Badge
                    variant='outline'
                    className={cn(
                      'h-4 px-1 text-[9px]',
                      narrationState === 'ready'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        : narrationState === 'needs-review'
                        ? 'border-amber-200 bg-amber-50 text-amber-600'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    )}
                  >
                    {narrationSummary}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className='mt-3 flex flex-wrap gap-2'>
        <Button size='sm' variant='outline' onClick={mutations.addBlankPage}><Plus className='mr-1 size-3.5' />New page</Button>
      </div>
    </div>
  );
}
