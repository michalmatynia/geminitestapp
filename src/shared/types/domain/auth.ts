import type { 
  AuthUserDto, 
  AuthUserAccessDto, 
  AuthUserAccessDetailDto,
  AuthSecurityProfileDto,
  AuthPermissionDto,
  AuthRoleDto,
  AuthSecurityPolicyDto,
  AuthUserPageSettingsDto,
} from '../../contracts/auth';

export type AuthUser = AuthUserDto;

export type AuthUserAccess = AuthUserAccessDto;

export type AuthUserAccessDetail = AuthUserAccessDetailDto;

export type AuthSecurityProfile = Omit<AuthSecurityProfileDto, 'disabledAt' | 'bannedAt' | 'createdAt' | 'updatedAt'> & {
  disabledAt: Date | null;
  bannedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthPermission = AuthPermissionDto;

export type AuthRole = AuthRoleDto;

export type AuthSecurityPolicy = AuthSecurityPolicyDto;

export type AuthUserPageSettings = AuthUserPageSettingsDto;
