'use client';

import { useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  useCreateStudioSlots,
  useUpdateStudioSlot,
  useDeleteStudioSlot,
  useUploadStudioAssets,
  useImportStudioAssetsFromDrive,
  type StudioAssetImportResult,
} from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import { studioKeys, useStudioSlots } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import { useToast } from '@/shared/ui';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';
import {
  canMoveTreePath,
  getTreePathLeaf,
  isTreePathWithin,
  normalizeTreePath,
  rebaseTreePath,
} from '@/shared/utils/tree-operations';

import { useProjectsState } from './ProjectsContext';
import { getImageStudioProjectSessionKey, parseImageStudioProjectSession } from '../utils/project-session';
import { expandFolderPath, normalizeFolderPaths, IMAGE_STUDIO_TREE_KEY_PREFIX } from '../utils/studio-tree';

import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

// ── Utilities ────────────────────────────────────────────────────────────────

function sanitizeStudioProjectId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

function parseSlotFoldersSetting(raw: string | null | undefined): string[] {
  const parsed = parseJsonSetting<Record<string, unknown> | null>(raw, null);
  if (!parsed || typeof parsed !== 'object') return [];
  const folders = Array.isArray((parsed as { folders?: unknown }).folders)
    ? ((parsed as { folders?: unknown[] }).folders ?? [])
    : [];
  return normalizeFolderPaths(folders.filter((folder: unknown): folder is string => typeof folder === 'string'));
}

function serializeSlotFoldersSetting(folders: string[]): string {
  return serializeSetting({ version: 1, folders: normalizeFolderPaths(folders) });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface SlotsState {
  slots: ImageStudioSlotRecord[];
  slotsQuery: UseQueryResult<StudioSlotsResponse>;
  selectedSlotId: string | null;
  selectedSlot: ImageStudioSlotRecord | null;
  workingSlotId: string | null;
  workingSlot: ImageStudioSlotRecord | null;
  virtualFolders: string[];
  selectedFolder: string;
  // Slot UI
  slotCreateOpen: boolean;
  driveImportOpen: boolean;
  driveImportMode: 'create' | 'replace';
  driveImportTargetId: string | null;
  slotUpdateBusy: boolean;
  slotInlineEditOpen: boolean;
  slotImageUrlDraft: string;
  slotBase64Draft: string;
  moveTargetFolder: string;
  // Composite & 3D
  compositeAssetIds: string[];
  compositeAssets: ImageStudioSlotRecord[];
  compositeAssetOptions: Array<{ value: string; label: string; disabled: boolean }>;
  previewMode: 'image' | '3d';
  captureRef: React.MutableRefObject<(() => string | null) | null>;
}

export interface SlotsActions {
  setSelectedSlotId: (id: string | null) => void;
  setWorkingSlotId: (id: string | null) => void;
  setVirtualFolders: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedFolder: (f: string) => void;
  createSlots: (slots: Array<Partial<ImageStudioSlotRecord>>) => Promise<ImageStudioSlotRecord[]>;
  updateSlotMutation: UseMutationResult<ImageStudioSlotRecord, Error, { id: string; data: Partial<ImageStudioSlotRecord> }>;
  deleteSlotMutation: UseMutationResult<void, Error, string>;
  moveSlotMutation: UseMutationResult<ImageStudioSlotRecord, Error, { slot: ImageStudioSlotRecord; targetFolder: string }>;
  handleMoveFolder: (folderPath: string, targetFolder: string) => Promise<void>;
  handleRenameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
  handleDeleteFolder: (folderPath: string) => Promise<void>;
  createFolderMutation: UseMutationResult<string, Error, string>;
  uploadMutation: UseMutationResult<StudioAssetImportResult, Error, { files: File[]; folder: string }>;
  importFromDriveMutation: UseMutationResult<StudioAssetImportResult, Error, { files: ImageFileSelection[]; folder: string }>;
  // Slot UI
  setSlotCreateOpen: (o: boolean) => void;
  setDriveImportOpen: (o: boolean) => void;
  setDriveImportMode: (m: 'create' | 'replace') => void;
  setDriveImportTargetId: (id: string | null) => void;
  setSlotUpdateBusy: (b: boolean) => void;
  setSlotInlineEditOpen: (o: boolean) => void;
  setSlotImageUrlDraft: (s: string) => void;
  setSlotBase64Draft: (s: string) => void;
  setMoveTargetFolder: (f: string) => void;
  // Composite
  setCompositeAssetIds: (ids: string[]) => void;
  setPreviewMode: (m: 'image' | '3d') => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const SlotsStateContext = createContext<SlotsState | null>(null);
const SlotsActionsContext = createContext<SlotsActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function SlotsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const settingsStore = useSettingsStore();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();

  const { projectId } = useProjectsState();
  const slotsQueryKey = studioKeys.slots(projectId);

  // ── Slot queries/mutations ──
  const slotsQuery = useStudioSlots(projectId);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [workingSlotId, setWorkingSlotId] = useState<string | null>(null);

  const slots = useMemo(() => slotsQuery.data?.slots ?? [], [slotsQuery.data?.slots]);
  const selectedSlot = useMemo(() => slots.find((s: ImageStudioSlotRecord) => s.id === selectedSlotId) ?? null, [slots, selectedSlotId]);
  const workingSlot = useMemo(() => slots.find((s: ImageStudioSlotRecord) => s.id === workingSlotId) ?? null, [slots, workingSlotId]);

  useEffect(() => {
    if (selectedSlotId && !slots.some((slot: ImageStudioSlotRecord) => slot.id === selectedSlotId)) {
      setSelectedSlotId(null);
    }
  }, [slots, selectedSlotId]);

  useEffect(() => {
    if (workingSlotId && !slots.some((slot: ImageStudioSlotRecord) => slot.id === workingSlotId)) {
      setWorkingSlotId(null);
    }
  }, [slots, workingSlotId]);

  // ── Folders ──
  const [selectedFolder, setSelectedFolderRaw] = useState<string>('');
  const [virtualFolders, setVirtualFolders] = useState<string[]>([]);

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const treeKey = useMemo(() => projectId ? `${IMAGE_STUDIO_TREE_KEY_PREFIX}${sanitizeStudioProjectId(projectId)}` : null, [projectId]);
  const treeSettingsRaw = treeKey ? heavyMap.get(treeKey) : undefined;
  const projectSessionKey = useMemo(() => getImageStudioProjectSessionKey(projectId), [projectId]);
  const projectSessionRaw = projectSessionKey ? heavyMap.get(projectSessionKey) : undefined;
  const hydratedTreeSignatureRef = useRef<string | null>(null);
  const hydratedSessionSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || !treeKey || settingsStore.isLoading) return;
    const signature = `${treeKey}:${treeSettingsRaw ?? ''}`;
    if (hydratedTreeSignatureRef.current === signature) return;
    const storedFolders = parseSlotFoldersSetting(treeSettingsRaw);
    if (storedFolders.length > 0) {
      setVirtualFolders(storedFolders);
    } else {
      const derived = normalizeFolderPaths(slots.map((s: ImageStudioSlotRecord) => s.folderPath || '').filter(Boolean));
      setVirtualFolders(derived);
    }
    hydratedTreeSignatureRef.current = signature;
  }, [projectId, treeKey, treeSettingsRaw, settingsStore.isLoading, slots]);

  const persistFolders = useCallback(async (nextFolders: string[]) => {
    if (!treeKey) return;
    await updateSetting.mutateAsync({
      key: treeKey,
      value: serializeSlotFoldersSetting(nextFolders),
    });
  }, [treeKey, updateSetting]);

  const handleSelectFolder = useCallback((folder: string): void => {
    setSelectedFolderRaw(folder);
    setSelectedSlotId(null);
  }, []);

  // ── Slot UI state ──
  const [slotCreateOpen, setSlotCreateOpen] = useState<boolean>(false);
  const [driveImportOpen, setDriveImportOpen] = useState<boolean>(false);
  const [driveImportMode, setDriveImportMode] = useState<'create' | 'replace'>('create');
  const [driveImportTargetId, setDriveImportTargetId] = useState<string | null>(null);
  const [slotUpdateBusy, setSlotUpdateBusy] = useState<boolean>(false);
  const [slotInlineEditOpen, setSlotInlineEditOpen] = useState<boolean>(false);
  const [slotImageUrlDraft, setSlotImageUrlDraft] = useState<string>('');
  const [slotBase64Draft, setSlotBase64Draft] = useState<string>('');
  const [moveTargetFolder, setMoveTargetFolder] = useState<string>('');

  // ── Composite & 3D ──
  const [compositeAssetIds, setCompositeAssetIds] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<'image' | '3d'>('image');
  const captureRef = useRef<(() => string | null) | null>(null);

  useEffect(() => {
    if (!projectId || !projectSessionKey || settingsStore.isLoading || heavySettings.isLoading) return;
    const signature = `${projectSessionKey}:${projectSessionRaw ?? ''}`;
    if (hydratedSessionSignatureRef.current === signature) return;

    const session = parseImageStudioProjectSession(projectSessionRaw, projectId);
    setSelectedSlotId(session?.selectedSlotId ?? null);
    setWorkingSlotId(session?.workingSlotId ?? null);
    setSelectedFolderRaw(session?.selectedFolder ?? '');
    setCompositeAssetIds(session?.compositeAssetIds ?? []);
    setPreviewMode(session?.previewMode ?? 'image');
    hydratedSessionSignatureRef.current = signature;
  }, [
    projectId,
    projectSessionKey,
    projectSessionRaw,
    settingsStore.isLoading,
    heavySettings.isLoading,
  ]);

  useEffect(() => {
    if (projectId) return;
    setSelectedSlotId(null);
    setWorkingSlotId(null);
    setSelectedFolderRaw('');
    setCompositeAssetIds([]);
    setPreviewMode('image');
    hydratedSessionSignatureRef.current = null;
  }, [projectId]);

  const compositeAssetOptions = useMemo(() => {
    const baseId = workingSlotId ?? selectedSlotId;
    return slots
      .map((s: ImageStudioSlotRecord) => ({ value: s.id, label: s.folderPath ? `${s.folderPath}/${s.name || s.id}` : (s.name || s.id), disabled: s.id === baseId }))
      .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));
  }, [slots, selectedSlotId, workingSlotId]);

  const compositeAssets = useMemo(() =>
    compositeAssetIds.map(id => slots.find((s: ImageStudioSlotRecord) => s.id === id)).filter((s): s is ImageStudioSlotRecord => Boolean(s)),
  [slots, compositeAssetIds]);

  // ── Mutations ──
  const createSlotsMutation = useCreateStudioSlots(projectId);
  const createSlots = useCallback(async (slotsToCreate: Array<Partial<ImageStudioSlotRecord>>) => {
    const data = await createSlotsMutation.mutateAsync(slotsToCreate);
    if (data.slots.length > 0) {
      queryClient.setQueryData<StudioSlotsResponse>(slotsQueryKey, (current) => {
        if (!current) return { slots: data.slots };
        const existingById = new Set(current.slots.map((slot: ImageStudioSlotRecord) => slot.id));
        const appended = data.slots.filter((slot: ImageStudioSlotRecord) => !existingById.has(slot.id));
        if (appended.length === 0) return current;
        return {
          ...current,
          slots: [...current.slots, ...appended],
        };
      });
    }
    return data.slots;
  }, [createSlotsMutation, queryClient, slotsQueryKey]);

  const updateSlotMutation = useUpdateStudioSlot(projectId);
  const deleteSlotMutation = useDeleteStudioSlot(projectId);
  const uploadMutation = useUploadStudioAssets(projectId);
  const importFromDriveMutation = useImportStudioAssetsFromDrive(projectId);

  const moveSlotMutation = useMutation({
    mutationFn: async ({ slot, targetFolder }: { slot: ImageStudioSlotRecord; targetFolder: string }): Promise<ImageStudioSlotRecord> => {
      return updateSlotMutation.mutateAsync({ id: slot.id, data: { folderPath: targetFolder } });
    },
    onMutate: async ({ slot, targetFolder }: { slot: ImageStudioSlotRecord; targetFolder: string }) => {
      await queryClient.cancelQueries({ queryKey: slotsQueryKey });
      const previous = queryClient.getQueryData<StudioSlotsResponse>(slotsQueryKey);
      const normalizedTarget = targetFolder.trim();
      queryClient.setQueryData<StudioSlotsResponse>(slotsQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          slots: current.slots.map((item: ImageStudioSlotRecord) =>
            item.id === slot.id
              ? { ...item, folderPath: normalizedTarget || null }
              : item
          ),
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(slotsQueryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: slotsQueryKey });
    },
  });

  const handleMoveFolder = useCallback(async (folderPath: string, targetFolder: string) => {
    const source = normalizeTreePath(folderPath);
    const target = normalizeTreePath(targetFolder);
    if (!canMoveTreePath(source, target)) return;

    const sourceLeaf = getTreePathLeaf(source);
    const rebasedRoot = target ? `${target}/${sourceLeaf}` : sourceLeaf;
    const rebasePath = (value: string): string => {
      return rebaseTreePath(value, source, rebasedRoot);
    };

    const nextFolders = normalizeFolderPaths(virtualFolders.map((path: string) => rebasePath(path)));
    setVirtualFolders(nextFolders);
    void persistFolders(nextFolders);

    const affectedSlots = slots.filter((slot: ImageStudioSlotRecord) => {
      return isTreePathWithin(slot.folderPath ?? '', source);
    });

    if (affectedSlots.length > 0) {
      const optimisticNextById = new Map<string, string>(
        affectedSlots.map((slot: ImageStudioSlotRecord) => {
          const current = normalizeTreePath(slot.folderPath ?? '');
          return [slot.id, rebasePath(current)];
        })
      );

      queryClient.setQueryData<StudioSlotsResponse>(slotsQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          slots: current.slots.map((slot: ImageStudioSlotRecord) => {
            const nextFolderPath = optimisticNextById.get(slot.id);
            if (nextFolderPath === undefined) return slot;
            return { ...slot, folderPath: nextFolderPath || null };
          }),
        };
      });

      await Promise.allSettled(
        affectedSlots.map((slot: ImageStudioSlotRecord) => {
          const next = optimisticNextById.get(slot.id) ?? '';
          return updateSlotMutation.mutateAsync({
            id: slot.id,
            data: { folderPath: next },
          });
        })
      );
    }

    void queryClient.invalidateQueries({ queryKey: slotsQueryKey });
  }, [virtualFolders, persistFolders, slots, updateSlotMutation, queryClient, slotsQueryKey]);

  const handleRenameFolder = useCallback(async (folderPath: string, nextFolderPath: string) => {
    const source = normalizeTreePath(folderPath);
    const target = normalizeTreePath(nextFolderPath);
    if (!canMoveTreePath(source, target)) return;

    const rebasePath = (value: string): string => {
      return rebaseTreePath(value, source, target);
    };

    const nextFolders = normalizeFolderPaths(virtualFolders.map((path: string) => rebasePath(path)));
    setVirtualFolders(nextFolders);
    void persistFolders(nextFolders);

    const affectedSlots = slots.filter((slot: ImageStudioSlotRecord) => {
      return isTreePathWithin(slot.folderPath ?? '', source);
    });

    if (affectedSlots.length > 0) {
      const optimisticNextById = new Map<string, string>(
        affectedSlots.map((slot: ImageStudioSlotRecord) => {
          const current = normalizeTreePath(slot.folderPath ?? '');
          return [slot.id, rebasePath(current)];
        })
      );

      queryClient.setQueryData<StudioSlotsResponse>(slotsQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          slots: current.slots.map((slot: ImageStudioSlotRecord) => {
            const nextPath = optimisticNextById.get(slot.id);
            if (nextPath === undefined) return slot;
            return { ...slot, folderPath: nextPath || null };
          }),
        };
      });

      await Promise.allSettled(
        affectedSlots.map((slot: ImageStudioSlotRecord) => {
          const next = optimisticNextById.get(slot.id) ?? '';
          return updateSlotMutation.mutateAsync({
            id: slot.id,
            data: { folderPath: next },
          });
        })
      );
    }

    const normalizedSelectedFolder = normalizeTreePath(selectedFolder);
    if (isTreePathWithin(normalizedSelectedFolder, source)) {
      setSelectedFolderRaw(rebasePath(normalizedSelectedFolder));
    }

    void queryClient.invalidateQueries({ queryKey: slotsQueryKey });
  }, [
    virtualFolders,
    persistFolders,
    slots,
    updateSlotMutation,
    queryClient,
    slotsQueryKey,
    selectedFolder,
  ]);

  const handleDeleteFolder = useCallback(async (folderPath: string) => {
    const source = normalizeTreePath(folderPath);
    if (!source) return;

    const isWithinSource = (value: string): boolean =>
      isTreePathWithin(value, source);

    const nextFolders = normalizeFolderPaths(
      virtualFolders.filter((path: string) => !isWithinSource(path))
    );
    setVirtualFolders(nextFolders);
    void persistFolders(nextFolders);

    const slotsToDelete = slots.filter((slot: ImageStudioSlotRecord) =>
      isWithinSource(slot.folderPath ?? '')
    );
    if (slotsToDelete.length > 0) {
      const deletingSlotIds = new Set(slotsToDelete.map((slot: ImageStudioSlotRecord) => slot.id));
      if (selectedSlotId && deletingSlotIds.has(selectedSlotId)) {
        setSelectedSlotId(null);
        setWorkingSlotId(null);
      }
      await Promise.allSettled(
        slotsToDelete.map((slot: ImageStudioSlotRecord) => deleteSlotMutation.mutateAsync(slot.id))
      );
    }

    const normalizedSelectedFolder = normalizeTreePath(selectedFolder);
    if (normalizedSelectedFolder && isWithinSource(normalizedSelectedFolder)) {
      setSelectedFolderRaw('');
    }

    void queryClient.invalidateQueries({ queryKey: slotsQueryKey });
  }, [
    virtualFolders,
    persistFolders,
    slots,
    selectedSlotId,
    selectedFolder,
    deleteSlotMutation,
    queryClient,
    slotsQueryKey,
  ]);

  const createFolderMutation = useMutation({
    mutationFn: async (folder: string) => {
      const expanded = expandFolderPath(folder);
      const nextFolders = normalizeFolderPaths([...virtualFolders, ...expanded]);
      await persistFolders(nextFolders);
      return expanded[expanded.length - 1]!;
    },
    onSuccess: (folder) => {
      setVirtualFolders(prev => normalizeFolderPaths([...prev, ...expandFolderPath(folder)]));
      setSelectedFolderRaw(folder);
      toast('Folder created.', { variant: 'success' });
    },
  });

  // ── Memoized value ──

  const state = useMemo<SlotsState>(
    () => ({
      slots, slotsQuery, selectedSlotId, selectedSlot, workingSlotId, workingSlot,
      virtualFolders, selectedFolder,
      slotCreateOpen, driveImportOpen, driveImportMode, driveImportTargetId,
      slotUpdateBusy, slotInlineEditOpen, slotImageUrlDraft, slotBase64Draft, moveTargetFolder,
      compositeAssetIds, compositeAssets, compositeAssetOptions, previewMode, captureRef,
    }),
    [
      slots, slotsQuery, selectedSlotId, selectedSlot, workingSlotId, workingSlot,
      virtualFolders, selectedFolder,
      slotCreateOpen, driveImportOpen, driveImportMode, driveImportTargetId,
      slotUpdateBusy, slotInlineEditOpen, slotImageUrlDraft, slotBase64Draft, moveTargetFolder,
      compositeAssetIds, compositeAssets, compositeAssetOptions, previewMode,
    ]
  );

  const actions = useMemo<SlotsActions>(
    () => ({
      setSelectedSlotId, setWorkingSlotId, setVirtualFolders,
      setSelectedFolder: handleSelectFolder, createSlots,
      updateSlotMutation, deleteSlotMutation, moveSlotMutation, handleMoveFolder, handleRenameFolder, handleDeleteFolder,
      createFolderMutation, uploadMutation, importFromDriveMutation,
      setSlotCreateOpen, setDriveImportOpen, setDriveImportMode, setDriveImportTargetId,
      setSlotUpdateBusy, setSlotInlineEditOpen, setSlotImageUrlDraft, setSlotBase64Draft, setMoveTargetFolder,
      setCompositeAssetIds, setPreviewMode,
    }),
    [
      handleSelectFolder, createSlots,
      updateSlotMutation, deleteSlotMutation, moveSlotMutation, handleMoveFolder, handleRenameFolder, handleDeleteFolder,
      createFolderMutation, uploadMutation, importFromDriveMutation,
    ]
  );

  return (
    <SlotsActionsContext.Provider value={actions}>
      <SlotsStateContext.Provider value={state}>
        {children}
      </SlotsStateContext.Provider>
    </SlotsActionsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useSlotsState(): SlotsState {
  const ctx = useContext(SlotsStateContext);
  if (!ctx) throw new Error('useSlotsState must be used within a SlotsProvider');
  return ctx;
}

export function useSlotsActions(): SlotsActions {
  const ctx = useContext(SlotsActionsContext);
  if (!ctx) throw new Error('useSlotsActions must be used within a SlotsProvider');
  return ctx;
}

export function useSlots(): SlotsState & SlotsActions {
  return { ...useSlotsState(), ...useSlotsActions() };
}
