import { DtoBase, NamedDto } from '../types/base';

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

export interface AuthRoleDto extends NamedDto {
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

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export interface UserPreferencesDto extends DtoBase {
  userId: string;
  productListNameLocale: 'name_en' | 'name_pl' | 'name_de';
  productListCatalogFilter: string;
  productListCurrencyCode: string | null;
  productListPageSize: number;
  productListThumbnailSource: 'file' | 'link' | 'base64';
  productListDraftIconColorMode: 'theme' | 'custom';
  productListDraftIconColor: string | null;
  aiPathsActivePathId: string | null;
  aiPathsExpandedGroups: string[];
  aiPathsPaletteCollapsed: boolean;
  aiPathsPathIndex: JsonValue | null;
  aiPathsPathConfigs: JsonValue | null;
  adminMenuCollapsed: boolean;
  adminMenuFavorites: string[];
  adminMenuSectionColors: Record<string, string>;
  adminMenuCustomEnabled: boolean;
  adminMenuCustomNav: JsonValue | null;
  cmsLastPageId: string | null;
  cmsActiveDomainId: string | null;
  cmsThemeOpenSections: string[];
  cmsThemeLogoWidth: number | null;
  cmsThemeLogoUrl: string | null;
  cmsPreviewEnabled: boolean | null;
  cmsSlideshowPauseOnHoverInEditor: boolean | null;
}

export interface UpdateUserPreferencesDto {
  productListNameLocale?: 'name_en' | 'name_pl' | 'name_de';
  productListCatalogFilter?: string;
  productListCurrencyCode?: string | null;
  productListPageSize?: number;
  productListThumbnailSource?: 'file' | 'link' | 'base64';
  productListDraftIconColorMode?: 'theme' | 'custom';
  productListDraftIconColor?: string | null;
  aiPathsActivePathId?: string | null;
  aiPathsExpandedGroups?: string[];
  aiPathsPaletteCollapsed?: boolean;
  aiPathsPathIndex?: JsonValue | null;
  aiPathsPathConfigs?: JsonValue | null;
  adminMenuCollapsed?: boolean;
  adminMenuFavorites?: string[];
  adminMenuSectionColors?: Record<string, string>;
  adminMenuCustomEnabled?: boolean;
  adminMenuCustomNav?: JsonValue | null;
  cmsLastPageId?: string | null;
  cmsActiveDomainId?: string | null;
  cmsThemeOpenSections?: string[];
  cmsThemeLogoWidth?: number | null;
  cmsThemeLogoUrl?: string | null;
  cmsPreviewEnabled?: boolean | null;
  cmsSlideshowPauseOnHoverInEditor?: boolean | null;
}
