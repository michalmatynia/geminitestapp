'use client';

import { useMemo } from 'react';

import {
  FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
  getFolderTreeProfileV2Key,
  parseFolderTreeProfileV2Entry,
} from '@/shared/lib/foldertree/v2/settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  FOLDER_TREE_PROFILES_V2_SETTING_KEY,
  defaultFolderTreeProfilesV2,
  parseFolderTreeProfilesV2,
  type FolderTreeInstance,
  type FolderTreeProfileV2,
  type FolderTreeProfilesV2Map,
} from '@/shared/utils/folder-tree-profiles-v2';

export function useFolderTreeProfiles(): FolderTreeProfilesV2Map {
  const settingsStore = useSettingsStore();
  const migrationMarker = settingsStore.get(FOLDER_TREE_V2_MIGRATION_MARKER_KEY);
  const useLegacyFallback = !migrationMarker;
  const legacyRawProfiles = settingsStore.get(FOLDER_TREE_PROFILES_V2_SETTING_KEY);
  const legacyProfiles = useMemo(
    () => parseFolderTreeProfilesV2(legacyRawProfiles),
    [legacyRawProfiles]
  );

  const notesProfileRaw = settingsStore.get(getFolderTreeProfileV2Key('notes'));
  const imageStudioProfileRaw = settingsStore.get(getFolderTreeProfileV2Key('image_studio'));
  const productCategoriesProfileRaw = settingsStore.get(
    getFolderTreeProfileV2Key('product_categories')
  );
  const cmsPageBuilderProfileRaw = settingsStore.get(getFolderTreeProfileV2Key('cms_page_builder'));
  const caseResolverProfileRaw = settingsStore.get(getFolderTreeProfileV2Key('case_resolver'));
  const caseResolverCasesProfileRaw = settingsStore.get(
    getFolderTreeProfileV2Key('case_resolver_cases')
  );

  return useMemo(
    () => ({
      notes:
        notesProfileRaw !== undefined
          ? parseFolderTreeProfileV2Entry('notes', notesProfileRaw)
          : useLegacyFallback
            ? legacyProfiles.notes
            : defaultFolderTreeProfilesV2.notes,
      image_studio:
        imageStudioProfileRaw !== undefined
          ? parseFolderTreeProfileV2Entry('image_studio', imageStudioProfileRaw)
          : useLegacyFallback
            ? legacyProfiles.image_studio
            : defaultFolderTreeProfilesV2.image_studio,
      product_categories:
        productCategoriesProfileRaw !== undefined
          ? parseFolderTreeProfileV2Entry('product_categories', productCategoriesProfileRaw)
          : useLegacyFallback
            ? legacyProfiles.product_categories
            : defaultFolderTreeProfilesV2.product_categories,
      cms_page_builder:
        cmsPageBuilderProfileRaw !== undefined
          ? parseFolderTreeProfileV2Entry('cms_page_builder', cmsPageBuilderProfileRaw)
          : useLegacyFallback
            ? legacyProfiles.cms_page_builder
            : defaultFolderTreeProfilesV2.cms_page_builder,
      case_resolver:
        caseResolverProfileRaw !== undefined
          ? parseFolderTreeProfileV2Entry('case_resolver', caseResolverProfileRaw)
          : useLegacyFallback
            ? legacyProfiles.case_resolver
            : defaultFolderTreeProfilesV2.case_resolver,
      case_resolver_cases:
        caseResolverCasesProfileRaw !== undefined
          ? parseFolderTreeProfileV2Entry('case_resolver_cases', caseResolverCasesProfileRaw)
          : useLegacyFallback
            ? legacyProfiles.case_resolver_cases
            : defaultFolderTreeProfilesV2.case_resolver_cases,
    }),
    [
      caseResolverCasesProfileRaw,
      caseResolverProfileRaw,
      cmsPageBuilderProfileRaw,
      imageStudioProfileRaw,
      legacyProfiles,
      useLegacyFallback,
      notesProfileRaw,
      productCategoriesProfileRaw,
    ]
  );
}

export function useFolderTreeProfile(instance: FolderTreeInstance): FolderTreeProfileV2 {
  const profiles = useFolderTreeProfiles();
  return profiles[instance];
}
