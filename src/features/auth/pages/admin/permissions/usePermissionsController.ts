import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/shared/ui/primitives.public';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';
import { AUTH_SETTINGS_KEYS, type AuthPermission, type AuthRole } from '@/features/auth/utils/auth-management';

const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function usePermissionsController(
  initialPermissions: AuthPermission[],
  initialRoles: AuthRole[],
  refetchSettings: () => Promise<unknown>
) {
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

  const permissionIds = useMemo(() => new Set(permissions.map((p) => p.id)), [permissions]);

  const handleTogglePermission = (roleId: string, permissionId: string) => {
    setRoles((prev) => prev.map((role) => {
      if (role.id !== roleId) return role;
      const hasPermission = role.permissions.includes(permissionId);
      const nextPermissions = hasPermission
        ? role.permissions.filter((id) => id !== permissionId)
        : [...role.permissions, permissionId];
      return { ...role, permissions: nextPermissions };
    }));
    setDirty(true);
  };

  const handleAddPermission = (id: string, name: string, description: string) => {
    const finalId = id.trim() || slugify(name);
    if (!finalId || !name.trim()) { toast('Provide name', { variant: 'error' }); return; }
    if (permissionIds.has(finalId)) { toast('ID exists', { variant: 'error' }); return; }

    setPermissions((prev) => [...prev, { id: finalId, name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}) }]);
    setDirty(true);
  };

  const handleRemovePermission = (permissionId: string) => {
    setPermissions((prev) => prev.filter((p) => p.id !== permissionId));
    setRoles((prev) => prev.map((r) => ({ ...r, permissions: r.permissions.filter((id) => id !== permissionId) })));
    setDirty(true);
  };

  const handleAddRole = (name: string, description: string) => {
    const id = slugify(name);
    if (!id || !name.trim()) { toast('Provide name', { variant: 'error' }); return; }
    if (roles.some((r) => r.id === id)) { toast('Role exists', { variant: 'error' }); return; }

    setRoles((prev) => [...prev, { id, name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}), permissions: [], deniedPermissions: [], level: 10 }]);
    setDirty(true);
  };

  const handleRemoveRole = (roleId: string) => {
    if (roleId === 'admin') { toast('Cannot remove admin', { variant: 'error' }); return; }
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    setDirty(true);
  };

  const handleRoleFieldChange = (roleId: string, field: 'name' | 'description' | 'level', value: string) => {
    setRoles((prev) => prev.map((r) => r.id === roleId ? { ...r, [field]: field === 'level' ? (Number.isNaN(Number(value)) ? (r.level ?? 0) : Number(value)) : value } : r));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await saveSettingsMutation.mutateAsync([{ key: AUTH_SETTINGS_KEYS.permissions, value: serializeSetting(permissions) }, { key: AUTH_SETTINGS_KEYS.roles, value: serializeSetting(roles) }]);
      setDirty(false);
      await refetchSettings();
      toast('Saved', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'AuthPermissionsPage', action: 'saveSettings' });
      toast('Failed to save', { variant: 'error' });
    }
  };

  return { permissions, roles, dirty, handleTogglePermission, handleAddPermission, handleRemovePermission, handleAddRole, handleRemoveRole, handleRoleFieldChange, handleSave, isSaving: saveSettingsMutation.isPending };
}
