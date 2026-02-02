export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export interface UserPreferences {
  id: string;
  userId: string;
  productListNameLocale: "name_en" | "name_pl" | "name_de";
  productListCatalogFilter: string;
  productListCurrencyCode: string | null;
  productListPageSize: number;
  productListThumbnailSource: "file" | "link" | "base64";
  aiPathsActivePathId: string | null;
  aiPathsExpandedGroups: string[];
  aiPathsPaletteCollapsed: boolean;
  aiPathsPathIndex: JsonValue | null;
  aiPathsPathConfigs: JsonValue | null;
  adminMenuCollapsed: boolean;
  cmsLastPageId: string | null;
  cmsActiveDomainId: string | null;
  cmsThemeOpenSections: string[];
  cmsThemeLogoWidth: number | null;
  cmsThemeLogoUrl: string | null;
  cmsPreviewEnabled: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export type UserPreferencesUpdate = Partial<Omit<UserPreferences, "id" | "userId" | "createdAt" | "updatedAt">>;
