// export type AuthDbProvider = "mongodb";

export type AuthUserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: string | null;
  // provider: AuthDbProvider;
  provider: string; // fallback
};

export type AuthUserAccess = {
  id: string;
  userId: string;
  permissions: string[];
  roles: string[];
  lastLogin?: Date;
};

// export type AuthSecurityProfile = {
//   id: string;
//   userId: string;
//   twoFactorEnabled: boolean;
//   securityQuestions: boolean;
//   lastPasswordChange: Date;
// };

export type AuthUserPageSettings = {
  defaultPage: string;
  allowedPages: string[];
};

export type AuthSecurityPolicy = {
  passwordMinLength: number;
  requireSpecialChar: boolean;
  requireNumber: boolean;
  lockoutThreshold: number;
  lockoutDuration: number;
};

export type AuthPermission = {
  action: string;
  resource: string;
};

export type AuthRole = {
  name: string;
  permissions: AuthPermission[];
};

export type AuthUserRoleMap = Record<string, string>;
