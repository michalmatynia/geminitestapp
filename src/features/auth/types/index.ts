// DTO type exports
export type {
  AuthUserDto as AuthUserSummary,
  AuthUserAccessDto as AuthUserAccess,
  AuthUserPageSettingsDto as AuthUserPageSettings,
  AuthSecurityPolicyDto as AuthSecurityPolicy,
  AuthPermissionDto as AuthPermission,
  AuthRoleDto as AuthRole,
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  RegisterDto
} from '@/shared/contracts/auth';

export type AuthUserRoleMap = Record<string, string>;
