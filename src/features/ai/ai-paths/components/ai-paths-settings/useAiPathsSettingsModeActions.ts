import { useCallback } from 'react';

import type {
  AiNode,
  Edge,
  ParserSampleState,
  PathBlockedRunPolicy,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  AiPathsValidationConfig,
  PathMeta,
  PathRunMode,
  RuntimeState,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
  STORAGE_VERSION,
  createDefaultPathConfig,
} from '@/features/ai/ai-paths/lib';

type ToastFn = (
  message: string,
  options?: {
    variant?: 'info' | 'success' | 'warning' | 'error';
  },
) => void;

type UseAiPathsSettingsModeActionsInput = {
  activePathId: string | null;
  isPathLocked: boolean;
  isPathActive: boolean;
  setIsPathLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPathActive: React.Dispatch<React.SetStateAction<boolean>>;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  setExecutionMode: React.Dispatch<React.SetStateAction<PathExecutionMode>>;
  flowIntensity: PathFlowIntensity;
  setFlowIntensity: React.Dispatch<React.SetStateAction<PathFlowIntensity>>;
  runMode: PathRunMode;
  setRunMode: React.Dispatch<React.SetStateAction<PathRunMode>>;
  strictFlowMode: boolean;
  setStrictFlowMode: React.Dispatch<React.SetStateAction<boolean>>;
  blockedRunPolicy: PathBlockedRunPolicy;
  setBlockedRunPolicy: React.Dispatch<React.SetStateAction<PathBlockedRunPolicy>>;
  aiPathsValidation: AiPathsValidationConfig;
  historyRetentionPasses: number;
  setHistoryRetentionPasses: React.Dispatch<React.SetStateAction<number>>;
  nodes: AiNode[];
  edges: Edge[];
  pathName: string;
  pathDescription: string;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  runtimeState: RuntimeState;
  lastRunAt: string | null;
  selectedNodeId: string | null;
  pathConfigs: Record<string, PathConfig>;
  paths: PathMeta[];
  setPaths: React.Dispatch<React.SetStateAction<PathMeta[]>>;
  setPathConfigs: React.Dispatch<React.SetStateAction<Record<string, PathConfig>>>;
  persistPathSettings: (
    nextPaths: PathMeta[],
    nextActivePathId: string,
    nextConfig: PathConfig,
  ) => Promise<void>;
  persistSettingsBulk: (entries: Array<{ key: string; value: string }>) => Promise<void>;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string,
  ) => void;
  toast: ToastFn;
};

export type UseAiPathsSettingsModeActionsReturn = {
  handleExecutionModeChange: (mode: PathExecutionMode) => void;
  handleFlowIntensityChange: (intensity: PathFlowIntensity) => void;
  handleRunModeChange: (mode: PathRunMode) => void;
  handleStrictFlowModeChange: (enabled: boolean) => void;
  handleBlockedRunPolicyChange: (policy: PathBlockedRunPolicy) => void;
  handleHistoryRetentionChange: (passes: number) => Promise<void>;
  handleTogglePathLock: () => void;
  handleTogglePathActive: () => void;
};

export function useAiPathsSettingsModeActions({
  activePathId,
  isPathLocked,
  isPathActive,
  setIsPathLocked,
  setIsPathActive,
  activeTrigger,
  executionMode,
  setExecutionMode,
  flowIntensity,
  setFlowIntensity,
  runMode,
  setRunMode,
  strictFlowMode,
  setStrictFlowMode,
  blockedRunPolicy,
  setBlockedRunPolicy,
  aiPathsValidation,
  historyRetentionPasses,
  setHistoryRetentionPasses,
  nodes,
  edges,
  pathName,
  pathDescription,
  parserSamples,
  updaterSamples,
  runtimeState,
  lastRunAt,
  selectedNodeId,
  pathConfigs,
  paths,
  setPaths,
  setPathConfigs,
  persistPathSettings,
  persistSettingsBulk,
  reportAiPathsError,
  toast,
}: UseAiPathsSettingsModeActionsInput): UseAiPathsSettingsModeActionsReturn {
  const handleExecutionModeChange = useCallback(
    (mode: PathExecutionMode): void => {
      if (!activePathId) {
        setExecutionMode(mode);
        return;
      }
      if (isPathLocked) {
        toast('This path is locked. Unlock it to change execution mode.', {
          variant: 'info',
        });
        return;
      }
      setExecutionMode(mode);
      setPathConfigs(
        (prev: Record<string, PathConfig>): Record<string, PathConfig> => {
          const base = prev[activePathId] ?? createDefaultPathConfig(activePathId);
          return { ...prev, [activePathId]: { ...base, executionMode: mode } };
        },
      );
    },
    [activePathId, isPathLocked, setExecutionMode, setPathConfigs, toast],
  );

  const handleFlowIntensityChange = useCallback(
    (intensity: PathFlowIntensity): void => {
      if (!activePathId) {
        setFlowIntensity(intensity);
        return;
      }
      if (isPathLocked) {
        toast('This path is locked. Unlock it to change flow intensity.', {
          variant: 'info',
        });
        return;
      }
      setFlowIntensity(intensity);
      setPathConfigs(
        (prev: Record<string, PathConfig>): Record<string, PathConfig> => {
          const base = prev[activePathId] ?? createDefaultPathConfig(activePathId);
          return { ...prev, [activePathId]: { ...base, flowIntensity: intensity } };
        },
      );
    },
    [activePathId, isPathLocked, setFlowIntensity, setPathConfigs, toast],
  );

  const handleRunModeChange = useCallback(
    (mode: PathRunMode): void => {
      if (!activePathId) {
        setRunMode(mode);
        return;
      }
      if (isPathLocked) {
        toast('This path is locked. Unlock it to change run mode.', {
          variant: 'info',
        });
        return;
      }
      setRunMode(mode);
      setPathConfigs(
        (prev: Record<string, PathConfig>): Record<string, PathConfig> => {
          const base = prev[activePathId] ?? createDefaultPathConfig(activePathId);
          return { ...prev, [activePathId]: { ...base, runMode: mode } };
        },
      );
    },
    [activePathId, isPathLocked, setRunMode, setPathConfigs, toast],
  );

  const handleStrictFlowModeChange = useCallback(
    (enabled: boolean): void => {
      if (!activePathId) {
        setStrictFlowMode(enabled);
        return;
      }
      if (isPathLocked) {
        toast('This path is locked. Unlock it to change strict flow mode.', {
          variant: 'info',
        });
        return;
      }
      setStrictFlowMode(enabled);
      setPathConfigs(
        (prev: Record<string, PathConfig>): Record<string, PathConfig> => {
          const base = prev[activePathId] ?? createDefaultPathConfig(activePathId);
          return { ...prev, [activePathId]: { ...base, strictFlowMode: enabled } };
        },
      );
    },
    [activePathId, isPathLocked, setPathConfigs, setStrictFlowMode, toast],
  );

  const handleBlockedRunPolicyChange = useCallback(
    (policy: PathBlockedRunPolicy): void => {
      if (policy === blockedRunPolicy) return;
      if (!activePathId) {
        setBlockedRunPolicy(policy);
        return;
      }
      if (isPathLocked) {
        toast('This path is locked. Unlock it to change blocked run behavior.', {
          variant: 'info',
        });
        return;
      }
      setBlockedRunPolicy(policy);
      setPathConfigs(
        (prev: Record<string, PathConfig>): Record<string, PathConfig> => {
          const base = prev[activePathId] ?? createDefaultPathConfig(activePathId);
          return { ...prev, [activePathId]: { ...base, blockedRunPolicy: policy } };
        },
      );
    },
    [
      activePathId,
      blockedRunPolicy,
      isPathLocked,
      setBlockedRunPolicy,
      setPathConfigs,
      toast,
    ],
  );

  const normalizeHistoryRetentionPasses = useCallback((value: number): number => {
    if (!Number.isFinite(value)) return AI_PATHS_HISTORY_RETENTION_DEFAULT;
    const normalized = Math.trunc(value);
    if (normalized < AI_PATHS_HISTORY_RETENTION_MIN) {
      return AI_PATHS_HISTORY_RETENTION_DEFAULT;
    }
    return Math.min(AI_PATHS_HISTORY_RETENTION_MAX, normalized);
  }, []);

  const handleHistoryRetentionChange = useCallback(
    async (passes: number): Promise<void> => {
      const nextValue = normalizeHistoryRetentionPasses(passes);
      if (nextValue === historyRetentionPasses) return;
      const previous = historyRetentionPasses;
      setHistoryRetentionPasses(nextValue);
      try {
        await persistSettingsBulk([
          {
            key: AI_PATHS_HISTORY_RETENTION_KEY,
            value: String(nextValue),
          },
        ]);
      } catch (error) {
        setHistoryRetentionPasses(previous);
        reportAiPathsError(
          error,
          { action: 'saveHistoryRetention', previous, nextValue },
          'Failed to save AI Paths history retention:',
        );
        toast('Failed to save history retention.', { variant: 'error' });
      }
    },
    [
      historyRetentionPasses,
      normalizeHistoryRetentionPasses,
      persistSettingsBulk,
      reportAiPathsError,
      setHistoryRetentionPasses,
      toast,
    ],
  );

  const handleTogglePathLock = useCallback((): void => {
    if (!activePathId) return;
    const nextLocked = !isPathLocked;
    setIsPathLocked(nextLocked);
    const updatedAt = new Date().toISOString();
    const nextConfig: PathConfig = {
      id: activePathId,
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      executionMode,
      flowIntensity,
      runMode,
      strictFlowMode,
      aiPathsValidation,
      nodes,
      edges,
      updatedAt,
      isLocked: nextLocked,
      isActive: isPathActive,
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
      runCount:
        typeof pathConfigs[activePathId]?.runCount === 'number' &&
        Number.isFinite(pathConfigs[activePathId]?.runCount)
          ? Math.max(0, Math.trunc(pathConfigs[activePathId]?.runCount ?? 0))
          : 0,
      uiState: {
        selectedNodeId,
      },
    };
    const nextPaths = paths.map((path: PathMeta): PathMeta =>
      path.id === activePathId ? { ...path, name: pathName, updatedAt } : path,
    );
    setPaths(nextPaths);
    setPathConfigs(
      (prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
        ...prev,
        [activePathId]: nextConfig,
      }),
    );
    void (async (): Promise<void> => {
      try {
        await persistPathSettings(nextPaths, activePathId, nextConfig);
      } catch (error) {
        reportAiPathsError(
          error,
          { action: 'togglePathLock', pathId: activePathId },
          'Failed to save path lock:',
        );
        toast('Failed to save path lock.', { variant: 'error' });
      }
    })();
    toast(nextLocked ? 'Path locked.' : 'Path unlocked.', {
      variant: 'success',
    });
  }, [
    activePathId,
    activeTrigger,
    edges,
    executionMode,
    flowIntensity,
    isPathActive,
    isPathLocked,
    lastRunAt,
    nodes,
    parserSamples,
    pathDescription,
    pathName,
    pathConfigs,
    paths,
    persistPathSettings,
    reportAiPathsError,
    runMode,
    strictFlowMode,
    aiPathsValidation,
    runtimeState,
    selectedNodeId,
    setIsPathLocked,
    setPathConfigs,
    setPaths,
    toast,
    updaterSamples,
  ]);

  const handleTogglePathActive = useCallback((): void => {
    if (!activePathId) return;
    const nextActive = !isPathActive;
    setIsPathActive(nextActive);
    const updatedAt = new Date().toISOString();
    const nextConfig: PathConfig = {
      id: activePathId,
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      executionMode,
      flowIntensity,
      runMode,
      strictFlowMode,
      aiPathsValidation,
      nodes,
      edges,
      updatedAt,
      isLocked: isPathLocked,
      isActive: nextActive,
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
      runCount:
        typeof pathConfigs[activePathId]?.runCount === 'number' &&
        Number.isFinite(pathConfigs[activePathId]?.runCount)
          ? Math.max(0, Math.trunc(pathConfigs[activePathId]?.runCount ?? 0))
          : 0,
      uiState: {
        selectedNodeId,
      },
    };
    const nextPaths = paths.map((path: PathMeta): PathMeta =>
      path.id === activePathId ? { ...path, name: pathName, updatedAt } : path,
    );
    setPaths(nextPaths);
    setPathConfigs(
      (prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
        ...prev,
        [activePathId]: nextConfig,
      }),
    );
    void (async (): Promise<void> => {
      try {
        await persistPathSettings(nextPaths, activePathId, nextConfig);
      } catch (error) {
        reportAiPathsError(
          error,
          { action: 'togglePathActive', pathId: activePathId },
          'Failed to save path activation:',
        );
        toast('Failed to save path activation.', { variant: 'error' });
      }
    })();
    toast(nextActive ? 'Path activated.' : 'Path deactivated.', {
      variant: 'success',
    });
  }, [
    activePathId,
    activeTrigger,
    edges,
    executionMode,
    flowIntensity,
    isPathActive,
    isPathLocked,
    lastRunAt,
    nodes,
    parserSamples,
    pathDescription,
    pathName,
    pathConfigs,
    paths,
    persistPathSettings,
    reportAiPathsError,
    runMode,
    strictFlowMode,
    aiPathsValidation,
    runtimeState,
    selectedNodeId,
    setIsPathActive,
    setPathConfigs,
    setPaths,
    toast,
    updaterSamples,
  ]);

  return {
    handleExecutionModeChange,
    handleFlowIntensityChange,
    handleRunModeChange,
    handleStrictFlowModeChange,
    handleBlockedRunPolicyChange,
    handleHistoryRetentionChange,
    handleTogglePathLock,
    handleTogglePathActive,
  };
}
