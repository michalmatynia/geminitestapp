'use client';

import type {
  AiNode,
  Edge,
  PathMeta,
  PathConfig,
  ClusterPreset,
  DbQueryPreset,
  DbNodePreset,
  RuntimeState,
} from '@/shared/lib/ai-paths';

import { CanvasProvider, type ViewState } from './CanvasContext';
import { GraphProvider } from './GraphContext';
import { PersistenceProvider } from './PersistenceContext';
import { PresetsProvider } from './PresetsContext';
import { RunHistoryProvider } from './RunHistoryContext';
import { RuntimeProvider } from './RuntimeContext';
import { SelectionProvider } from './SelectionContext';

import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AiPathsProviderProps {
  children: ReactNode;
  /** Initial selected node ID (optional, for restoring state) */
  initialSelectedNodeId?: string | null | undefined;
  /** Initial canvas view (optional, for restoring state) */
  initialView?: ViewState | undefined;
  /** Initial cluster presets (optional, for restoring state) */
  initialClusterPresets?: ClusterPreset[] | undefined;
  /** Initial DB query presets (optional, for restoring state) */
  initialDbQueryPresets?: DbQueryPreset[] | undefined;
  /** Initial DB node presets (optional, for restoring state) */
  initialDbNodePresets?: DbNodePreset[] | undefined;
  /** Initial nodes (optional, for restoring state) */
  initialNodes?: AiNode[] | undefined;
  /** Initial edges (optional, for restoring state) */
  initialEdges?: Edge[] | undefined;
  /** Initial paths (optional, for restoring state) */
  initialPaths?: PathMeta[] | undefined;
  /** Initial path configs (optional, for restoring state) */
  initialPathConfigs?: Record<string, PathConfig> | undefined;
  /** Initial active path ID (optional, for restoring state) */
  initialActivePathId?: string | null | undefined;
  /** Initial runtime state (optional, for restoring state) */
  initialRuntimeState?: RuntimeState | undefined;
  /** Initial loading state (optional, default true) */
  initialLoading?: boolean | undefined;
}

// ---------------------------------------------------------------------------
// Root Provider
// ---------------------------------------------------------------------------

/**
 * Root provider that composes all AI-Paths context providers.
 *
 * Provider order (innermost first, outermost last):
 * 1. SelectionProvider - Selection state (no dependencies)
 * 2. CanvasProvider - Canvas state (view, pan, drag, connecting)
 * 3. PresetsProvider - Presets state (cluster, db query, db node presets)
 * 4. RunHistoryProvider - Run history state (detail panel, streaming, filters)
 * 5. GraphProvider - Graph state (nodes, edges, paths, pathConfigs)
 * 6. RuntimeProvider - Runtime state (inputs, outputs, samples, errors)
 * 7. PersistenceProvider - Persistence state (loading, saving, autoSave)
 *
 * Components consume via hooks: useSelection(), useCanvas(), usePresets(), useRunHistory(), useGraph(), useRuntime(), usePersistence()
 */
export function AiPathsProvider(props: AiPathsProviderProps): React.ReactNode {
  const {
    children,
    initialSelectedNodeId,
    initialView,
    initialClusterPresets,
    initialDbQueryPresets,
    initialDbNodePresets,
    initialNodes,
    initialEdges,
    initialPaths,
    initialPathConfigs,
    initialActivePathId,
    initialRuntimeState,
    initialLoading,
  } = props;

  return (
    <SelectionProvider initialSelectedNodeId={initialSelectedNodeId}>
      <CanvasProvider initialView={initialView}>
        <PresetsProvider
          initialClusterPresets={initialClusterPresets}
          initialDbQueryPresets={initialDbQueryPresets}
          initialDbNodePresets={initialDbNodePresets}
        >
          <RunHistoryProvider>
            <GraphProvider
              initialNodesData={initialNodes}
              initialEdgesData={initialEdges}
              initialPaths={initialPaths}
              initialPathConfigs={initialPathConfigs}
              initialActivePathId={initialActivePathId}
            >
              <RuntimeProvider initialRuntimeState={initialRuntimeState}>
                <PersistenceProvider initialLoading={initialLoading}>
                  {children}
                </PersistenceProvider>
              </RuntimeProvider>
            </GraphProvider>
          </RunHistoryProvider>
        </PresetsProvider>
      </CanvasProvider>
    </SelectionProvider>
  );
}
