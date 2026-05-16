'use client';

import { useState, useEffect } from 'react';
import type { AuthPermission, AuthRole } from '@/features/auth/utils/auth-management';

interface PermissionsState {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  permissions: AuthPermission[];
  setPermissions: React.Dispatch<React.SetStateAction<AuthPermission[]>>;
  roles: AuthRole[];
  setRoles: React.Dispatch<React.SetStateAction<AuthRole[]>>;
}

export function usePermissionsState(
  initialPermissions: AuthPermission[],
  initialRoles: AuthRole[]
): PermissionsState {
  const [dirty, setDirty] = useState(false);
  const [permissions, setPermissions] = useState<AuthPermission[]>(initialPermissions);
  const [roles, setRoles] = useState<AuthRole[]>(initialRoles);

  useEffect(() => {
    setPermissions(initialPermissions);
    setRoles(initialRoles);
    setDirty(false);
  }, [initialPermissions, initialRoles]);

  return {
    dirty, setDirty,
    permissions, setPermissions,
    roles, setRoles,
  };
}
