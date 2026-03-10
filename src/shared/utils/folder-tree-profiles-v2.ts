import { defaultFolderTreeProfilesV2 } from './folder-tree-profiles-v2/defaults';
import * as logic from './folder-tree-profiles-v2/logic';
import { FolderTreeProfilesV2Map } from './folder-tree-profiles-v2/types';

export * from './folder-tree-profiles-v2/types';
export * from './folder-tree-profiles-v2/constants';
export * from './folder-tree-profiles-v2/schema';
export { defaultFolderTreeProfilesV2 };

export const createDefaultFolderTreeProfilesV2 = (): FolderTreeProfilesV2Map =>
  logic.createDefaultFolderTreeProfilesV2(defaultFolderTreeProfilesV2);

export const getFolderTreePlaceholderClasses = logic.getFolderTreePlaceholderClasses;
export const cloneProfileV2 = logic.cloneProfileV2;
export const toCanonicalProfileV2 = logic.toCanonicalProfileV2;
export const parseFolderTreeProfileV2Strict = logic.parseFolderTreeProfileV2Strict;
export const canNestTreeNodeV2 = logic.canNestTreeNodeV2;
export const resolveFolderTreeIconV2 = logic.resolveFolderTreeIconV2;
export const getFolderTreeInstanceSettingsHref = logic.getFolderTreeInstanceSettingsHref;
export const resolveFolderTreeKeyboardConfig = logic.resolveFolderTreeKeyboardConfig;
export const resolveFolderTreeMultiSelectConfig = logic.resolveFolderTreeMultiSelectConfig;
export const resolveFolderTreeSearchConfig = logic.resolveFolderTreeSearchConfig;
export type { ResolvedFolderTreeKeyboardConfig } from './folder-tree-profiles-v2/logic';
export type { ResolvedFolderTreeMultiSelectConfig } from './folder-tree-profiles-v2/logic';
export type { ResolvedFolderTreeSearchConfig } from './folder-tree-profiles-v2/logic';
