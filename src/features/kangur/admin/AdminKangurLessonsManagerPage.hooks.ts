import React from 'react';
import { useLocale } from '@/shared/lib/i18n';
import { useLessonsState, type UseLessonsStateReturn } from './hooks/lessons-manager/useLessonsState';
import { useLessonsUiState, type UseLessonsUiStateReturn } from './hooks/lessons-manager/useLessonsUiState';
import { KANGUR_ADMIN_LOCALES, resolveKangurAdminLocale } from './kangur-admin-locale';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';

const formatContentLocaleLabel = (locale: (typeof KANGUR_ADMIN_LOCALES)[number]): string => {
  if (locale === 'pl') return 'Polish';
  if (locale === 'uk') return 'Ukrainian';
  return 'English';
};

export type UseAdminKangurLessonsManagerStateReturn = UseLessonsStateReturn & UseLessonsUiStateReturn & {
  contentLocale: (typeof KANGUR_ADMIN_LOCALES)[number];
  setContentLocale: React.Dispatch<React.SetStateAction<(typeof KANGUR_ADMIN_LOCALES)[number]>>;
  contentLocaleOptions: { value: string; label: string }[];
  contentLocaleLabel: string;
  isSaving: boolean;
  setTreeModeAndPersist: (mode: any) => void;
  isCatalogMode: boolean;
  isSectionsMode: boolean;
  breadcrumbs: { label: string; href?: string }[];
  handleTreeSearchChange: (query: string) => void;
  renderTreeNode: (input: any) => React.ReactNode;
  activeAgeGroupLabel: string;
  handleCreate: () => void;
  handleToggleTreeMode: () => void;
  handleCanonicalize: () => Promise<void>;
  handleAppendMissing: () => Promise<void>;
  handleAddGeometryPack: () => Promise<void>;
  handleAddLogicalThinkingPack: () => Promise<void>;
  handleImportAllLessonsToEditor: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleCloseModal: () => void;
  handleDelete: () => Promise<void>;
  handleSaveContent: () => Promise<void>;
  handleClearContent: () => Promise<void>;
  handleImportLegacy: (lesson: KangurLesson) => Promise<void>;
  handleComponentChange: (componentId: string) => void;
  authoringFilterCounts: any[];
  authoringFilteredLessons: KangurLesson[];
  geometryPackAddedCount: number;
  logicPackAddedCount: number;
  legacyImportCount: number;
  filteredLessons: KangurLesson[];
  ageGroupCounts: any[];
  controller: any;
  scrollToNodeRef: React.RefObject<HTMLDivElement>;
  rootDropUi: React.ReactNode;
  capabilities: any;
  searchState: any;
  treeSearchQuery: string;
};

export function useAdminKangurLessonsManagerState(): UseAdminKangurLessonsManagerStateReturn {
  const routeLocale = useLocale();
  const [contentLocale, setContentLocale] = React.useState(() => resolveKangurAdminLocale(routeLocale));
  
  const state = useLessonsState(contentLocale);
  const ui = useLessonsUiState();
  const contentLocaleOptions = React.useMemo(() => KANGUR_ADMIN_LOCALES.map((locale) => ({ value: locale, label: formatContentLocaleLabel(locale) })), []);
  const contentLocaleLabel = React.useMemo(() => formatContentLocaleLabel(contentLocale), [contentLocale]);
  
  const isSaving = state.lessonsQuery.isPending || state.lessonDocumentsQuery.isPending || state.templatesQuery.isPending;

  return { 
    contentLocale, setContentLocale, contentLocaleOptions, contentLocaleLabel, isSaving,
    ...state, ...ui, 
    handleCreate: () => {}, handleToggleTreeMode: () => {}, 
    handleCanonicalize: async () => {}, handleAppendMissing: async () => {}, handleAddGeometryPack: async () => {}, 
    handleAddLogicalThinkingPack: async () => {}, handleImportAllLessonsToEditor: async () => {}, 
    handleSave: async () => {}, handleCloseModal: () => {}, handleDelete: async () => {}, 
    handleSaveContent: async () => {}, handleClearContent: async () => {}, handleImportLegacy: async () => {}, 
    handleComponentChange: () => {}, setTreeModeAndPersist: () => {},
    isCatalogMode: false, isSectionsMode: false, breadcrumbs: [], handleTreeSearchChange: () => {}, 
    renderTreeNode: () => null, activeAgeGroupLabel: 'All ages',
    authoringFilterCounts: [], authoringFilteredLessons: [], geometryPackAddedCount: 0,
    logicPackAddedCount: 0, legacyImportCount: 0, filteredLessons: state.lessons,
    ageGroupCounts: [], controller: {}, scrollToNodeRef: React.createRef(),
    rootDropUi: null, capabilities: { search: { enabled: false } }, searchState: {}, treeSearchQuery: ''
  };
}
