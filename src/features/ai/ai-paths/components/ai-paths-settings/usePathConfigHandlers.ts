'use client';

import { useCallback } from 'react';

import type { PathConfig } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths';
import { useToast } from '@/shared/ui';

import { useGraphActions, useGraphState } from '../../context';

type PathExecutionMode = 'local' | 'server';
type PathFlowIntensity = 'off' | 'low' | 'medium' | 'high';
type PathRunMode = 'manual' | 'automatic' | 'step';

export interface PathConfigHandlers {
  handleExecutionModeChange: (mode: PathExecutionMode) => void;
  handleFlowIntensityChange: (intensity: PathFlowIntensity) => void;
  handleRunModeChange: (mode: PathRunMode) => void;
}

/**
 * Provides path-config change handlers (execution mode, flow intensity, run mode).
 *
 * Each handler checks the path-locked guard, sets the scalar state,
 * and updates the `pathConfigs` map in GraphContext.
 *
 * Replaces the equivalent handlers from the previous settings-state hook.
 */
export function usePathConfigHandlers(): PathConfigHandlers {
  const { toast } = useToast();
  const { activePathId, isPathLocked } = useGraphState();
  const { setExecutionMode, setFlowIntensity, setRunMode, setPathConfigs } = useGraphActions();

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
      setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => {
        const base = prev[activePathId] ?? createDefaultPathConfig(activePathId);
        return { ...prev, [activePathId]: { ...base, executionMode: mode } };
      });
    },
    [activePathId, isPathLocked, setExecutionMode, setPathConfigs, toast]
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
      setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => {
        const base = prev[activePathId] ?? createDefaultPathConfig(activePathId);
        return {
          ...prev,
          [activePathId]: { ...base, flowIntensity: intensity },
        };
      });
    },
    [activePathId, isPathLocked, setFlowIntensity, setPathConfigs, toast]
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
      setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => {
        const base = prev[activePathId] ?? createDefaultPathConfig(activePathId);
        return { ...prev, [activePathId]: { ...base, runMode: mode } };
      });
    },
    [activePathId, isPathLocked, setRunMode, setPathConfigs, toast]
  );

  return {
    handleExecutionModeChange,
    handleFlowIntensityChange,
    handleRunModeChange,
  };
}
