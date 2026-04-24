import { ConfirmModal } from '@/shared/ui/templates/modals';
import { MockSignInModal } from '../../../components/admin/MockSignInModal';
import { UserCreateModal } from '../../../components/admin/UserCreateModal';
import { UserEditModal } from '../../../components/admin/UserEditModal';

export function UsersDialogsContainer({ userToDelete, setUserToDelete, deleteUser }: any) {
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
