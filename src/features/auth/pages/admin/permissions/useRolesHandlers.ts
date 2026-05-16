'use client';

import { useCallback } from 'react';
import { useToast } from '@/shared/ui/primitives.public';
import type { AuthRole } from '@/features/auth/utils/auth-management';

const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

interface RolesHandlersParams {
  roles: AuthRole[];
  setRoles: React.Dispatch<React.SetStateAction<AuthRole[]>>;
  setDirty: (dirty: boolean) => void;
}

interface RolesHandlersResult {
  handleAddRole: (name: string, description: string) => void;
  handleRemoveRole: (roleId: string) => void;
  handleRoleFieldChange: (roleId: string, field: 'name' | 'description' | 'level', value: string) => void;
}

export function useRolesHandlers(params: RolesHandlersParams): RolesHandlersResult {
  const { toast } = useToast();
  const { roles, setRoles, setDirty } = params;

  const handleAddRole = useCallback((name: string, description: string): void => {
    const id = slugify(name);
    const trimmedName = name.trim();
    if (id === '' || trimmedName === '') { toast('Provide valid name.', { variant: 'error' }); return; }
    if (roles.some((r) => r.id === id)) { toast('Role exists.', { variant: 'error' }); return; }

    setRoles((prev) => [...prev, { id, name: trimmedName, ...(description.trim() !== '' ? { description: description.trim() } : {}), permissions: [], deniedPermissions: [], level: 10 }]);
    setDirty(true);
  }, [roles, setRoles, setDirty, toast]);

  const handleRemoveRole = useCallback((roleId: string): void => {
    if (roleId === 'admin') { toast('Cannot remove admin.', { variant: 'error' }); return; }
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    setDirty(true);
  }, [setRoles, setDirty, toast]);

  const handleRoleFieldChange = useCallback((roleId: string, field: 'name' | 'description' | 'level', value: string): void => {
    setRoles((prev) => prev.map((r) => {
      if (r.id !== roleId) return r;
      if (field === 'level') {
        const num = Number(value);
        return { ...r, level: Number.isNaN(num) ? (r.level ?? 0) : num };
      }
      return { ...r, [field]: value };
    }));
    setDirty(true);
  }, [setRoles, setDirty]);

  return { handleAddRole, handleRemoveRole, handleRoleFieldChange };
}
