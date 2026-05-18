import { UserPlusIcon, Key } from 'lucide-react';

import type { UsersDialogs, UsersRoles, UsersSearch } from '@/features/auth/context/UsersContext';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { Button } from '@/shared/ui/button';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';

interface UsersPageToolbarProps {
  search: UsersSearch['search'];
  setSearch: UsersSearch['setSearch'];
  setMockOpen: UsersDialogs['setMockOpen'];
  setCreateOpen: UsersDialogs['setCreateOpen'];
  dirtyRoles: UsersRoles['dirtyRoles'];
  saveRoles: UsersRoles['saveRoles'];
}

export function UsersPageToolbar({
  search,
  setSearch,
  setMockOpen,
  setCreateOpen,
  dirtyRoles,
  saveRoles,
}: UsersPageToolbarProps): React.JSX.Element {
  return (
    <div className='flex items-center justify-between gap-4 py-4'>
      <div className='flex-1 max-w-sm'>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} placeholder='Search users...' size='sm' />
      </div>
      <div className='flex items-center gap-2'>
        {dirtyRoles && <StatusBadge status='Unsaved Permission Changes' variant='warning' className='py-1' />}
        <Button type='button' variant='outline' size='sm' onClick={() => setMockOpen(true)}><Key className='mr-1 size-3.5' /> Mock Sign-in</Button>
        <Button type='button' variant='outline' size='sm' onClick={() => setCreateOpen(true)}><UserPlusIcon className='mr-1 size-3.5' /> New User</Button>
        <Button type='button' size='sm' disabled={!dirtyRoles} onClick={() => { void saveRoles(); }}>Save Changes</Button>
      </div>
    </div>
  );
}
