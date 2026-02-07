'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { extractParamsFromPrompt, inferParamSpecs, validateImageStudioParams, setDeepValue, type ParamIssue, type ParamSpec, type ExtractParamsResult } from '@/features/prompt-engine/prompt-params';
import { type VectorShape, type VectorToolMode } from '@/features/vector-drawing';
import type { Asset3DRecord } from '@/features/viewer3d/types';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { ImageFileSelection, ImageFileRecord } from '@/shared/types/files';
import { useToast } from '@/shared/ui';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import { type ParamUiControl } from '../utils/param-ui';
import { IMAGE_STUDIO_SETTINGS_KEY, parseImageStudioSettings, type ImageStudioSettings, defaultImageStudioSettings } from '../utils/studio-settings';
import { expandFolderPath, normalizeFolderPaths, IMAGE_STUDIO_TREE_KEY_PREFIX } from '../utils/studio-tree';

export type StudioTab = 'studio' | 'projects' | 'settings' | 'validation';

export type ImageStudioSlotRecord = {
  id: string;
  projectId: string;
  name: string | null;
  folderPath: string | null;
  position?: number | null;
  imageFileId?: string | null;
  imageUrl?: string | null;
  imageBase64?: string | null;
  asset3dId?: string | null;
  screenshotFileId?: string | null;
  metadata?: Record<string, unknown> | null;
  imageFile?: ImageFileRecord | null;
  screenshotFile?: ImageFileRecord | null;
  asset3d?: Asset3DRecord | null;
};

export type StudioProjectsResponse = { projects: string[] };
export type StudioSlotsResponse = { slots: ImageStudioSlotRecord[] };

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

interface ImageStudioContextValue {
  // Navigation & Tabs
  activeTab: StudioTab;
  setActiveTab: (tab: StudioTab) => void;
  handleTabChange: (value: string) => void;

  // Projects
  projectId: string;
  setProjectId: (id: string) => void;
  projectsQuery: UseQueryResult<string[]>;
  createProjectMutation: UseMutationResult<string, Error, string>;
  deleteProjectMutation: UseMutationResult<string, Error, string>;
  handleDeleteProject: (id: string) => Promise<void>;
  projectSearch: string;
  setProjectSearch: (s: string) => void;

  // Slots & Folders
  slots: ImageStudioSlotRecord[];
  slotsQuery: UseQueryResult<StudioSlotsResponse>;
  virtualFolders: string[];
  setVirtualFolders: React.Dispatch<React.SetStateAction<string[]>>;
  selectedFolder: string;
  setSelectedFolder: (f: string) => void;
  selectedSlotId: string | null;
  setSelectedSlotId: (id: string | null) => void;
  selectedSlot: ImageStudioSlotRecord | null;
  workingSlotId: string | null;
  setWorkingSlotId: (id: string | null) => void;
  workingSlot: ImageStudioSlotRecord | null;
  createSlots: (slots: Array<Partial<ImageStudioSlotRecord>>) => Promise<ImageStudioSlotRecord[]>;
  updateSlotMutation: UseMutationResult<ImageStudioSlotRecord, Error, { id: string; data: Partial<ImageStudioSlotRecord> }>;
  deleteSlotMutation: UseMutationResult<void, Error, string>;
  moveSlotMutation: UseMutationResult<ImageStudioSlotRecord, Error, { slot: ImageStudioSlotRecord; targetFolder: string }>;
  handleMoveFolder: (folderPath: string, targetFolder: string) => Promise<void>;
  createFolderMutation: UseMutationResult<string, Error, string>;
  uploadMutation: UseMutationResult<{ assets: string[] }, Error, { files: File[]; folder: string }>;
  importFromDriveMutation: UseMutationResult<{ assets: string[] }, Error, { files: ImageFileSelection[]; folder: string }>;
  
  // Slot UI
  slotCreateOpen: boolean;
  setSlotCreateOpen: (o: boolean) => void;
  driveImportOpen: boolean;
  setDriveImportOpen: (o: boolean) => void;
  driveImportMode: 'create' | 'replace';
  setDriveImportMode: (m: 'create' | 'replace') => void;
  driveImportTargetId: string | null;
  setDriveImportTargetId: (id: string | null) => void;
  slotUpdateBusy: boolean;
  setSlotUpdateBusy: (b: boolean) => void;
  slotInlineEditOpen: boolean;
  setSlotInlineEditOpen: (o: boolean) => void;
  slotImageUrlDraft: string;
  setSlotImageUrlDraft: (s: string) => void;
  slotBase64Draft: string;
  setSlotBase64Draft: (s: string) => void;
  moveTargetFolder: string;
  setMoveTargetFolder: (f: string) => void;

  // Composite & 3D
  compositeAssetIds: string[];
  setCompositeAssetIds: (ids: string[]) => void;
  compositeAssets: ImageStudioSlotRecord[];
  compositeAssetOptions: Array<{ value: string; label: string; disabled: boolean }>;
  previewMode: 'image' | '3d';
  setPreviewMode: (m: 'image' | '3d') => void;
  captureRef: React.MutableRefObject<(() => string | null) | null>;

  // Tools & Masking
  tool: VectorToolMode;
  setTool: (t: VectorToolMode) => void;
  maskShapes: VectorShape[];
  setMaskShapes: React.Dispatch<React.SetStateAction<VectorShape[]>>;
  activeMaskId: string | null;
  setActiveMaskId: (id: string | null) => void;
  selectedPointIndex: number | null;
  setSelectedPointIndex: (index: number | null) => void;
  maskInvert: boolean;
  setMaskInvert: (i: boolean) => void;
  maskFeather: number;
  setMaskFeather: (f: number) => void;
  brushRadius: number;
  setBrushRadius: (r: number) => void;
  maskGenLoading: boolean;
  maskGenMode: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges';
  setMaskGenMode: (m: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges') => void;

  // Prompt & Params
  promptText: string;
  setPromptText: (t: string) => void;
  paramsState: Record<string, unknown> | null;
  setParamsState: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  paramSpecs: Record<string, ParamSpec> | null;
  paramUiOverrides: Record<string, ParamUiControl>;
  paramFlipMap: Record<string, boolean>;
  issuesByPath: Record<string, ParamIssue[]>;
  onParamChange: (path: string, value: unknown) => void;
  onParamFlip: (path: string) => void;
  onParamUiControlChange: (path: string, control: ParamUiControl) => void;
  
  // Extraction UI
  extractReviewOpen: boolean;
  setExtractReviewOpen: (o: boolean) => void;
  extractDraftPrompt: string;
  setExtractDraftPrompt: (s: string) => void;
  extractPreviewUiOverrides: Record<string, ParamUiControl>;
  setExtractPreviewUiOverrides: React.Dispatch<React.SetStateAction<Record<string, ParamUiControl>>>;
  extractResult: ExtractParamsResult | null;
  applyProgrammaticExtraction: (sourcePrompt: string, options?: { toast?: boolean }) => ExtractParamsResult;

  // Settings
  studioSettings: ImageStudioSettings;
  setStudioSettings: React.Dispatch<React.SetStateAction<ImageStudioSettings>>;
  saveStudioSettings: () => Promise<void>;
  resetStudioSettings: () => void;
  handleRefreshSettings: () => void;
  settingsLoaded: boolean;
}

const ImageStudioContext = createContext<ImageStudioContextValue | null>(null);

export function useImageStudio(): ImageStudioContextValue {
  const context = useContext(ImageStudioContext);
  if (!context) {
    throw new Error('useImageStudio must be used within an ImageStudioProvider');
  }
  return context;
}

export function ImageStudioProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const settingsStore = useSettingsStore();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();

  const [projectId, setProjectId] = useState<string>('');

  const projectsQuery = useQuery({
    queryKey: ['image-studio', 'projects'],
    queryFn: async (): Promise<string[]> => {
      const res = await fetch('/api/image-studio/projects');
      if (!res.ok) throw new Error('Failed to load projects');
      const data = (await res.json()) as StudioProjectsResponse;
      return Array.isArray(data.projects) ? data.projects : [];
    },
    staleTime: 10_000,
  });

  const slotsQuery = useQuery({
    queryKey: ['image-studio', 'slots', projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<StudioSlotsResponse> => {
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`);
      if (!res.ok) throw new Error('Failed to load slots');
      return (await res.json()) as StudioSlotsResponse;
    },
  });

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [workingSlotId, setWorkingSlotId] = useState<string | null>(null);

  const slots = useMemo(() => slotsQuery.data?.slots ?? [], [slotsQuery.data?.slots]);
  const selectedSlot = useMemo(() => slots.find(s => s.id === selectedSlotId) ?? null, [slots, selectedSlotId]);
  const workingSlot = useMemo(() => slots.find(s => s.id === workingSlotId) ?? null, [slots, workingSlotId]);

  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [studioSettings, setStudioSettings] = useState<ImageStudioSettings>(defaultImageStudioSettings);
  
  const [activeTab, setActiveTab] = useState<StudioTab>('studio');
  const [projectSearch, setProjectSearch] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [compositeAssetIds, setCompositeAssetIds] = useState<string[]>([]);
  const [virtualFolders, setVirtualFolders] = useState<string[]>([]);
  
  const [driveImportOpen, setDriveImportOpen] = useState<boolean>(false);
  const [driveImportMode, setDriveImportMode] = useState<'create' | 'replace'>('create');
  const [driveImportTargetId, setDriveImportTargetId] = useState<string | null>(null);
  const [slotCreateOpen, setSlotCreateOpen] = useState<boolean>(false);
  const [slotUpdateBusy, setSlotUpdateBusy] = useState<boolean>(false);
  const [slotInlineEditOpen, setSlotInlineEditOpen] = useState<boolean>(false);
  const [slotImageUrlDraft, setSlotImageUrlDraft] = useState<string>('');
  const [slotBase64Draft, setSlotBase64Draft] = useState<string>('');
  const [moveTargetFolder, setMoveTargetFolder] = useState<string>('');

  const createProjectMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await fetch('/api/image-studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      });
      const data = (await res.json()) as { projectId?: string; error?: string };
      if (!res.ok) throw new Error(data?.error || 'Failed to create project');
      return data.projectId!;
    },
    onSuccess: (createdId: string) => {
      queryClient.invalidateQueries({ queryKey: ['image-studio', 'projects'] });
      setProjectId(createdId);
      toast('Project created.', { variant: 'success' });
    },
  }) as UseMutationResult<string, Error, string>;

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete project');
      return id;
    },
    onSuccess: (deletedId: string) => {
      queryClient.invalidateQueries({ queryKey: ['image-studio', 'projects'] });
      if (projectId === deletedId) {
        setProjectId('');
      }
      toast('Project deleted.', { variant: 'success' });
    },
  }) as UseMutationResult<string, Error, string>;

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm(`Delete project "${id}" and all its slots?`)) return;
    await deleteProjectMutation.mutateAsync(id);
  };

  const [tool, setTool] = useState<VectorToolMode>('select');
  const [maskShapes, setMaskShapes] = useState<VectorShape[]>([]);
  const [activeMaskId, setActiveMaskId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [maskInvert, setMaskInvert] = useState<boolean>(false);
  const [maskFeather, setMaskFeather] = useState<number>(0);
  const [brushRadius, setBrushRadius] = useState<number>(8);

  const [promptText, setPromptText] = useState<string>('');
  const [extractReviewOpen, setExtractReviewOpen] = useState<boolean>(false);
  const [extractDraftPrompt, setExtractDraftPrompt] = useState<string>('');
  const [extractPreviewUiOverrides, setExtractPreviewUiOverrides] = useState<Record<string, ParamUiControl>>({});
  const [extractResult, setExtractResult] = useState<ExtractParamsResult | null>(null);
  const [paramsState, setParamsState] = useState<Record<string, unknown> | null>(null);
  const [paramSpecs, setParamSpecs] = useState<Record<string, ParamSpec> | null>(null);
  const [paramUiOverrides, setParamUiOverrides] = useState<Record<string, ParamUiControl>>({});
  const [paramFlipMap, setParamFlipMap] = useState<Record<string, boolean>>({});
  const [previewMode, setPreviewMode] = useState<'image' | '3d'>('image');
  const captureRef = useRef<(() => string | null) | null>(null);
  const [maskGenLoading, _setMaskGenLoading] = useState<boolean>(false);
  const [maskGenMode, setMaskGenMode] = useState<'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges'>('ai-polygon');

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const studioSettingsRaw = heavyMap.get(IMAGE_STUDIO_SETTINGS_KEY);
  const openaiModelFallback = settingsStore.get('openai_model');
  
  useEffect(() => {
    if (settingsLoaded) return;
    if (settingsStore.isLoading || heavySettings.isLoading) return;

    const stored = parseImageStudioSettings(studioSettingsRaw);
    const hydrated: ImageStudioSettings =
      openaiModelFallback && stored.targetAi.openai.model === defaultImageStudioSettings.targetAi.openai.model
        ? {
          ...stored,
          targetAi: {
            ...stored.targetAi,
            openai: {
              ...stored.targetAi.openai,
              model: openaiModelFallback,
            },
          },
        }
        : stored;

    setStudioSettings(hydrated);
    setSettingsLoaded(true);
  }, [settingsLoaded, settingsStore.isLoading, heavySettings.isLoading, studioSettingsRaw, openaiModelFallback]);

  const handleTabChange = useCallback(
    (value: string): void => {
      const nextTab = value as StudioTab;
      setActiveTab(nextTab);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (nextTab === 'studio') {
        params.delete('tab');
      } else {
        params.set('tab', nextTab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  // Line 348 fix:
  const treeKey = useMemo(() => projectId ? `${IMAGE_STUDIO_TREE_KEY_PREFIX}${sanitizeStudioProjectId(projectId)}` : null, [projectId]);
  const treeSettingsRaw = treeKey ? heavyMap.get(treeKey) : undefined;

  useEffect(() => {
    if (!projectId || !treeKey || settingsStore.isLoading) return;
    const storedFolders = parseSlotFoldersSetting(treeSettingsRaw);
    if (storedFolders.length > 0) {
      setVirtualFolders(storedFolders);
    } else {
      const derived = normalizeFolderPaths(slots.map(s => s.folderPath || '').filter(Boolean));
      setVirtualFolders(derived);
    }
  }, [projectId, treeKey, treeSettingsRaw, settingsStore.isLoading, slots]);

  const persistFolders = useCallback(async (nextFolders: string[]) => {
    if (!treeKey) return;
    await updateSetting.mutateAsync({
      key: treeKey,
      value: serializeSlotFoldersSetting(nextFolders),
    });
  }, [treeKey, updateSetting]);

  const createSlots = useCallback(async (slotsToCreate: Array<Partial<ImageStudioSlotRecord>>) => {
    if (!projectId) throw new Error('No project selected');
    const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: slotsToCreate }),
    });
    const data = (await res.json()) as StudioSlotsResponse & { error?: string };
    if (!res.ok) throw new Error(data.error || 'Failed to create slots');
    queryClient.invalidateQueries({ queryKey: ['image-studio', 'slots', projectId] });
    return data.slots;
  }, [projectId, queryClient]);

  const updateSlotMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImageStudioSlotRecord> }): Promise<ImageStudioSlotRecord> => {
      const res = await fetch(`/api/image-studio/slots/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update slot');
      return (await res.json()) as ImageStudioSlotRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-studio', 'slots', projectId] });
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/image-studio/slots/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete slot');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-studio', 'slots', projectId] });
      toast('Slot deleted.', { variant: 'success' });
    },
  });

  const moveSlotMutation = useMutation({
    mutationFn: async ({ slot, targetFolder }: { slot: ImageStudioSlotRecord; targetFolder: string }): Promise<ImageStudioSlotRecord> => {
      return updateSlotMutation.mutateAsync({ id: slot.id, data: { folderPath: targetFolder || null } });
    },
  });

  const handleMoveFolder = useCallback(async (folderPath: string, targetFolder: string) => {
    const nextFolders = normalizeFolderPaths(virtualFolders.map(p => {
      if (p === folderPath) return targetFolder ? `${targetFolder}/${p.split('/').pop()}` : p.split('/').pop()!;
      if (p.startsWith(`${folderPath}/`)) {
        const base = targetFolder ? `${targetFolder}/${folderPath.split('/').pop()}` : folderPath.split('/').pop()!;
        return `${base}${p.slice(folderPath.length)}`;
      }
      return p;
    }));
    setVirtualFolders(nextFolders);
    void persistFolders(nextFolders);
    // In a real app, you'd also update all slots in these folders via API
    queryClient.invalidateQueries({ queryKey: ['image-studio', 'slots', projectId] });
  }, [virtualFolders, persistFolders, queryClient, projectId]);

  const createFolderMutation = useMutation({
    mutationFn: async (folder: string) => {
      const expanded = expandFolderPath(folder);
      const nextFolders = normalizeFolderPaths([...virtualFolders, ...expanded]);
      await persistFolders(nextFolders);
      return expanded[expanded.length - 1]!;
    },
    onSuccess: (folder) => {
      setVirtualFolders(prev => normalizeFolderPaths([...prev, ...expandFolderPath(folder)]));
      setSelectedFolder(folder);
      toast('Folder created.', { variant: 'success' });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ files, folder: _folder }: { files: File[]; folder: string }): Promise<{ assets: string[] }> => {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return (await res.json()) as { assets: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-studio', 'slots', projectId] });
      toast('Upload complete.', { variant: 'success' });
    },
  });

  const importFromDriveMutation = useMutation({
    mutationFn: async ({ files, folder: _folder }: { files: ImageFileSelection[]; folder: string }): Promise<{ assets: string[] }> => {
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, folder: _folder }),
      });
      if (!res.ok) throw new Error('Import failed');
      return (await res.json()) as { assets: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-studio', 'slots', projectId] });
      toast('Import complete.', { variant: 'success' });
    },
  });

  const handleParamChange = useCallback((path: string, value: unknown) => {
    setParamsState(prev => prev ? setDeepValue(prev, path, value) : null);
  }, []);

  const handleParamUiControlChange = useCallback((path: string, nextControl: ParamUiControl) => {
    setParamUiOverrides(prev => {
      if (nextControl === 'auto') {
        const { [path]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [path]: nextControl };
    });
  }, []);

  const handleParamFlip = useCallback((path: string) => {
    setParamFlipMap(prev => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const validationIssues = useMemo(() => {
    if (!paramsState || !paramSpecs) return [];
    return validateImageStudioParams(paramsState, paramSpecs);
  }, [paramsState, paramSpecs]);

  const issuesByPath = useMemo(() => {
    const map: Record<string, ParamIssue[]> = {};
    validationIssues.forEach(i => { map[i.path] ??= []; map[i.path]!.push(i); });
    return map;
  }, [validationIssues]);

  const applyProgrammaticExtraction = useCallback((sourcePrompt: string, options?: { toast?: boolean }) => {
    const result = extractParamsFromPrompt(sourcePrompt);
    setExtractResult(result);
    if (!result.ok) {
      setParamsState(null);
      setParamSpecs(null);
      if (options?.toast !== false) toast(String(result.error), { variant: 'error' });
      return result;
    }
    setParamsState(result.params);
    setParamSpecs(inferParamSpecs(result.params, result.rawObjectText));
    if (options?.toast !== false) toast('Params extracted.', { variant: 'success' });
    return result;
  }, [toast]);

  const saveStudioSettings = useCallback(async () => {
    await updateSetting.mutateAsync({
      key: IMAGE_STUDIO_SETTINGS_KEY,
      value: serializeSetting(studioSettings),
    });
    toast('Settings saved.', { variant: 'success' });
  }, [studioSettings, updateSetting, toast]);

  const resetStudioSettings = useCallback(() => {
    setStudioSettings(defaultImageStudioSettings);
  }, []);

  const handleRefreshSettings = useCallback(() => {
    setSettingsLoaded(false);
    void settingsStore.refetch();
    void heavySettings.refetch();
  }, [settingsStore, heavySettings]);

  const compositeAssetOptions = useMemo(() => {
    const baseId = workingSlotId ?? selectedSlotId;
    return slots
      .map(s => ({ value: s.id, label: s.folderPath ? `${s.folderPath}/${s.name || s.id}` : (s.name || s.id), disabled: s.id === baseId }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [slots, selectedSlotId, workingSlotId]);

  const compositeAssets = useMemo(() => 
    compositeAssetIds.map(id => slots.find(s => s.id === id)).filter((s): s is ImageStudioSlotRecord => Boolean(s)),
  [slots, compositeAssetIds]);

  const value = {
    activeTab, setActiveTab, handleTabChange,
    projectId, setProjectId, projectsQuery, createProjectMutation, deleteProjectMutation, handleDeleteProject, projectSearch, setProjectSearch,
    slots, slotsQuery, virtualFolders, setVirtualFolders, selectedFolder, setSelectedFolder, selectedSlotId, setSelectedSlotId, selectedSlot,
    workingSlotId, setWorkingSlotId, workingSlot, createSlots, updateSlotMutation, deleteSlotMutation, moveSlotMutation, handleMoveFolder,
    createFolderMutation, uploadMutation, importFromDriveMutation,
    slotCreateOpen, setSlotCreateOpen, driveImportOpen, setDriveImportOpen, driveImportMode, setDriveImportMode,
    driveImportTargetId, setDriveImportTargetId, slotUpdateBusy, setSlotUpdateBusy, slotInlineEditOpen, setSlotInlineEditOpen,
    slotImageUrlDraft, setSlotImageUrlDraft, slotBase64Draft, setSlotBase64Draft, moveTargetFolder, setMoveTargetFolder,
    compositeAssetIds, setCompositeAssetIds, compositeAssets, compositeAssetOptions, previewMode, setPreviewMode, captureRef,
    tool, setTool, maskShapes, setMaskShapes, activeMaskId, setActiveMaskId, selectedPointIndex, setSelectedPointIndex, maskInvert, setMaskInvert, maskFeather, setMaskFeather,
    brushRadius, setBrushRadius, maskGenLoading, maskGenMode, setMaskGenMode,
    promptText, setPromptText, paramsState, setParamsState, paramSpecs, paramUiOverrides, paramFlipMap, issuesByPath,
    onParamChange: handleParamChange, onParamFlip: handleParamFlip, onParamUiControlChange: handleParamUiControlChange,
    extractReviewOpen, setExtractReviewOpen, extractDraftPrompt, setExtractDraftPrompt, extractPreviewUiOverrides, setExtractPreviewUiOverrides,
    extractResult, applyProgrammaticExtraction,
    studioSettings, setStudioSettings, saveStudioSettings, resetStudioSettings, handleRefreshSettings, settingsLoaded
  };

  return <ImageStudioContext.Provider value={value}>{children}</ImageStudioContext.Provider>;
}
