'use client';

import { useAuth } from '@/features/auth/context/AuthContext';
import { Button } from '@/shared/ui/primitives.public';
import { SectionHeader, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { usePermissionsController } from './permissions/usePermissionsController';
import { PermissionsLibrary } from './permissions/PermissionsLibrary';
import { AddPermissionForm } from './permissions/AddPermissionForm';
import { RoleEditor } from './permissions/RoleEditor';
import { AddRoleForm } from './permissions/AddRoleForm';

export default function AuthPermissionsPage(): React.JSX.Element {
  const { roles: contextRoles, permissionsLibrary: contextPermissions, isLoading, refetchSettings } = useAuth();

  const {
    permissions, roles, dirty, handleTogglePermission, handleAddPermission,
    handleRemovePermission, handleAddRole, handleRemoveRole, handleRoleFieldChange, handleSave, isSaving
  } = usePermissionsController(contextPermissions, contextRoles, refetchSettings);

  if (isLoading) return <div className='flex min-h-[400px] items-center justify-center'><LoadingState message='Loading permission settings...' /></div>;

  return (
    <div className='page-section max-w-5xl space-y-6'>
      <div className='bg-card/50 p-6 rounded-xl border border-border'>
        <SectionHeader title='Permissions' description='Define roles and the permissions they include.' />
      </div>

      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
        <div className='space-y-4'>
          <PermissionsLibrary permissions={permissions} onRemove={handleRemovePermission} />
          <AddPermissionForm onAdd={handleAddPermission} />
        </div>
        <div className='space-y-4'>
          <RoleEditor roles={roles} permissions={permissions} onRemove={handleRemoveRole} onFieldChange={handleRoleFieldChange} onTogglePermission={handleTogglePermission} />
          <AddRoleForm onAdd={handleAddRole} />
        </div>
      </div>

      <div className='flex items-center justify-end gap-3 pt-6'>
        <Button size='sm' onClick={() => void handleSave()} disabled={!dirty || isSaving} loading={isSaving}>Save permissions</Button>
      </div>
    </div>
  );
}
