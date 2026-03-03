'use client';

import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useCreateStudioSlots,
  useUpdateStudioSlot,
  useDeleteStudioSlot,
  useUploadStudioAssets,
  useImportStudioAssetsFromDrive,
  type StudioAssetImportResult,
} from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import { studioKeys, useStudioSlots } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import type {
  ImageStudioSlotRecord,
  StudioSlotsResponse,
  ImageStudioAssetDto as ImageStudioUploadedAsset,
} from '@/shared/contracts/image-studio';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2 } from '@/shared/lib/query-factories-v2';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  isTreePathWithin,
  normalizeTreePath,
} from '@/shared/utils/tree-operations';

import { useProjectsState } from './ProjectsContext';
import {
  getImageStudioProjectSessionKey,
  resolveImageStudioProjectSession,
} from '@/features/ai/image-studio/utils/project-session';
import { type StudioUploadMode } from '../components/studio-modals/StudioImportContext';

export type StudioPreviewMode = 'image' | '3d';

export type SlotsContextType = {
  // State
  slots: ImageStudioSlotRecord[];
  isLoading: boolean;
  isFetching: boolean;
  slotsQuery: UseQueryResult<StudioSlotsResponse>;
  error: Error | null;
  selectedSlotId: string | null;
  workingSlotId: string | null;
  previewMode: StudioPreviewMode;
  slotSelectionLocked: boolean;
  captureRef: React.MutableRefObject<(() => string | null) | null>;
  temporaryObjectUpload: ImageStudioUploadedAsset | null;
  
  // UI State
  slotCreateOpen: boolean;
  driveImportOpen: boolean;
  driveImportMode: StudioUploadMode;
  driveImportTargetId: string | null;
  slotInlineEditOpen: boolean;
  slotImageUrlDraft: string;
  slotBase64Draft: string;
  slotUpdateBusy: boolean;

  // Selected Data
  selectedSlot: ImageStudioSlotRecord | null;
  workingSlot: ImageStudioSlotRecord | null;
  compositeSlot: ImageStudioSlotRecord | null;
  compositeAssets: ImageStudioSlotRecord[];
  compositeAssetIds: string[];
  compositeAssetOptions: Array<{ value: string; label: string }>;

  // Folders
  virtualFolders: string[];
  selectedFolder: string;

  // Actions
  setSelectedSlotId: (id: string | null) => void;
  setWorkingSlotId: (id: string | null) => void;
  setPreviewMode: (mode: StudioPreviewMode) => void;
  setSlotSelectionLocked: (locked: boolean) => void;
  setTemporaryObjectUpload: (asset: ImageStudioUploadedAsset | null) => void;
  setCompositeAssetIds: (ids: string[]) => void;
  setSelectedFolder: (folder: string) => void;
  
  setSlotCreateOpen: (open: boolean) => void;
  setDriveImportOpen: (open: boolean) => void;
  setDriveImportMode: (mode: StudioUploadMode) => void;
  setDriveImportTargetId: (id: string | null) => void;
  setSlotInlineEditOpen: (open: boolean) => void;
  setSlotImageUrlDraft: (url: string) => void;
  setSlotBase64Draft: (base64: string) => void;
  setSlotUpdateBusy: (busy: boolean) => void;

  expandFolderPath: (path: string) => string[];
  createFolder: (folder: string) => Promise<string>;
  deleteFolder: (folder: string) => Promise<void>;
  createSlots: (slots: Array<Partial<ImageStudioSlotRecord>>) => Promise<ImageStudioSlotRecord[]>;
  updateSlot: (id: string, data: Partial<ImageStudioSlotRecord>) => Promise<ImageStudioSlotRecord>;
  deleteSlot: (id: string) => Promise<void>;
  moveSlot: (input: { slot: ImageStudioSlotRecord; targetFolder: string }) => Promise<void>;
  
  handleMoveFolder: (source: string, target: string) => Promise<void>;
  handleRenameFolder: (source: string, nextName: string) => Promise<void>;
  handleDeleteFolder: (source: string) => Promise<void>;

  uploadAssets: (
    files: File[],
    options?: { folder?: string; slotId?: string }
  ) => Promise<ImageStudioUploadedAsset[]>;
  importAssetsFromDrive: (
    selection: any,
    options?: { folder?: string; slotId?: string }
  ) => Promise<StudioAssetImportResult>;
  
  // Mutations
  createFolderMutation: any;
  updateSlotMutation: any;
  deleteSlotMutation: any;
  uploadMutation: any;
  importFromDriveMutation: any;

  isUploading: boolean;
  isImporting: boolean;
  refreshSlots: () => Promise<void>;
};

const SlotsContext = createContext<SlotsContextType | null>(null);

const DEFAULT_FOLDERS = ['Root'];

const normalizeFolderPaths = (paths: string[]): string[] => {
  const seen = new Set<string>();
  return paths
    .map((p) => normalizeTreePath(p))
    .filter((p) => {
      if (!p || seen.has(p)) return false;
      seen.add(p);
      return true;
    })
    .sort();
};

export function SlotsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { projectId } = useProjectsState();
  const queryClient = useQueryClient();

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [workingSlotId, setWorkingSlotId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<StudioPreviewMode>('image');
  const [slotSelectionLocked, setSlotSelectionLocked] = useState(false);
  const captureRef = useRef<(() => string | null) | null>(null);
  const [temporaryObjectUpload, setTemporaryObjectUpload] = useState<ImageStudioUploadedAsset | null>(null);
  const [compositeAssetIds, setCompositeAssetIds] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('Root');

  // UI State
  const [slotCreateOpen, setSlotCreateOpen] = useState(false);
  const [driveImportOpen, setDriveImportOpen] = useState(false);
  const [driveImportMode, setDriveImportMode] = useState<StudioUploadMode>('assets');
  const [driveImportTargetId, setDriveImportTargetId] = useState<string | null>(null);
  const [slotInlineEditOpen, setSlotInlineEditOpen] = useState(false);
  const [slotImageUrlDraft, setSlotImageUrlDraft] = useState('');
  const [slotBase64Draft, setSlotBase64Draft] = useState('');
  const [slotUpdateBusy, setSlotUpdateBusy] = useState(false);

  const slotsQueryKey = studioKeys.slots(projectId ?? null);
  const slotsQuery = useStudioSlots(projectId ?? '');

  const slots = useMemo(
    () => (Array.isArray(slotsQuery.data?.slots) ? slotsQuery.data.slots : []),
    [slotsQuery.data?.slots]
  );

  // ── Folders ──
  const settingsKey = projectId ? getImageStudioProjectSessionKey(projectId) : null;
  const { data: settingsMap, isLoading: loadingSettings } = useSettingsMap(
    settingsKey ? ({ scope: 'heavy', enabled: true } as any) : ({ enabled: false } as any)
  );
  const updateSetting = useUpdateSetting();

  const session = useMemo(() => {
    const raw = settingsKey ? (settingsMap as any)?.get?.(settingsKey) : null;
    return resolveImageStudioProjectSession(raw, projectId ?? '');
  }, [settingsKey, settingsMap, projectId]);

  const virtualFolders = useMemo(() => {
    const fromSession = (session as any)?.folders;
    if (!fromSession || fromSession.length === 0) return DEFAULT_FOLDERS;
    return normalizeFolderPaths([...DEFAULT_FOLDERS, ...fromSession]);
  }, [session]);

  const persistFolders = useCallback(
    async (folders: string[]) => {
      if (!settingsKey) return;
      const nextSession = { ...session, folders: normalizeFolderPaths(folders) };
      await updateSetting.mutateAsync({
        key: settingsKey,
        value: serializeSetting(nextSession),
      });
    },
    [settingsKey, session, updateSetting]
  );

  const expandFolderPath = useCallback((path: string): string[] => {
    const segments = path.split('/').filter(Boolean);
    const result: string[] = [];
    let current = '';
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      result.push(current);
    }
    return result;
  }, []);

  // ── Selection Helpers ──
  const selectedSlot = useMemo(
    () => (selectedSlotId ? slots.find((s: ImageStudioSlotRecord) => s.id === selectedSlotId) ?? null : null),
    [slots, selectedSlotId]
  );

  const workingSlot = useMemo(
    () => (workingSlotId ? slots.find((s: ImageStudioSlotRecord) => s.id === workingSlotId) ?? null : null),
    [slots, workingSlotId]
  );

  const compositeSlot = useMemo(
    () => slots.find((s: any) => s.isComposite || s.metadata?.role === 'composite') ?? null,
    [slots]
  );

  const compositeAssets = useMemo(
    () =>
      compositeAssetIds
        .map((id) => slots.find((s: ImageStudioSlotRecord) => s.id === id))
        .filter((s): s is ImageStudioSlotRecord => Boolean(s)),
    [slots, compositeAssetIds]
  );

  const compositeAssetOptions = useMemo(
    () => slots.map(s => ({ value: s.id, label: s.name || s.id })),
    [slots]
  );

  // ── Mutations ──
  const createSlotsMutation = useCreateStudioSlots(projectId ?? '');
  const createSlots = useCallback(
    async (slotsToCreate: Array<Partial<ImageStudioSlotRecord>>) => {
      const data = await createSlotsMutation.mutateAsync(slotsToCreate);
      if (data.slots.length > 0) {
        queryClient.setQueryData(slotsQueryKey, (current: StudioSlotsResponse | undefined) => {
          if (!current) return { slots: data.slots };
          const existingById = new Set(current.slots.map((slot: ImageStudioSlotRecord) => slot.id));
          const appended = data.slots.filter(
            (slot: ImageStudioSlotRecord) => !existingById.has(slot.id)
          );
          if (appended.length === 0) return current;
          return {
            ...current,
            slots: [...current.slots, ...appended],
          };
        });
      }
      return data.slots;
    },
    [createSlotsMutation, queryClient, slotsQueryKey]
  );

  const updateSlotMutation = useUpdateStudioSlot(projectId ?? '');
  const deleteSlotMutation = useDeleteStudioSlot(projectId ?? '');
  const uploadMutation = useUploadStudioAssets(projectId ?? '');
  const importFromDriveMutation = useImportStudioAssetsFromDrive(projectId ?? '');

  const moveSlot = useCallback(
    async (input: { slot: ImageStudioSlotRecord; targetFolder: string }): Promise<void> => {
      const { slot, targetFolder } = input;
      await updateSlotMutation.mutateAsync({
        id: slot.id,
        data: { folderPath: targetFolder },
      });
    },
    [updateSlotMutation]
  );

  const createFolderMutation = createCreateMutationV2<string, string>({
    mutationKey: studioKeys.mutation('folders.create'),
    mutationFn: async (folder: string) => {
      const expanded = expandFolderPath(folder);
      const nextFolders = normalizeFolderPaths([...virtualFolders, ...expanded]);
      await persistFolders(nextFolders);
      return expanded[expanded.length - 1]!;
    },
    meta: {
      source: 'image-studio.folders.create',
      operation: 'create',
      resource: 'image-studio.folders',
      domain: 'image_studio',
      tags: ['image-studio', 'folders'],
    },
  });

  const handleMoveFolder = useCallback(async (_source: string, _target: string) => {
     // Implementation omitted
  }, []);

  const handleRenameFolder = useCallback(async (_source: string, _nextName: string) => {
     // Implementation omitted
  }, []);

  const handleDeleteFolder = useCallback(
    async (source: string): Promise<void> => {
      const target = 'Root';
      if (source === 'Root') throw new Error('Cannot delete Root folder.');

      const affectedSlots = slots.filter((s: any) => isTreePathWithin(s.folderPath || 'Root', source));

      try {
        const response = await api.post<{ failedRootSlotIds: string[] }>(
          `/api/image-studio/projects/${projectId}/folders/delete`,
          {
            source,
            target,
            deleteSlots: true,
          }
        );

        const deletedIds = new Set(affectedSlots.map((s: any) => s.id));
        queryClient.setQueryData(slotsQueryKey, (current: StudioSlotsResponse | undefined) => {
          if (!current) return current;
          return {
            ...current,
            slots: current.slots.filter((s: ImageStudioSlotRecord) => !deletedIds.has(s.id)),
          };
        });

        const nextFolders = virtualFolders.filter((f) => !isTreePathWithin(f, source));
        await persistFolders(nextFolders);

        if (selectedFolder === source || isTreePathWithin(selectedFolder, source)) {
          setSelectedFolder('Root');
        }
        if (selectedSlotId && deletedIds.has(selectedSlotId)) {
          setSelectedSlotId(null);
        }
        if (workingSlotId && deletedIds.has(workingSlotId)) {
          setWorkingSlotId(null);
        }

        if ((response.failedRootSlotIds ?? []).length > 0) {
          const failedCount = response.failedRootSlotIds.length;
          const noun = failedCount === 1 ? 'card' : 'cards';
          throw new Error(`Failed to delete ${failedCount} ${noun} in folder "${source}".`);
        }
      } finally {
      }
    },
    [
      projectId,
      virtualFolders,
      persistFolders,
      selectedFolder,
      selectedSlotId,
      workingSlotId,
      queryClient,
      slotsQueryKey,
      slots,
    ]
  );

  const value = useMemo<SlotsContextType>(
    () => ({
      slots,
      isLoading: slotsQuery.isLoading || loadingSettings,
      isFetching: slotsQuery.isFetching,
      slotsQuery,
      error: (slotsQuery.error as Error | null) || null,
      selectedSlotId,
      setSelectedSlotId,
      workingSlotId,
      setWorkingSlotId,
      previewMode,
      setPreviewMode,
      slotSelectionLocked,
      setSlotSelectionLocked,
      captureRef,
      temporaryObjectUpload,
      setTemporaryObjectUpload: (asset: ImageStudioUploadedAsset | null) => setTemporaryObjectUpload(asset),
      
      slotCreateOpen,
      setSlotCreateOpen,
      driveImportOpen,
      setDriveImportOpen,
      driveImportMode,
      setDriveImportMode,
      driveImportTargetId,
      setDriveImportTargetId,
      slotInlineEditOpen,
      setSlotInlineEditOpen,
      slotImageUrlDraft,
      setSlotImageUrlDraft,
      slotBase64Draft,
      setSlotBase64Draft,
      slotUpdateBusy,
      setSlotUpdateBusy,

      selectedSlot,
      workingSlot,
      compositeSlot,
      compositeAssets,
      compositeAssetIds,
      setCompositeAssetIds,
      compositeAssetOptions,
      virtualFolders,
      selectedFolder,
      setSelectedFolder,
      expandFolderPath,
      createFolder: (folder: string) => createFolderMutation.mutateAsync(folder),
      deleteFolder: handleDeleteFolder,
      createSlots,
      updateSlot: (id: string, data: Partial<ImageStudioSlotRecord>) =>
        updateSlotMutation.mutateAsync({ id, data }),
      deleteSlot: (id: string) => deleteSlotMutation.mutateAsync(id),
      moveSlot,
      
      handleMoveFolder,
      handleRenameFolder,
      handleDeleteFolder,

      uploadAssets: (files: File[], options?: { folder?: string; slotId?: string }) =>
        uploadMutation.mutateAsync({ files, folder: options?.folder || 'Root' }) as any,
      importAssetsFromDrive: (
        selection: any,
        options?: { folder?: string; slotId?: string }
      ) => importFromDriveMutation.mutateAsync({ files: [selection], folder: options?.folder || 'Root' } as any),
      
      createFolderMutation,
      updateSlotMutation,
      deleteSlotMutation,
      uploadMutation,
      importFromDriveMutation,

      isUploading: uploadMutation.isPending,
      isImporting: importFromDriveMutation.isPending,
      refreshSlots: async () => {
        await slotsQuery.refetch();
      },
    }),
    [
      slots,
      slotsQuery,
      loadingSettings,
      selectedSlotId,
      workingSlotId,
      previewMode,
      slotSelectionLocked,
      temporaryObjectUpload,
      slotCreateOpen,
      driveImportOpen,
      driveImportMode,
      driveImportTargetId,
      slotInlineEditOpen,
      slotImageUrlDraft,
      slotBase64Draft,
      slotUpdateBusy,
      selectedSlot,
      workingSlot,
      compositeSlot,
      compositeAssets,
      compositeAssetIds,
      virtualFolders,
      selectedFolder,
      expandFolderPath,
      createFolderMutation,
      handleDeleteFolder,
      handleMoveFolder,
      handleRenameFolder,
      createSlots,
      updateSlotMutation,
      deleteSlotMutation,
      moveSlot,
      uploadMutation,
      importFromDriveMutation,
    ]
  );

  return <SlotsContext.Provider value={value}>{children}</SlotsContext.Provider>;
}

export type SlotsState = SlotsContextType;
export type SlotsActions = SlotsContextType;

export function useSlotsState(): SlotsContextType {
  const context = useContext(SlotsContext);
  if (!context) {
    throw new Error('useSlotsState must be used within a SlotsProvider');
  }
  return context;
}

export function useSlotsActions(): SlotsContextType {
  return useSlotsState();
}

export function useSlots(): SlotsContextType {
  return useSlotsState();
}
