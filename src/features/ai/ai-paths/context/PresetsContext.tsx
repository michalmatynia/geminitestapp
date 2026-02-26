'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import type { ClusterPreset, DbQueryPreset, DbNodePreset, DatabaseConfig } from '@/features/ai/ai-paths/lib';
import { createPresetId, migrateDatabaseConfigCollections } from '@/features/ai/ai-paths/lib';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClusterPresetDraft {
  name: string;
  description: string;
  bundlePorts: string;
  template: string;
}

export interface PresetPersistenceHandlers {
  saveDbQueryPresets?: (nextPresets: DbQueryPreset[]) => Promise<void>;
  saveDbNodePresets?: (nextPresets: DbNodePreset[]) => Promise<void>;
}

export interface PresetsState {
  // Preset data
  clusterPresets: ClusterPreset[];
  dbQueryPresets: DbQueryPreset[];
  dbNodePresets: DbNodePreset[];

  // Editing state
  editingPresetId: string | null;
  presetDraft: ClusterPresetDraft;

  // Modal state
  presetsModalOpen: boolean;
  presetsJson: string;

  // Palette UI state
  expandedPaletteGroups: Set<string>;
  paletteCollapsed: boolean;
}

export interface PresetsActions {
  // Preset data setters
  setClusterPresets: (presets: ClusterPreset[] | ((prev: ClusterPreset[]) => ClusterPreset[])) => void;
  setDbQueryPresets: (presets: DbQueryPreset[] | ((prev: DbQueryPreset[]) => DbQueryPreset[])) => void;
  setDbNodePresets: (presets: DbNodePreset[] | ((prev: DbNodePreset[]) => DbNodePreset[])) => void;

  // Editing actions
  setEditingPresetId: (id: string | null) => void;
  setPresetDraft: (draft: ClusterPresetDraft | ((prev: ClusterPresetDraft) => ClusterPresetDraft)) => void;
  resetPresetDraft: () => void;
  loadPresetIntoDraft: (preset: ClusterPreset) => void;

  // Modal actions
  setPresetsModalOpen: (open: boolean) => void;
  setPresetsJson: (json: string) => void;

  // Palette actions
  togglePaletteGroup: (title: string) => void;
  setPaletteCollapsed: (collapsed: boolean) => void;
  setExpandedPaletteGroups: (groups: Set<string> | ((prev: Set<string>) => Set<string>)) => void;

  // Normalization utilities
  normalizeDbQueryPreset: (raw: Partial<DbQueryPreset>) => DbQueryPreset;
  normalizeDbNodePreset: (raw: Partial<DbNodePreset>) => DbNodePreset;
  normalizeClusterPreset: (raw: Partial<ClusterPreset>) => ClusterPreset;

  // Persistence handlers (injected by orchestrator/runtime layer)
  setPresetPersistenceHandlers: (handlers: PresetPersistenceHandlers) => void;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PRESET_DRAFT: ClusterPresetDraft = {
  name: '',
  description: '',
  bundlePorts: 'context\nmeta\ntrigger\ntriggerName\nentityJson\nentityId\nentityType\nresult',
  template: 'Write a summary for {{context.entity.title}}',
};

const DEFAULT_EXPANDED_GROUPS = new Set(['Triggers']);

// ---------------------------------------------------------------------------
// Contexts (split for re-render optimization)
// ---------------------------------------------------------------------------

const PresetsStateContext = createContext<PresetsState | null>(null);
const PresetsActionsContext = createContext<PresetsActions | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface PresetsProviderProps {
  children: ReactNode;
  initialClusterPresets?: ClusterPreset[] | undefined;
  initialDbQueryPresets?: DbQueryPreset[] | undefined;
  initialDbNodePresets?: DbNodePreset[] | undefined;
}

export function PresetsProvider({
  children,
  initialClusterPresets = [],
  initialDbQueryPresets = [],
  initialDbNodePresets = [],
}: PresetsProviderProps): React.ReactNode {
  // Preset data
  const [clusterPresets, setClusterPresetsInternal] = useState<ClusterPreset[]>(initialClusterPresets);
  const [dbQueryPresets, setDbQueryPresetsInternal] = useState<DbQueryPreset[]>(initialDbQueryPresets);
  const [dbNodePresets, setDbNodePresetsInternal] = useState<DbNodePreset[]>(initialDbNodePresets);

  // Editing state
  const [editingPresetId, setEditingPresetIdInternal] = useState<string | null>(null);
  const [presetDraft, setPresetDraftInternal] = useState<ClusterPresetDraft>(DEFAULT_PRESET_DRAFT);

  // Modal state
  const [presetsModalOpen, setPresetsModalOpenInternal] = useState(false);
  const [presetsJson, setPresetsJsonInternal] = useState('');

  // Palette UI state
  const [expandedPaletteGroups, setExpandedPaletteGroupsInternal] = useState<Set<string>>(DEFAULT_EXPANDED_GROUPS);
  const [paletteCollapsed, setPaletteCollapsedInternal] = useState(false);
  const presetPersistenceHandlersRef = useRef<PresetPersistenceHandlers>({});

  // Normalization utilities
  const normalizeClusterPreset = useCallback((raw: Partial<ClusterPreset>): ClusterPreset => {
    const now = new Date().toISOString();
    const bundlePorts = Array.isArray(raw.bundlePorts) ? raw.bundlePorts : [];
    return {
      id: raw.id && typeof raw.id === 'string' ? raw.id : createPresetId(),
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Cluster Preset',
      description: typeof raw.description === 'string' ? raw.description : '',
      bundlePorts,
      template: typeof raw.template === 'string' ? raw.template : '',
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? now,
    };
  }, []);

  const normalizeDbQueryPreset = useCallback((raw: Partial<DbQueryPreset>): DbQueryPreset => {
    const now = new Date().toISOString();
    return {
      id: raw.id && typeof raw.id === 'string' ? raw.id : createPresetId(),
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Query Preset',
      queryTemplate:
        typeof raw.queryTemplate === 'string' && raw.queryTemplate.trim()
          ? raw.queryTemplate
          : '{\n  "_id": "{{value}}"\n}',
      updateTemplate: typeof raw.updateTemplate === 'string' ? raw.updateTemplate : '',
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? now,
    };
  }, []);

  const normalizeDbNodePreset = useCallback((raw: Partial<DbNodePreset>): DbNodePreset => {
    const now = new Date().toISOString();
    const baseConfig = (raw.config && typeof raw.config === 'object'
      ? raw.config
      : { operation: 'query' }) as unknown as DatabaseConfig;
    const migrationResult = migrateDatabaseConfigCollections(baseConfig);
    const migratedConfig = migrationResult.databaseConfig ?? baseConfig;
    return {
      id: raw.id && typeof raw.id === 'string' ? raw.id : createPresetId(),
      name:
        typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Database Preset',
      description: typeof raw.description === 'string' ? raw.description : '',
      config: migratedConfig,
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? now,
    };
  }, []);

  const setPresetPersistenceHandlers = useCallback((handlers: PresetPersistenceHandlers) => {
    presetPersistenceHandlersRef.current = handlers;
  }, []);

  const saveDbQueryPresets = useCallback(
    async (nextPresets: DbQueryPreset[]): Promise<void> => {
      await (presetPersistenceHandlersRef.current.saveDbQueryPresets?.(nextPresets)
        ?? Promise.resolve());
    },
    []
  );

  const saveDbNodePresets = useCallback(
    async (nextPresets: DbNodePreset[]): Promise<void> => {
      await (presetPersistenceHandlersRef.current.saveDbNodePresets?.(nextPresets)
        ?? Promise.resolve());
    },
    []
  );

  // Actions are stable (empty deps array ensures they never change identity)
  const actions = useMemo<PresetsActions>(
    () => ({
      // Preset data setters
      setClusterPresets: setClusterPresetsInternal,
      setDbQueryPresets: setDbQueryPresetsInternal,
      setDbNodePresets: setDbNodePresetsInternal,

      // Editing actions
      setEditingPresetId: setEditingPresetIdInternal,
      setPresetDraft: setPresetDraftInternal,
      resetPresetDraft: () => {
        setEditingPresetIdInternal(null);
        setPresetDraftInternal(DEFAULT_PRESET_DRAFT);
      },
      loadPresetIntoDraft: (preset: ClusterPreset) => {
        setEditingPresetIdInternal(preset.id);
        setPresetDraftInternal({
          name: preset.name,
          description: preset.description ?? '',
          bundlePorts: preset.bundlePorts.join('\n'),
          template: preset.template ?? '',
        });
      },

      // Modal actions
      setPresetsModalOpen: setPresetsModalOpenInternal,
      setPresetsJson: setPresetsJsonInternal,

      // Palette actions
      togglePaletteGroup: (title: string) => {
        setExpandedPaletteGroupsInternal((prev) => {
          const next = new Set(prev);
          if (next.has(title)) {
            next.delete(title);
          } else {
            next.add(title);
          }
          return next;
        });
      },
      setPaletteCollapsed: setPaletteCollapsedInternal,
      setExpandedPaletteGroups: setExpandedPaletteGroupsInternal,

      // Normalization utilities
      normalizeDbQueryPreset,
      normalizeDbNodePreset,
      normalizeClusterPreset,
      setPresetPersistenceHandlers,
      saveDbQueryPresets,
      saveDbNodePresets,
    }),
    [
      normalizeDbQueryPreset,
      normalizeDbNodePreset,
      normalizeClusterPreset,
      setPresetPersistenceHandlers,
      saveDbQueryPresets,
      saveDbNodePresets,
    ]
  );

  const state = useMemo<PresetsState>(
    () => ({
      clusterPresets,
      dbQueryPresets,
      dbNodePresets,
      editingPresetId,
      presetDraft,
      presetsModalOpen,
      presetsJson,
      expandedPaletteGroups,
      paletteCollapsed,
    }),
    [
      clusterPresets,
      dbQueryPresets,
      dbNodePresets,
      editingPresetId,
      presetDraft,
      presetsModalOpen,
      presetsJson,
      expandedPaletteGroups,
      paletteCollapsed,
    ]
  );

  return (
    <PresetsActionsContext.Provider value={actions}>
      <PresetsStateContext.Provider value={state}>
        {children}
      </PresetsStateContext.Provider>
    </PresetsActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer Hooks
// ---------------------------------------------------------------------------

/**
 * Get the current presets state.
 * Components using this will re-render when presets state changes.
 */
export function usePresetsState(): PresetsState {
  const context = useContext(PresetsStateContext);
  if (!context) {
    throw new Error('usePresetsState must be used within a PresetsProvider');
  }
  return context;
}

/**
 * Get presets actions.
 * Components using this will NOT re-render when state changes.
 */
export function usePresetsActions(): PresetsActions {
  const context = useContext(PresetsActionsContext);
  if (!context) {
    throw new Error('usePresetsActions must be used within a PresetsProvider');
  }
  return context;
}

/**
 * Combined hook for components that need both state and actions.
 */
export function usePresets(): PresetsState & PresetsActions {
  const state = usePresetsState();
  const actions = usePresetsActions();
  return { ...state, ...actions };
}
