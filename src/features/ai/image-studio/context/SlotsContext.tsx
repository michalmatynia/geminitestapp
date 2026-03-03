'use client';

import { useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import type { ImageFileSelection } from '@/shared/contracts/files';
import type {
  ImageStudioSlotRecord,
  StudioSlotsResponse,
  ImageStudioAssetDto as ImageStudioUploadedAsset,
  CreateImageStudioSlotDto,
  UpdateImageStudioSlotDto,
} from '@/shared/contracts/image-studio';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
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
import {
  getImageStudioProjectSessionKey,
  resolveImageStudioProjectSession,
} from '@/features/ai/image-studio/utils/project-session';
import {
  expandFolderPath,
  normalizeFolderPaths,
  IMAGE_STUDIO_TREE_KEY_PREFIX,
} from '@/features/ai/image-studio/utils/studio-tree';

// ── Utilities ────────────────────────────────────────────────────────────────

const SLOT_FALLBACK_MISSING_GRACE_MS = 1400;

function sanitizeStudioProjectId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

function parseSlotFoldersSetting(raw: string | null | undefined): string[] {
  const parsed = parseJsonSetting<Record<string, unknown> | null>(raw, null);
  if (!parsed || typeof parsed !== 'object') return [];
  const folders = Array.isArray((parsed as { folders?: unknown }).folders)
    ? ((parsed as { folders?: unknown[] }).folders ?? [])
    : [];
  return normalizeFolderPaths(
    folders.filter((folder: unknown): folder is string => typeof folder === 'string')
  );
}

function serializeSlotFoldersSetting(folders: string[]): string {
  return serializeSetting({ version: 1, folders: normalizeFolderPaths(folders) });
}

type DeleteFolderResponse = {
  ok: true;
  folder: string;
  targetSlotCount: number;
  deletedSlotIds: string[];
  failedRootSlotIds: string[];
  warnings: string[];
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface SlotsState {
  slots: ImageStudioSlotRecord[];
  slotsQuery: UseQueryResult<StudioSlotsResponse>;
  slotSelectionLocked: boolean;
  selectedSlotId: string | null;
  selectedSlot: ImageStudioSlotRecord | null;
  workingSlotId: string | null;
  workingSlot: ImageStudioSlotRecord | null;
  virtualFolders: string[];
  selectedFolder: string;
  // Slot UI
  slotCreateOpen: boolean;
  driveImportOpen: boolean;
  driveImportMode: 'create' | 'replace' | 'temporary-object' | 'environment';
  driveImportTargetId: string | null;
  temporaryObjectUpload: ImageStudioUploadedAsset | null;
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
  setSlotSelectionLocked: (locked: boolean) => void;
  setVirtualFolders: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedFolder: (f: string) => void;
  createSlots: (slots: CreateImageStudioSlotDto[]) => Promise<ImageStudioSlotRecord[]>;
  updateSlotMutation: UseMutationResult<
    ImageStudioSlotRecord,
    Error,
    { id: string; data: UpdateImageStudioSlotDto }
  >;
  deleteSlotMutation: UseMutationResult<void, Error, string>;
  moveSlot: (input: { slot: ImageStudioSlotRecord; targetFolder: string }) => Promise<void>;
  handleMoveFolder: (folderPath: string, targetFolder: string) => Promise<void>;
  handleRenameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
  handleDeleteFolder: (folderPath: string) => Promise<void>;
  createFolderMutation: UseMutationResult<string, Error, string>;
  uploadMutation: UseMutationResult<
    StudioAssetImportResult,
    Error,
    { files: File[]; folder: string }
  >;
  importFromDriveMutation: UseMutationResult<
    StudioAssetImportResult,
    Error,
    { files: ImageFileSelection[]; folder: string }
  >;
  // Slot UI
  setSlotCreateOpen: (o: boolean) => void;
  setDriveImportOpen: (o: boolean) => void;
  setDriveImportMode: (m: 'create' | 'replace' | 'temporary-object' | 'environment') => void;
  setDriveImportTargetId: (id: string | null) => void;
  setTemporaryObjectUpload: React.Dispatch<React.SetStateAction<ImageStudioUploadedAsset | null>>;
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
  const [slotSelectionLocked, setSlotSelectionLocked] = useState<boolean>(false);

  const slots = useMemo(() => slotsQuery.data?.slots ?? [], [slotsQuery.data?.slots]);
  const slotIdSet = useMemo(
    () => new Set(slots.map((slot: ImageStudioSlotRecord) => slot.id)),
    [slots]
  );
  const missingSelectedSlotTrackerRef = useRef<{ id: string; firstMissingAt: number } | null>(null);
  const missingWorkingSlotTrackerRef = useRef<{ id: string; firstMissingAt: number } | null>(null);
  const selectedSlot = useMemo(
    () => slots.find((s: ImageStudioSlotRecord) => s.id === selectedSlotId) ?? null,
    [slots, selectedSlotId]
  );
  const workingSlot = useMemo(
    () => slots.find((s: ImageStudioSlotRecord) => s.id === workingSlotId) ?? null,
    [slots, workingSlotId]
  );

  useEffect(() => {
    if (!selectedSlotId || slotIdSet.has(selectedSlotId)) {
      missingSelectedSlotTrackerRef.current = null;
      return;
    }

    if (slotSelectionLocked || slotsQuery.isFetching || slotsQuery.isPending) {
      return;
    }

    const previous = missingSelectedSlotTrackerRef.current;
    const now = Date.now();
    if (previous?.id !== selectedSlotId) {
      missingSelectedSlotTrackerRef.current = { id: selectedSlotId, firstMissingAt: now };
      return;
    }

    if (now - previous.firstMissingAt < SLOT_FALLBACK_MISSING_GRACE_MS) {
      return;
    }

    missingSelectedSlotTrackerRef.current = null;
    if (workingSlotId && slotIdSet.has(workingSlotId)) {
      setSelectedSlotId(workingSlotId);
      return;
    }
    setSelectedSlotId(slots[0]?.id ?? null);
  }, [
    selectedSlotId,
    slotIdSet,
    slots,
    slotsQuery.isFetching,
    slotsQuery.isPending,
    slotSelectionLocked,
    workingSlotId,
  ]);

  useEffect(() => {
    if (!workingSlotId || slotIdSet.has(workingSlotId)) {
      missingWorkingSlotTrackerRef.current = null;
      return;
    }

    if (slotSelectionLocked || slotsQuery.isFetching || slotsQuery.isPending) {
      return;
    }

    const previous = missingWorkingSlotTrackerRef.current;
    const now = Date.now();
    if (previous?.id !== workingSlotId) {
      missingWorkingSlotTrackerRef.current = { id: workingSlotId, firstMissingAt: now };
      return;
    }

    if (now - previous.firstMissingAt < SLOT_FALLBACK_MISSING_GRACE_MS) {
      return;
    }

    missingWorkingSlotTrackerRef.current = null;
    if (selectedSlotId && slotIdSet.has(selectedSlotId)) {
      setWorkingSlotId(selectedSlotId);
      return;
    }
    setWorkingSlotId(slots[0]?.id ?? null);
  }, [
    selectedSlotId,
    slotIdSet,
    slots,
    slotsQuery.isFetching,
    slotsQuery.isPending,
    slotSelectionLocked,
    workingSlotId,
  ]);

  // ── Folders ──
  const [selectedFolder, setSelectedFolderRaw] = useState<string>('');
  const [virtualFolders, setVirtualFolders] = useState<string[]>([]);

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const treeKey = useMemo(
    () =>
      projectId ? `${IMAGE_STUDIO_TREE_KEY_PREFIX}${sanitizeStudioProjectId(projectId)}` : null,
    [projectId]
  );
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
      const derived = normalizeFolderPaths(
        slots.map((s: ImageStudioSlotRecord) => s.folderPath || '').filter(Boolean)
      );
      setVirtualFolders(derived);
    }
    hydratedTreeSignatureRef.current = signature;
  }, [projectId, treeKey, treeSettingsRaw, settingsStore.isLoading, slots]);

  const persistFolders = useCallback(
    async (nextFolders: string[]) => {
      if (!treeKey) return;
      await updateSetting.mutateAsync({
        key: treeKey,
        value: serializeSlotFoldersSetting(nextFolders),
      });
    },
    [treeKey, updateSetting]
  );

  const handleSelectFolder = useCallback((folder: string): void => {
    setSelectedFolderRaw(folder);
    setSelectedSlotId(null);
  }, []);

  // ── Slot UI state ──
  const [slotCreateOpen, setSlotCreateOpen] = useState<boolean>(false);
  const [driveImportOpen, setDriveImportOpen] = useState<boolean>(false);
  const [driveImportMode, setDriveImportMode] = useState<
    'create' | 'replace' | 'temporary-object' | 'environment'
  >('create');
  const [driveImportTargetId, setDriveImportTargetId] = useState<string | null>(null);
  const [temporaryObjectUpload, setTemporaryObjectUpload] =
    useState<ImageStudioUploadedAsset | null>(null);
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
    if (!projectId || !projectSessionKey || settingsStore.isLoading || heavySettings.isLoading)
      return;
    const signature = `${projectSessionKey}:${projectSessionRaw ?? ''}`;
    if (hydratedSessionSignatureRef.current === signature) return;

    const session = resolveImageStudioProjectSession(projectSessionRaw, projectId);
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
    setSlotSelectionLocked(false);
    setSelectedFolderRaw('');
    setCompositeAssetIds([]);
    setPreviewMode('image');
    setTemporaryObjectUpload(null);
    hydratedSessionSignatureRef.current = null;
  }, [projectId]);

  const compositeAssetOptions = useMemo(() => {
    const baseId = workingSlotId ?? selectedSlotId;
    return slots
      .map((s: ImageStudioSlotRecord) => ({
        value: s.id,
        label: s.folderPath ? `${s.folderPath}/${s.name || s.id}` : s.name || s.id,
        disabled: s.id === baseId,
      }))
      .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));
  }, [slots, selectedSlotId, workingSlotId]);

  const compositeAssets = useMemo(
    () =>
      compositeAssetIds
        .map((id) => slots.find((s: ImageStudioSlotRecord) => s.id === id))
        .filter((s): s is ImageStudioSlotRecord => Boolean(s)),
    [slots, compositeAssetIds]
  );

  // ── Mutations ──
  const createSlotsMutation = useCreateStudioSlots(projectId);
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
    [createSlotsMutation]
  );

  const updateSlotMutation = useUpdateStudioSlot(projectId);
  const deleteSlotMutation = useDeleteStudioSlot(projectId);
  const uploadMutation = useUploadStudioAssets(projectId);
  const importFromDriveMutation = useImportStudioAssetsFromDrive(projectId);

  const moveSlot = useCallback(
    async (input: { slot: ImageStudioSlotRecord; targetFolder: string }): Promise<void> => {
      const { slot, targetFolder } = input;
      const normalizedTarget = targetFolder.trim();

      // Optimistic cache update — move the slot to the target folder immediately.
      queryClient.setQueryData(slotsQueryKey, (current: StudioSlotsResponse | undefined) => {
        if (!current) return current;
        const targetFolderPath = normalizedTarget || null;
        const existingSlot = current.slots.find(
          (item: ImageStudioSlotRecord) => item.id === slot.id
        );
        if (existingSlot?.folderPath === targetFolderPath) return current; // no-op: already at target
        const nextSlots = current.slots.map((item: ImageStudioSlotRecord) =>
          item.id === slot.id ? { ...item, folderPath: targetFolderPath } : item
        );
        return { ...current, slots: nextSlots };
      });

      // Use the existing updateSlotMutation (same endpoint as rename, proven to work).
      // Its onSuccess invalidation will eventually sync the cache with the server.
      await updateSlotMutation.mutateAsync({
        id: slot.id,
        data: { folderPath: normalizedTarget || null },
      });
      // Cancel the background refetch triggered by updateSlotMutation's onSettled
      // (invalidateImageStudioSlots). The cache already has correct data from onSuccess.
      // Without this, the refetch completes after the tree's isApplying guard drops
      // and replaceNodes overwrites the optimistic state, causing a "jump back".
    },
    [updateSlotMutation]
  );

  const handleMoveFolder = useCallback(
    async (folderPath: string, targetFolder: string) => {
      const source = normalizeTreePath(folderPath);
      const target = normalizeTreePath(targetFolder);
      if (!canMoveTreePath(source, target)) return;

      const sourceLeaf = getTreePathLeaf(source);
      const rebasedRoot = target ? `${target}/${sourceLeaf}` : sourceLeaf;
      const rebasePath = (value: string): string => {
        return rebaseTreePath(value, source, rebasedRoot);
      };

      const nextFolders = normalizeFolderPaths(
        virtualFolders.map((path: string) => rebasePath(path))
      );
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

        queryClient.setQueryData(slotsQueryKey, (current: StudioSlotsResponse | undefined) => {
          if (!current) return current;
          const nextSlots = current.slots.map((slot: ImageStudioSlotRecord) => {
            const nextFolderPath = optimisticNextById.get(slot.id);
            if (nextFolderPath === undefined) return slot;
            return { ...slot, folderPath: nextFolderPath || null };
          });
          if (nextSlots.every((s: ImageStudioSlotRecord, i: number) => s === current.slots[i]))
            return current;
          return { ...current, slots: nextSlots };
        });

        void Promise.allSettled(
          affectedSlots.map((slot: ImageStudioSlotRecord) => {
            const next = optimisticNextById.get(slot.id) ?? '';
            return api.patch(`/api/image-studio/slots/${encodeURIComponent(slot.id)}`, {
              folderPath: next,
            });
          })
        ).then(() => {
        });
        return;
      }

    },
    [virtualFolders, persistFolders, slots]
  );

  const handleRenameFolder = useCallback(
    async (folderPath: string, nextFolderPath: string) => {
      const source = normalizeTreePath(folderPath);
      const target = normalizeTreePath(nextFolderPath);
      if (!canMoveTreePath(source, target)) return;

      const rebasePath = (value: string): string => {
        return rebaseTreePath(value, source, target);
      };

      const nextFolders = normalizeFolderPaths(
        virtualFolders.map((path: string) => rebasePath(path))
      );
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

        queryClient.setQueryData(slotsQueryKey, (current: StudioSlotsResponse | undefined) => {
          if (!current) return current;
          const nextSlots = current.slots.map((slot: ImageStudioSlotRecord) => {
            const nextPath = optimisticNextById.get(slot.id);
            if (nextPath === undefined) return slot;
            return { ...slot, folderPath: nextPath || null };
          });
          if (nextSlots.every((s: ImageStudioSlotRecord, i: number) => s === current.slots[i]))
            return current;
          return { ...current, slots: nextSlots };
        });

        await Promise.allSettled(
          affectedSlots.map((slot: ImageStudioSlotRecord) => {
            const next = optimisticNextById.get(slot.id) ?? '';
            return api.patch(`/api/image-studio/slots/${encodeURIComponent(slot.id)}`, {
              folderPath: next,
            });
          })
        );
      }

      const normalizedSelectedFolder = normalizeTreePath(selectedFolder);
      if (isTreePathWithin(normalizedSelectedFolder, source)) {
        setSelectedFolderRaw(rebasePath(normalizedSelectedFolder));
      }

    },
    [virtualFolders, persistFolders, slots, selectedFolder]
  );

  const handleDeleteFolder = useCallback(
    async (folderPath: string) => {
      if (!projectId) return;

      const source = normalizeTreePath(folderPath);
      if (!source) return;

      const isWithinSource = (value: string): boolean => isTreePathWithin(value, source);

      const nextFolders = normalizeFolderPaths(
        virtualFolders.filter((path: string) => !isWithinSource(path))
      );
      setVirtualFolders(nextFolders);
      void persistFolders(nextFolders);

      const normalizedSelectedFolder = normalizeTreePath(selectedFolder);
      if (normalizedSelectedFolder && isWithinSource(normalizedSelectedFolder)) {
        setSelectedFolderRaw('');
      }

      try {
        const response = await api.delete<DeleteFolderResponse>(
          `/api/image-studio/projects/${encodeURIComponent(projectId)}/folders`,
          {
            params: { folder: source },
            timeout: 120_000,
          }
        );

        const deletedSlotIds = new Set(
          (response.deletedSlotIds ?? []).filter(
            (value): value is string => typeof value === 'string' && value.trim().length > 0
          )
        );
        if (deletedSlotIds.size > 0) {
          queryClient.setQueryData(slotsQueryKey, (current: StudioSlotsResponse | undefined) => {
            if (!current) return current;
            return {
              ...current,
              slots: current.slots.filter(
                (slot: ImageStudioSlotRecord) => !deletedSlotIds.has(slot.id)
              ),
            };
          });

          if (selectedSlotId && deletedSlotIds.has(selectedSlotId)) {
            setSelectedSlotId(null);
          }
          if (workingSlotId && deletedSlotIds.has(workingSlotId)) {
            setWorkingSlotId(null);
          }
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
      selectedSlotId,
      workingSlotId,
      selectedFolder,
      queryClient,
      slotsQueryKey,
    ]
  );

  const createFolderMutation = createCreateMutationV2<string, string>({
    mutationKey: studioKeys.mutation('folders.create'),
    mutationFn: async (folder: string) => {
      const expanded = expandFolderPath(folder);
      const nextFolders = normalizeFolderPaths([...virtualFolders, ...expanded]);
      await persistFolders(nextFolders);
      return expanded[expanded.length - 1]!;
    },
    onSuccess: (folder) => {
      setVirtualFolders((prev) => normalizeFolderPaths([...prev, ...expandFolderPath(folder)]));
      setSelectedFolderRaw(folder);
      toast('Folder created.', { variant: 'success' });
    },
    meta: {
      source: 'image-studio.folders.create',
      operation: 'create',
      resource: 'image-studio.folders',
      domain: 'image_studio',
      tags: ['image-studio', 'folders', 'tree'],
    },
  });

  // ── Memoized value ──

  const state = useMemo<SlotsState>(
    () => ({
      slots,
      slotsQuery,
      slotSelectionLocked,
      selectedSlotId,
      selectedSlot,
      workingSlotId,
      workingSlot,
      virtualFolders,
      selectedFolder,
      slotCreateOpen,
      driveImportOpen,
      driveImportMode,
      driveImportTargetId,
      temporaryObjectUpload,
      slotUpdateBusy,
      slotInlineEditOpen,
      slotImageUrlDraft,
      slotBase64Draft,
      moveTargetFolder,
      compositeAssetIds,
      compositeAssets,
      compositeAssetOptions,
      previewMode,
      captureRef,
    }),
    [
      slots,
      slotsQuery,
      slotSelectionLocked,
      selectedSlotId,
      selectedSlot,
      workingSlotId,
      workingSlot,
      virtualFolders,
      selectedFolder,
      slotCreateOpen,
      driveImportOpen,
      driveImportMode,
      driveImportTargetId,
      temporaryObjectUpload,
      slotUpdateBusy,
      slotInlineEditOpen,
      slotImageUrlDraft,
      slotBase64Draft,
      moveTargetFolder,
      compositeAssetIds,
      compositeAssets,
      compositeAssetOptions,
      previewMode,
    ]
  );

  const actions = useMemo<SlotsActions>(
    () => ({
      setSelectedSlotId,
      setWorkingSlotId,
      setSlotSelectionLocked,
      setVirtualFolders,
      setSelectedFolder: handleSelectFolder,
      createSlots,
      updateSlotMutation,
      deleteSlotMutation,
      moveSlot,
      handleMoveFolder,
      handleRenameFolder,
      handleDeleteFolder,
      createFolderMutation,
      uploadMutation,
      importFromDriveMutation,
      setSlotCreateOpen,
      setDriveImportOpen,
      setDriveImportMode,
      setDriveImportTargetId,
      setTemporaryObjectUpload,
      setSlotUpdateBusy,
      setSlotInlineEditOpen,
      setSlotImageUrlDraft,
      setSlotBase64Draft,
      setMoveTargetFolder,
      setCompositeAssetIds,
      setPreviewMode,
    }),
    [
      handleSelectFolder,
      createSlots,
      updateSlotMutation,
      deleteSlotMutation,
      moveSlot,
      handleMoveFolder,
      handleRenameFolder,
      handleDeleteFolder,
      createFolderMutation,
      uploadMutation,
      importFromDriveMutation,
      setTemporaryObjectUpload,
      setSlotSelectionLocked,
    ]
  );

  return (
    <SlotsActionsContext.Provider value={actions}>
      <SlotsStateContext.Provider value={state}>{children}</SlotsStateContext.Provider>
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
