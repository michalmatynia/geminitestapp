'use client';

import { useCallback, useMemo } from 'react';
import { useToast } from '@/shared/ui/primitives.public';
import type { AuthPermission, AuthRole } from '@/features/auth/utils/auth-management';

const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

interface HandlersParams {
  permissions: AuthPermission[];
  setPermissions: React.Dispatch<React.SetStateAction<AuthPermission[]>>;
  roles: AuthRole[];
  setRoles: React.Dispatch<React.SetStateAction<AuthRole[]>>;
  setDirty: (dirty: boolean) => void;
}

interface HandlersResult {
  handleTogglePermission: (roleId: string, permissionId: string) => void;
  handleAddPermission: (id: string, name: string, description: string) => void;
  handleRemovePermission: (permissionId: string) => void;
}

export function usePermissionsHandlers(params: HandlersParams): HandlersResult {
  const { toast } = useToast();
  const { permissions, setPermissions, setRoles, setDirty } = params;
  const permissionIds = useMemo(() => new Set(permissions.map((p) => p.id)), [permissions]);

  const handleTogglePermission = useCallback((roleId: string, permissionId: string): void => {
    setRoles((prev) => prev.map((role) => {
      if (role.id !== roleId) return role;
      const has = role.permissions.includes(permissionId);
      const next = has ? role.permissions.filter((id) => id !== permissionId) : [...role.permissions, permissionId];
      return { ...role, permissions: next };
    }));
    setDirty(true);
  }, [setRoles, setDirty]);

  const handleAddPermission = useCallback((id: string, name: string, description: string): void => {
    const trimmedId = id.trim();
    const trimmedName = name.trim();
    const finalId = trimmedId !== '' ? trimmedId : slugify(name);
    if (finalId === '' || trimmedName === '') { toast('Provide name and ID.', { variant: 'error' }); return; }
    if (permissionIds.has(finalId)) { toast('Permission ID exists.', { variant: 'error' }); return; }

    setPermissions((prev) => [...prev, { id: finalId, name: trimmedName, ...(description.trim() !== '' ? { description: description.trim() } : {}) }]);
    setDirty(true);
  }, [permissionIds, setPermissions, setDirty, toast]);

  const handleRemovePermission = useCallback((permissionId: string): void => {
    setPermissions((prev) => prev.filter((p) => p.id !== permissionId));
    setRoles((prev) => prev.map((r) => ({ ...r, permissions: r.permissions.filter((id) => id !== permissionId) })));
    setDirty(true);
  }, [setPermissions, setRoles, setDirty]);

  return { handleTogglePermission, handleAddPermission, handleRemovePermission };
}
