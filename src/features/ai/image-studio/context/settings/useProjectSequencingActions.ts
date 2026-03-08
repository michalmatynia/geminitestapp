'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { ImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';

type ProjectSequencingOperation = 'crop_center' | 'mask' | 'generate' | 'regenerate' | 'upscale';

export function useProjectSequencingActions({
  setStudioSettings,
}: {
  setStudioSettings: Dispatch<SetStateAction<ImageStudioSettings>>;
}) {
  const toggleProjectSequencingOperation = useCallback(
    (operation: string, checked: boolean): void => {
      setStudioSettings((prev) => {
        const operations = prev.projectSequencing.operations as ProjectSequencingOperation[];
        const nextOperation = operation as ProjectSequencingOperation;
        const nextOperations: ProjectSequencingOperation[] = checked
          ? operations.includes(nextOperation)
            ? operations
            : [...operations, nextOperation]
          : operations.filter((entry) => entry !== nextOperation);

        return {
          ...prev,
          projectSequencing: {
            ...prev.projectSequencing,
            operations: nextOperations,
          },
        };
      });
    },
    [setStudioSettings]
  );

  const moveProjectSequencingOperation = useCallback(
    (operation: string, direction: number): void => {
      setStudioSettings((prev) => {
        const operations = [...(prev.projectSequencing.operations as ProjectSequencingOperation[])];
        const nextOperation = operation as ProjectSequencingOperation;
        const index = operations.indexOf(nextOperation);
        if (index < 0) {
          return prev;
        }

        const target = index + direction;
        if (target < 0 || target >= operations.length) {
          return prev;
        }

        const [removed] = operations.splice(index, 1);
        if (removed) {
          operations.splice(target, 0, removed);
        }

        return {
          ...prev,
          projectSequencing: {
            ...prev.projectSequencing,
            operations,
          },
        };
      });
    },
    [setStudioSettings]
  );

  return {
    toggleProjectSequencingOperation,
    moveProjectSequencingOperation,
  };
}
