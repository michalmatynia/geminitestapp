export type AuthPermission = {
  id: string;
  name: string;
  description?: string;
};

export type AuthRole = {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
};

export type AuthUserRoleMap = Record<string, string>;

export const AUTH_SETTINGS_KEYS = {
  roles: "auth_roles",
  permissions: "auth_permissions",
  userRoles: "auth_user_roles",
  userPages: "auth_user_pages",
} as const;

export const DEFAULT_AUTH_PERMISSIONS: AuthPermission[] = [
  {
    id: "auth.users.read",
    name: "View users",
    description: "View user list and profile details.",
  },
  {
    id: "auth.users.write",
    name: "Manage users",
    description: "Create, update, and manage user accounts.",
  },
  {
    id: "products.manage",
    name: "Manage products",
    description: "Create, edit, and publish products.",
  },
  {
    id: "notes.manage",
    name: "Manage notes",
    description: "Create, edit, and organize notes.",
  },
  {
    id: "chatbot.manage",
    name: "Manage chatbot",
    description: "Manage chatbot sessions, jobs, and settings.",
  },
  {
    id: "settings.manage",
    name: "Manage settings",
    description: "Change platform configuration and integrations.",
  },
];

export const DEFAULT_AUTH_ROLES: AuthRole[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to all apps and settings.",
    permissions: DEFAULT_AUTH_PERMISSIONS.map((permission) => permission.id),
  },
  {
    id: "manager",
    name: "Manager",
    description: "Manage products, notes, and chatbot.",
    permissions: [
      "auth.users.read",
      "products.manage",
      "notes.manage",
      "chatbot.manage",
    ],
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to user directory.",
    permissions: ["auth.users.read"],
  },
];

export const parseJsonSetting = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const serializeSetting = (value: unknown) => JSON.stringify(value ?? null);
