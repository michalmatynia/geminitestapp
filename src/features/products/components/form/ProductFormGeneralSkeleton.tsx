import { Skeleton, SectionPanel } from '@/shared/ui';

export function ProductFormGeneralSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <SectionPanel variant="subtle-compact" className="border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <Skeleton className="h-4 w-full" />
      </SectionPanel>

      <div className="space-y-4">
        <div className="rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3">
          <div className="mb-3 flex gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3">
          <div className="mb-3 flex gap-2">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-28" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
