'use client';

import type { AuthPermission, AuthRole } from '@/features/auth/utils/auth-management';
import { usePermissionsState } from './usePermissionsState';
import { usePermissionsHandlers } from './usePermissionsHandlers';
import { useRolesHandlers } from './useRolesHandlers';
import { usePermissionsSave } from './usePermissionsSave';

interface PermissionsControllerReturn {
  permissions: AuthPermission[];
  roles: AuthRole[];
  dirty: boolean;
  handleTogglePermission: (roleId: string, permissionId: string) => void;
  handleAddPermission: (id: string, name: string, description: string) => void;
  handleRemovePermission: (permissionId: string) => void;
  handleAddRole: (name: string, description: string) => void;
  handleRemoveRole: (roleId: string) => void;
  handleRoleFieldChange: (roleId: string, field: 'name' | 'description' | 'level', value: string) => void;
  handleSave: () => Promise<void>;
  isSaving: boolean;
}

export function usePermissionsController(
  initialPermissions: AuthPermission[],
  initialRoles: AuthRole[],
  refetchSettings: () => Promise<unknown>
): PermissionsControllerReturn {
  const state = usePermissionsState(initialPermissions, initialRoles);
  
  const pHandlers = usePermissionsHandlers({
    permissions: state.permissions, setPermissions: state.setPermissions,
    roles: state.roles, setRoles: state.setRoles, setDirty: state.setDirty,
  });

  const rHandlers = useRolesHandlers({
    roles: state.roles, setRoles: state.setRoles, setDirty: state.setDirty,
  });

  const save = usePermissionsSave({
    permissions: state.permissions, roles: state.roles,
    setDirty: state.setDirty, refetchSettings,
  });

  return {
    ...state,
    ...pHandlers,
    ...rHandlers,
    ...save,
  };
}
