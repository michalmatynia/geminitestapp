import { Badge } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';

export function NarrationCoverageReview({ coverageRecommendations }: { coverageRecommendations: string[] }) {
  return (
    <div className='rounded-2xl border border-border/60 bg-card/30 px-3 py-3'>
      <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
        Narration coverage
      </div>
      {coverageRecommendations.length > 0 ? (
        <ul className='mt-3 space-y-1 text-xs leading-relaxed text-muted-foreground'>
          {coverageRecommendations.map((rec) => (
            <li key={rec}>• {rec}</li>
          ))}
        </ul>
      ) : (
        <div className='mt-3 text-xs leading-relaxed text-emerald-300'>
          Narration overrides and content are in good shape.
        </div>
      )}
    </div>
  );
}
