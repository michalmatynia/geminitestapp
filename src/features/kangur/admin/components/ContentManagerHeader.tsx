import type { JSX } from 'react';
import { Badge } from '@/shared/ui/primitives.public';
import { AdminDatabaseBreadcrumbs } from '@/shared/ui/admin.public';

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
        <AdminDatabaseBreadcrumbs 
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Kangur', href: '/admin/kangur' },
            { label: 'Content Manager' },
          ]} 
        />
      </div>
      <div className='flex items-center gap-2'>
        <Badge variant='active'>{activeTabLabel}</Badge>
        {needsAttention && <Badge variant='destructive'>Needs Attention</Badge>}
      </div>
    </div>
  );
}
