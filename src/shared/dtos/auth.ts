import { DtoBase } from '../types/base';

export interface AuthUserDto extends DtoBase {
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: string | null;
  provider: string;
}

export interface AuthUserAccessDto extends DtoBase {
  userId: string;
  permissions: string[];
  roles: string[];
  lastLogin?: string;
}

export interface AuthUserPageSettingsDto {
  defaultPage: string;
  allowedPages: string[];
}

export interface AuthSecurityPolicyDto {
  passwordMinLength: number;
  requireSpecialChar: boolean;
  requireNumber: boolean;
  lockoutThreshold: number;
  lockoutDuration: number;
}

export interface AuthPermissionDto {
  action: string;
  resource: string;
}

export interface AuthRoleDto {
  name: string;
  permissions: AuthPermissionDto[];
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  image?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}
