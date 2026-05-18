import type { UsersDialogs } from '@/features/auth/context/UsersContext';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { MockSignInModal } from '@/features/auth/components/admin/MockSignInModal';
import { UserCreateModal } from '@/features/auth/components/admin/UserCreateModal';
import { UserEditModal } from '@/features/auth/components/admin/UserEditModal';

interface UsersDialogsContainerProps {
  userToDelete: UsersDialogs['userToDelete'];
  setUserToDelete: UsersDialogs['setUserToDelete'];
  deleteUser: UsersDialogs['deleteUser'];
}

export function UsersDialogsContainer({
  userToDelete,
  setUserToDelete,
  deleteUser,
}: UsersDialogsContainerProps): React.JSX.Element {
  return (
    <>
      <UserEditModal />
      <UserCreateModal />
      <MockSignInModal />
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        title='Permanently Delete User?'
        message={`This will terminate all active sessions for ${userToDelete?.email} and remove their identity record. This action is irreversible.`}
        confirmText='Destroy Record'
        isDangerous={true}
        onConfirm={deleteUser}
      />
    </>
  );
}
