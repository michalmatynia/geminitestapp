'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import {
  buildFilemakerPartyOptions,
  createFilemakerAddress,
  createFilemakerOrganization,
  createFilemakerPerson,
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
  FILEMAKER_DATABASE_KEY,
  normalizeFilemakerDatabase,
  parseFilemakerDatabase,
  resolveFilemakerPartyLabel,
} from '@/features/filemaker/settings';
import type { FilemakerDatabase, FilemakerEntityKind } from '@/features/filemaker/types';
import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
import {
  consumePromptExploderApplyPromptForCaseResolver,
  savePromptExploderDraftPromptFromCaseResolver,
} from '@/features/prompt-exploder/bridge';
import type {
  PromptExploderCaseResolverPartyBundle,
  PromptExploderCaseResolverPartyCandidate,
} from '@/features/prompt-exploder/bridge';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  composeCandidateStreetNumber,
  findExistingFilemakerAddressId,
  findExistingFilemakerPartyReference,
  normalizeCaseResolverComparable,
  resolveCountryFromCandidateValue,
} from '../party-matching';
import {
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  extractCaseResolverDocumentDate,
  parseCaseResolverCategories,
  parseCaseResolverTags,
  createCaseResolverAssetFile,
  createCaseResolverFile,
  normalizeCaseResolverWorkspace,
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverWorkspace,
  renameFolderPath,
  upsertFileGraph,
} from '../settings';

import type {
  CaseResolverAssetFile,
  CaseResolverCategory,
  CaseResolverDocumentVersion,
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverGraph,
  CaseResolverPartyReference,
  CaseResolverScanSlot,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '../types';

/**
 * Custom hook to manage the complex state and logic of the Case Resolver page.
 */
export function useCaseResolverState() {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { isMenuCollapsed, setIsMenuCollapsed } = useAdminLayout();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');
  const shouldOpenEditorFromQuery = searchParams.get('openEditor') === '1';

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const rawFilemakerDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const caseResolverTags = useMemo(
    (): CaseResolverTag[] => parseCaseResolverTags(rawCaseResolverTags),
    [rawCaseResolverTags]
  );
  const caseResolverCategories = useMemo(
    (): CaseResolverCategory[] => parseCaseResolverCategories(rawCaseResolverCategories),
    [rawCaseResolverCategories]
  );
  const filemakerDatabase = useMemo(
    () => parseFilemakerDatabase(rawFilemakerDatabase),
    [rawFilemakerDatabase]
  );
  
  const countriesQuery = useCountries();
  const countries = countriesQuery.data ?? [];

  const [workspace, setWorkspace] = useState<CaseResolverWorkspace>(parsedWorkspace);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(parsedWorkspace.activeFileId);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(false);
  const [activeMainView, setActiveMainView] = useState<'workspace' | 'search'>('workspace');
  const [isPreviewPageVisible, setIsPreviewPageVisible] = useState(false);
  const [isPartiesModalOpen, setIsPartiesModalOpen] = useState(false);
  const [editingDocumentDraft, setEditingDocumentDraft] = useState<CaseResolverFileEditDraft | null>(null);
  const [isUploadingScanDraftFiles, setIsUploadingScanDraftFiles] = useState(false);
  const [uploadingScanSlotId, setUploadingScanSlotId] = useState<string | null>(null);

  // Persistence logic
  const persistWorkspace = useCallback(
    async (next: CaseResolverWorkspace): Promise<void> => {
      const normalized = normalizeCaseResolverWorkspace(next);
      setWorkspace(normalized);
      try {
        await updateSetting.mutateAsync({
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: serializeSetting(normalized),
        });
      } catch (error) {
        toast('Failed to save workspace changes.', { variant: 'error' });
      }
    },
    [updateSetting, toast]
  );

  return {
    workspace,
    setWorkspace,
    persistWorkspace,
    selectedFileId,
    setSelectedFileId,
    selectedFolderPath,
    setSelectedFolderPath,
    selectedAssetId,
    setSelectedAssetId,
    folderPanelCollapsed,
    setFolderPanelCollapsed,
    activeMainView,
    setActiveMainView,
    isPreviewPageVisible,
    setIsPreviewPageVisible,
    isPartiesModalOpen,
    setIsPartiesModalOpen,
    editingDocumentDraft,
    setEditingDocumentDraft,
    isUploadingScanDraftFiles,
    uploadingScanSlotId,
    caseResolverTags,
    caseResolverCategories,
    filemakerDatabase,
    countries,
    isMenuCollapsed,
    setIsMenuCollapsed,
    requestedFileId,
    shouldOpenEditorFromQuery
  };
}

function serializeSetting(value: any): string {
  return JSON.stringify(value);
}
