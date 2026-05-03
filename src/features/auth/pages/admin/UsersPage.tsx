'use client';

import { Users } from 'lucide-react';
import { PageLayout, EmptyState } from '@/shared/ui/navigation-and-layout.public';
import { UsersProvider } from '../../context/UsersContext';
import { useUsersController } from './users/useUsersController';
import { UsersListTable } from './users/UsersListTable';
import { UsersPageToolbar } from './users/UsersPageToolbar';
import { UsersDialogsContainer } from './users/UsersDialogsContainer';

export default function AuthUsersPage(): React.JSX.Element {
  return (
    <UsersProvider>
      <AuthUsersPageContent />
    </UsersProvider>
  );
}

function AuthUsersPageContent(): React.JSX.Element {
  const ctrl = useUsersController();

  if (!ctrl.canReadUsers) {
    return (
      <div className='page-section-tall'>
        <EmptyState title='Access Restricted' description='You do not have permission to view this console.' />
      </div>
    );
  }

  return (
    <PageLayout
      title='Identity Management'
      description={`Active directory console using ${ctrl.provider} provider.`}
      icon={<Users className='size-4' />}
      refresh={{ onRefresh: ctrl.refetch, isRefreshing: ctrl.isFetching }}
      containerClassName='mx-auto w-full max-w-none py-10'
    >
      <UsersPageToolbar 
        search={ctrl.search} 
        setSearch={ctrl.setSearch} 
        setMockOpen={ctrl.setMockOpen} 
        setCreateOpen={ctrl.setCreateOpen} 
        dirtyRoles={ctrl.dirtyRoles} 
        saveRoles={ctrl.saveRoles} 
      />

      <UsersListTable 
        users={ctrl.filteredUsers} 
        isLoading={ctrl.isLoading} 
        localUserRoles={ctrl.localUserRoles} 
        handleRoleChange={ctrl.handleRoleChange} 
        roleOptions={ctrl.roleOptions} 
        setEditingUser={ctrl.setEditingUser} 
        setUserToDelete={ctrl.setUserToDelete}
      />

      <UsersDialogsContainer 
        userToDelete={ctrl.userToDelete} 
        setUserToDelete={ctrl.setUserToDelete} 
        deleteUser={ctrl.deleteUser} 
      />
    </PageLayout>
  );
}
