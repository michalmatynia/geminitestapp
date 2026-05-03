import type { JSX } from 'react';
import { Card } from '@/shared/ui/primitives.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

export function ContentManagerStats({ stats }: { stats: any }): JSX.Element {
  return (
    <Card className='p-4 border-white/10 bg-card/30 mb-6'>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <StatItem label='Fixes Needed' value={stats.needsFixesCount} />
        <StatItem label='Legacy Lessons' value={stats.legacyLessonCount} />
        <StatItem label='Missing Narration' value={stats.missingNarrationCount} />
        <StatItem label='Total' value={stats.totalCount} />
      </div>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className='flex flex-col'>
      <span className='text-xs text-muted-foreground uppercase tracking-wider'>{label}</span>
      <span className='text-lg font-semibold text-white'>{value}</span>
    </div>
  );
}
