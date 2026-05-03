import { Button } from '@/shared/ui/button';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';
import { UserPlusIcon, Key } from 'lucide-react';
import { StatusBadge } from '@/shared/ui/data-display.public';

export function UsersPageToolbar({ search, setSearch, setMockOpen, setCreateOpen, dirtyRoles, saveRoles }: any) {
  return (
    <div className='flex items-center justify-between gap-4 py-4'>
      <div className='flex-1 max-w-sm'>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} placeholder='Search users...' size='sm' />
      </div>
      <div className='flex items-center gap-2'>
        {dirtyRoles && <StatusBadge status='Unsaved Permission Changes' variant='warning' className='py-1' />}
        <Button type='button' variant='outline' size='sm' onClick={() => setMockOpen(true)}><Key className='mr-1 size-3.5' /> Mock Sign-in</Button>
        <Button type='button' variant='outline' size='sm' onClick={() => setCreateOpen(true)}><UserPlusIcon className='mr-1 size-3.5' /> New User</Button>
        <Button type='button' size='sm' disabled={!dirtyRoles} onClick={() => saveRoles()}>Save Changes</Button>
      </div>
    </div>
  );
}
