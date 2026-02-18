'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_PERMISSIONS,
  DEFAULT_AUTH_ROLES,
  type AuthPermission,
  type AuthRole,
} from '@/features/auth/utils/auth-management';
import { logClientError } from '@/features/observability';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  useToast,
  SectionHeader,
  LoadingState,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function AuthPermissionsPage(): React.JSX.Element {
  const {
    roles: contextRoles,
    permissionsLibrary: contextPermissions,
    isLoading,
    refetchSettings,
  } = useAuth();

  if (isLoading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <LoadingState message='Loading permission settings...' />
      </div>
    );
  }

  return (
    <AuthPermissionsForm
      initialPermissions={contextPermissions}
      initialRoles={contextRoles}
      refetchSettings={refetchSettings}
    />
  );
}

function AuthPermissionsForm({
  initialPermissions,
  initialRoles,
  refetchSettings,
}: {
  initialPermissions: AuthPermission[];
  initialRoles: AuthRole[];
  refetchSettings: () => Promise<unknown>;
}): React.JSX.Element {
  const { toast } = useToast();
  const [dirty, setDirty] = useState(false);
  const [permissions, setPermissions] = useState<AuthPermission[]>(initialPermissions);
  const [roles, setRoles] = useState<AuthRole[]>(initialRoles);
  const saveSettingsMutation = useUpdateSettingsBulk();

  useEffect(() => {
    setPermissions(initialPermissions);
    setRoles(initialRoles);
    setDirty(false);
  }, [initialPermissions, initialRoles]);

  const [newPermissionId, setNewPermissionId] = useState('');
  const [newPermissionName, setNewPermissionName] = useState('');
  const [newPermissionDescription, setNewPermissionDescription] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  const permissionIds = useMemo(
    () => new Set(permissions.map((permission: AuthPermission) => permission.id)),
    [permissions]
  );

  const handleTogglePermission = (roleId: string, permissionId: string): void => {
    setRoles((prev: AuthRole[]) =>
      prev.map((role: AuthRole) => {
        if (role.id !== roleId) return role;
        const hasPermission = role.permissions.includes(permissionId);
        const nextPermissions = hasPermission
          ? role.permissions.filter((id: string) => id !== permissionId)
          : [...role.permissions, permissionId];
        return { ...role, permissions: nextPermissions };
      })
    );
    setDirty(true);
  };

  const handleAddPermission = (): void => {
    const id = newPermissionId.trim() || slugify(newPermissionName);
    if (!id || !newPermissionName.trim()) {
      toast('Provide a permission name', { variant: 'error' });
      return;
    }
    if (permissionIds.has(id)) {
      toast('Permission ID already exists', { variant: 'error' });
      return;
    }
    setPermissions((prev: AuthPermission[]) => [
      ...prev,
      {
        id,
        name: newPermissionName.trim(),
        ...(newPermissionDescription.trim() ? { description: newPermissionDescription.trim() } : {}),
      },
    ]);
    setNewPermissionId('');
    setNewPermissionName('');
    setNewPermissionDescription('');
    setDirty(true);
  };

  const handleRemovePermission = (permissionId: string): void => {
    setPermissions((prev: AuthPermission[]) =>
      prev.filter((permission: AuthPermission) => permission.id !== permissionId)
    );
    setRoles((prev: AuthRole[]) =>
      prev.map((role: AuthRole) => ({
        ...role,
        permissions: role.permissions.filter((id: string) => id !== permissionId),
      }))
    );
    setDirty(true);
  };

  const handleAddRole = (): void => {
    const id = slugify(newRoleName);
    if (!id || !newRoleName.trim()) {
      toast('Provide a role name', { variant: 'error' });
      return;
    }
    if (roles.some((role: AuthRole) => role.id === id)) {
      toast('Role ID already exists', { variant: 'error' });
      return;
    }
    setRoles((prev: AuthRole[]) => [
      ...prev,
      {
        id,
        name: newRoleName.trim(),
        ...(newRoleDescription.trim() ? { description: newRoleDescription.trim() } : {}),
        permissions: [],
        deniedPermissions: [],
        level: 10,
      },
    ]);
    setNewRoleName('');
    setNewRoleDescription('');
    setDirty(true);
  };

  const handleRemoveRole = (roleId: string): void => {
    if (roleId === 'admin') {
      toast('Admin role cannot be removed', { variant: 'error' });
      return;
    }
    setRoles((prev: AuthRole[]) => prev.filter((role: AuthRole) => role.id !== roleId));
    setDirty(true);
  };

  const handleRoleFieldChange = (
    roleId: string,
    field: 'name' | 'description' | 'level',
    value: string
  ): void => {
    setRoles((prev: AuthRole[]) =>
      prev.map((role: AuthRole) =>
        role.id === roleId
          ? {
            ...role,
            [field]:
              field === 'level'
                ? Number.isNaN(Number(value))
                  ? role.level ?? 0
                  : Number(value)
                : value,
          }
          : role
      )
    );
    setDirty(true);
  };

  const handleSave = async (): Promise<void> => {
    try {
      await saveSettingsMutation.mutateAsync([
        {
          key: AUTH_SETTINGS_KEYS.permissions,
          value: serializeSetting(permissions),
        },
        {
          key: AUTH_SETTINGS_KEYS.roles,
          value: serializeSetting(roles),
        },
      ]);
      setDirty(false);
      await refetchSettings();
      toast('Permission settings saved', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AuthPermissionsPage', action: 'saveSettings' } });
      toast('Failed to save permission settings', { variant: 'error' });
    }
  };

  const handleReset = (): void => {
    setPermissions(DEFAULT_AUTH_PERMISSIONS);
    setRoles(DEFAULT_AUTH_ROLES);
    setDirty(true);
  };

  return (
    <div className='container mx-auto max-w-5xl py-10 space-y-6'>
      <Card variant='glass' padding='lg'>
        <SectionHeader
          title='Permissions'
          description='Define roles and the permissions they include. Enforcement is handled by the application logic you wire up later.'
        />
      </Card>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card className='bg-card border-border'>
          <CardHeader>
            <CardTitle className='text-white text-lg'>Permissions Library</CardTitle>
            <CardDescription className='text-gray-500'>
              Create permission keys that can be assigned to roles.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              {permissions.map((permission: AuthPermission) => (
                <div key={permission.id} className='rounded-md border border-border bg-card/40 p-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-semibold text-white'>{permission.name}</div>
                      <div className='text-xs text-gray-400'>{permission.id}</div>
                      {permission.description && (
                        <div className='text-xs text-gray-500 mt-1'>{permission.description}</div>
                      )}
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleRemovePermission(permission.id)}
                      className='text-xs text-red-200 hover:bg-red-500/10'
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className='rounded-md border border-border bg-card/40 p-4 space-y-3'>
              <div className='text-sm font-semibold text-white'>Add Permission</div>
              <div className='space-y-2'>
                <Label htmlFor='permission-name' className='text-xs text-gray-300'>
                  Name
                </Label>
                <Input
                  id='permission-name'
                  value={newPermissionName}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setNewPermissionName(event.target.value)
                  }
                  placeholder='Manage products'
                  className='bg-gray-900 border text-white'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='permission-id' className='text-xs text-gray-300'>
                  Permission ID
                </Label>
                <Input
                  id='permission-id'
                  value={newPermissionId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setNewPermissionId(event.target.value)
                  }
                  placeholder='products.manage'
                  className='bg-gray-900 border text-white'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='permission-description' className='text-xs text-gray-300'>
                  Description
                </Label>
                <Input
                  id='permission-description'
                  value={newPermissionDescription}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setNewPermissionDescription(event.target.value)
                  }
                  placeholder='Create and edit product listings'
                  className='bg-gray-900 border text-white'
                />
              </div>
              <Button
                onClick={handleAddPermission}
                variant='default'
              >
                Add Permission
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-card border-border'>
          <CardHeader>
            <CardTitle className='text-white text-lg'>Roles</CardTitle>
            <CardDescription className='text-gray-500'>
              Assign permission bundles to each role.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {roles.map((role: AuthRole) => (
              <div key={role.id} className='rounded-md border border-border bg-card/40 p-4 space-y-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='space-y-2 flex-1'>
                    <Label className='text-xs text-gray-400'>Role name</Label>
                    <Input
                      value={role.name}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleRoleFieldChange(role.id, 'name', event.target.value)
                      }
                      className='bg-gray-900 border text-white'
                    />
                    <Label className='text-xs text-gray-400'>Description</Label>
                    <Input
                      value={role.description ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleRoleFieldChange(role.id, 'description', event.target.value)
                      }
                      className='bg-gray-900 border text-white'
                    />
                    <Label className='text-xs text-gray-400'>Role level</Label>
                    <Input
                      type='number'
                      min={0}
                      max={100}
                      value={role.level ?? 0}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleRoleFieldChange(role.id, 'level', event.target.value)
                      }
                      className='bg-gray-900 border text-white'
                    />
                    <div className='text-xs text-gray-500'>
                      Levels ≥ 90 are treated as elevated access.
                    </div>
                    <div className='text-xs text-gray-500'>ID: {role.id}</div>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleRemoveRole(role.id)}
                    className='text-xs text-red-200 hover:bg-red-500/10'
                  >
                    Remove
                  </Button>
                </div>
                <div className='grid gap-2 sm:grid-cols-2'>
                  {permissions.map((permission: AuthPermission) => (
                    <Label
                      key={permission.id}
                      className='flex items-start gap-2 text-xs text-gray-300'
                    >
                      <Checkbox
                        checked={role.permissions.includes(permission.id)}
                        onCheckedChange={() => handleTogglePermission(role.id, permission.id)}
                      />
                      <span>
                        <span className='font-semibold text-gray-200'>{permission.name}</span>
                        <span className='block text-gray-500'>{permission.id}</span>
                      </span>
                    </Label>
                  ))}
                </div>
              </div>
            ))}

            <div className='rounded-md border border-border bg-card/40 p-4 space-y-3'>
              <div className='text-sm font-semibold text-white'>Add Role</div>
              <div className='space-y-2'>
                <Label htmlFor='role-name' className='text-xs text-gray-300'>
                  Role name
                </Label>
                <Input
                  id='role-name'
                  value={newRoleName}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setNewRoleName(event.target.value)
                  }
                  placeholder='Editor'
                  className='bg-gray-900 border text-white'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='role-description' className='text-xs text-gray-300'>
                  Description
                </Label>
                <Input
                  id='role-description'
                  value={newRoleDescription}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setNewRoleDescription(event.target.value)
                  }
                  placeholder='Manage content and products'
                  className='bg-gray-900 border text-white'
                />
              </div>
              <Button onClick={handleAddRole} className='bg-blue-600 hover:bg-blue-700 text-white'>
                Add Role
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='flex items-center justify-end gap-3'>
        <Button variant='outline' onClick={handleReset}>
          Reset defaults
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={!dirty || saveSettingsMutation.isPending}
        >
          {saveSettingsMutation.isPending ? 'Saving...' : 'Save permissions'}
        </Button>
      </div>
    </div>
  );
}