import { useMemo } from 'react';
import { useUsersData, useUsersDialogs, useUsersRoles, useUsersSearch } from '../../../context/UsersContext';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AuthRole } from '@/features/auth/utils/auth-management';

const ROLE_PLACEHOLDER_OPTION: LabeledOptionDto<string> = { value: 'none', label: 'Unassigned' };

export function useUsersController(): {
  roleOptions: LabeledOptionDto<string>[];
  [key: string]: Record<string, unknown>;
} {
  const data = useUsersData();
  const search = useUsersSearch();
  const roles = useUsersRoles();
  const dialogs = useUsersDialogs();

  const roleOptions = useMemo((): Array<LabeledOptionDto<string>> => [
      ROLE_PLACEHOLDER_OPTION,
      ...data.roles.map((role: AuthRole) => ({ value: role.id, label: role.name })),
  ], [data.roles]);

  return {
    ...data,
    ...search,
    ...roles,
    ...dialogs,
    roleOptions
  };
}
