import type { AuthPermissionDto, AuthRoleDto } from '@/shared/contracts/auth';

export type AuthPermission = AuthPermissionDto;

export type AuthRole = AuthRoleDto;

export type AuthUserRoleMap = Record<string, string>;

export const AUTH_SETTINGS_KEYS = {
  roles: 'auth_roles',
  permissions: 'auth_permissions',
  userRoles: 'auth_user_roles',
  userPages: 'auth_user_pages',
  defaultRole: 'auth_default_role',
  securityPolicy: 'auth_security_policy',
  provider: 'auth_db_provider',
} as const;

export const DEFAULT_AUTH_PERMISSIONS: AuthPermission[] = [
  {
    id: 'auth.users.read',
    name: 'View users',
    description: 'View user list and profile details.',
  },
  {
    id: 'auth.users.write',
    name: 'Manage users',
    description: 'Create, update, and manage user accounts.',
  },
  {
    id: 'products.manage',
    name: 'Manage products',
    description: 'Create, edit, and publish products.',
  },
  {
    id: 'notes.manage',
    name: 'Manage notes',
    description: 'Create, edit, and organize notes.',
  },
  {
    id: 'chatbot.manage',
    name: 'Manage chatbot',
    description: 'Manage chatbot sessions, jobs, and settings.',
  },
  {
    id: 'ai_paths.manage',
    name: 'Manage AI paths',
    description: 'Configure and run AI Paths automation flows.',
  },
  {
    id: 'settings.manage',
    name: 'Manage settings',
    description: 'Change platform configuration and integrations.',
  },
];

export const DEFAULT_AUTH_ROLES: AuthRole[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full access to everything.',
    permissions: DEFAULT_AUTH_PERMISSIONS.map((permission: AuthPermission) => permission.id),
    deniedPermissions: [],
    level: 100,
  },
  {
    id: 'superuser',
    name: 'Super User',
    description: 'Full access including system-level settings.',
    permissions: DEFAULT_AUTH_PERMISSIONS.map((permission: AuthPermission) => permission.id),
    deniedPermissions: [],
    level: 95,
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full access to all apps and settings.',
    permissions: DEFAULT_AUTH_PERMISSIONS.map((permission: AuthPermission) => permission.id),
    deniedPermissions: [],
    level: 90,
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Manage products, notes, and chatbot.',
    permissions: [
      'auth.users.read',
      'products.manage',
      'notes.manage',
      'chatbot.manage',
      'ai_paths.manage',
    ],
    deniedPermissions: [],
    level: 60,
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to user directory.',
    permissions: ['auth.users.read'],
    deniedPermissions: [],
    level: 10,
  },
];

export const mergeDefaultRoles = (roles: AuthRole[] | null | undefined): AuthRole[] => {
  const incoming = Array.isArray(roles) ? roles : [];
  const defaults = new Map<string, AuthRole>(DEFAULT_AUTH_ROLES.map((role: AuthRole) => [role.id, role]));
  const merged = incoming.map((role: AuthRole) => {
    const fallback = defaults.get(role.id);
    if (!fallback) return role;
    const level = typeof role.level === 'number' ? role.level : fallback.level;
    return {
      ...fallback,
      ...role,
      permissions: Array.isArray(role.permissions) ? role.permissions : fallback.permissions,
      deniedPermissions: Array.isArray(role.deniedPermissions)
        ? role.deniedPermissions
        : fallback.deniedPermissions ?? [],
      ...(typeof level === 'number' ? { level } : {}),
    };
  });

  const known = new Set(merged.map((role: AuthRole) => role.id));
  for (const role of DEFAULT_AUTH_ROLES) {
    if (!known.has(role.id)) {
      merged.push(role);
    }
  }
  return merged;
};

export const ROLE_ELEVATION_THRESHOLD = 90;
