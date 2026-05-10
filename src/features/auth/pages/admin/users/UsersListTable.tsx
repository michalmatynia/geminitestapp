import { type ColumnDef } from '@tanstack/react-table';
import type { Dispatch, JSX, SetStateAction } from 'react';

import { ActionMenu, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AuthUser as AuthUserSummary, AuthUserRoleMap } from '@/shared/contracts/auth';

type UsersListColumnsArgs = {
  localUserRoles: AuthUserRoleMap;
  handleRoleChange: (userId: string, roleId: string) => void;
  roleOptions: LabeledOptionDto<string>[];
  setEditingUser: Dispatch<SetStateAction<AuthUserSummary | null>>;
  setUserToDelete: Dispatch<SetStateAction<AuthUserSummary | null>>;
};

const buildUserColumn = (): ColumnDef<AuthUserSummary> => ({
  accessorKey: 'name',
  header: 'User',
  cell: ({ row }) => {
    const user = row.original;
    const normalizedUserName = typeof user.name === 'string' ? user.name.trim() : '';
    const userLabel = normalizedUserName.length > 0 ? normalizedUserName : 'Unnamed User';
    return (
      <div className='flex flex-col'>
        <span className='font-medium text-gray-200'>{userLabel}</span>
        <span className='text-[10px] text-gray-500 font-mono'>{user.id}</span>
      </div>
    );
  },
});

const buildEmailColumn = (): ColumnDef<AuthUserSummary> => ({
  accessorKey: 'email',
  header: 'Email',
  cell: ({ row }) => <span className='text-xs text-gray-400'>{row.original.email}</span>,
});

const buildVerifiedColumn = (): ColumnDef<AuthUserSummary> => ({
  accessorKey: 'emailVerified',
  header: 'Verified',
  cell: ({ row }) => {
    const hasVerifiedAt = typeof row.original.emailVerified === 'string' && row.original.emailVerified.length > 0;
    return (
      <StatusBadge
        status={hasVerifiedAt ? 'Verified' : 'Pending'}
        variant={hasVerifiedAt ? 'success' : 'warning'}
        className='text-[9px]'
      />
    );
  },
});

const buildRoleColumn = ({
  handleRoleChange,
  localUserRoles,
  roleOptions,
}: Pick<UsersListColumnsArgs, 'handleRoleChange' | 'localUserRoles' | 'roleOptions'>): ColumnDef<AuthUserSummary> => ({
  id: 'role',
  header: 'Access Role',
  cell: ({ row }) => {
    const user = row.original;
    return (
      <SelectSimple
        size='xs'
        value={localUserRoles[user.id] ?? 'none'}
        onValueChange={(val) => handleRoleChange(user.id, val)}
        options={roleOptions}
        className='h-7 w-32 text-[10px]'
        ariaLabel='Select role'
        title='Select role'
      />
    );
  },
});

const buildActionsColumn = ({
  setEditingUser,
  setUserToDelete,
}: Pick<UsersListColumnsArgs, 'setEditingUser' | 'setUserToDelete'>): ColumnDef<AuthUserSummary> => ({
  id: 'actions',
  header: () => <div className='text-right'>Tools</div>,
  cell: ({ row }) => {
    const user = row.original;
    return (
      <div className='flex justify-end'>
        <ActionMenu ariaLabel='User actions'>
          <DropdownMenuItem onSelect={() => setEditingUser(user)}>Edit Identity</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className='text-rose-400' onSelect={() => setUserToDelete(user)}>
            Destroy Record
          </DropdownMenuItem>
        </ActionMenu>
      </div>
    );
  },
});

const buildUsersListColumns = (args: UsersListColumnsArgs): ColumnDef<AuthUserSummary>[] => [
  buildUserColumn(),
  buildEmailColumn(),
  buildVerifiedColumn(),
  buildRoleColumn(args),
  buildActionsColumn(args),
];

export function UsersListTable({
  users,
  isLoading,
  localUserRoles,
  handleRoleChange,
  roleOptions,
  setEditingUser,
  setUserToDelete,
}: {
  users: AuthUserSummary[];
  isLoading: boolean;
  localUserRoles: AuthUserRoleMap;
  handleRoleChange: (userId: string, roleId: string) => void;
  roleOptions: LabeledOptionDto<string>[];
  setEditingUser: Dispatch<SetStateAction<AuthUserSummary | null>>;
  setUserToDelete: Dispatch<SetStateAction<AuthUserSummary | null>>;
}): JSX.Element {
  const columns = buildUsersListColumns({
    localUserRoles,
    handleRoleChange,
    roleOptions,
    setEditingUser,
    setUserToDelete,
  });
  return <StandardDataTablePanel columns={columns} data={users} isLoading={isLoading} variant='default' />;
}
