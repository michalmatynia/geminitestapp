import type { JSX } from 'react';
import { Badge } from '@/shared/ui/primitives.public';

export function ContentManagerHeader({ 
    activeTabLabel, 
    needsAttention 
}: { 
    activeTabLabel: string; 
    needsAttention: boolean 
}): JSX.Element {
  return (
    <div className='flex items-start justify-between gap-3 mb-6'>
      <div className='space-y-1'>
        <h2 className='text-2xl font-bold tracking-tight text-white'>Content Manager</h2>
        <p className='text-sm text-muted-foreground'>Lessons, tests, and content readiness.</p>
      </div>
      <div className='flex items-center gap-2'>
        <Badge variant='active'>{activeTabLabel}</Badge>
        {needsAttention && <Badge variant='destructive'>Needs Attention</Badge>}
      </div>
    </div>
  );
}
