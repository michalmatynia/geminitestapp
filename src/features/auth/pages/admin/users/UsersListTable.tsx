import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { SelectSimple, ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives.public';
import type { ColumnDef } from '@tanstack/react-table';
import type { AuthUser as AuthUserSummary } from '@/shared/contracts/auth';

export function UsersListTable({ users, isLoading, localUserRoles, handleRoleChange, roleOptions, setEditingUser, setUserToDelete }: any) {
  const columns = [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }: any) => (
        <div className='flex flex-col'>
          <span className='font-medium text-gray-200'>{row.original.name || 'Unnamed User'}</span>
          <span className='text-[10px] text-gray-500 font-mono'>{row.original.id}</span>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }: any) => <span className='text-xs text-gray-400'>{row.original.email}</span>,
    },
    {
      accessorKey: 'emailVerified',
      header: 'Verified',
      cell: ({ row }: any) => (
        <StatusBadge
          status={row.original.emailVerified ? 'Verified' : 'Pending'}
          variant={row.original.emailVerified ? 'success' : 'warning'}
          className='text-[9px]'
        />
      ),
    },
    {
      id: 'role',
      header: 'Access Role',
      cell: ({ row }: any) => (
        <SelectSimple
          size='xs'
          value={localUserRoles[row.original.id] ?? 'none'}
          onValueChange={(val) => handleRoleChange(row.original.id, val)}
          options={roleOptions}
          className='h-7 w-32 text-[10px]'
          ariaLabel='Select role' title='Select role'
        />
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Tools</div>,
      cell: ({ row }: any) => (
        <div className='flex justify-end'>
          <ActionMenu ariaLabel='User actions'>
            <DropdownMenuItem onSelect={() => setEditingUser(row.original)}>Edit Identity</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className='text-rose-400' onSelect={() => setUserToDelete(row.original)}>Destroy Record</DropdownMenuItem>
          </ActionMenu>
        </div>
      ),
    },
  ];

  return <StandardDataTablePanel columns={columns} data={users} isLoading={isLoading} variant='default' />;
}
