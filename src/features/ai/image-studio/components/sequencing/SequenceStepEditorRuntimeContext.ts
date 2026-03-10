'use client';

import type { ImageStudioSequenceStep } from '@/features/ai/image-studio/utils/studio-settings';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';


export type SequenceStepEditorRuntimeValue = {
  activeGenerationModel: string;
  cropShapeOptions: Array<{ value: string; label: string }>;
  cropShapeGeometryById: Record<
    string,
    {
      bbox: { x: number; y: number; width: number; height: number } | null;
      polygon: Array<{ x: number; y: number }> | null;
    }
  >;
  sequencerFieldTooltipsEnabled: boolean;
  updateStep: (
    stepId: string,
    updater: (step: ImageStudioSequenceStep) => ImageStudioSequenceStep
  ) => void;
};

const {
  Context: SequenceStepEditorRuntimeContext,
  useStrictContext: useSequenceStepEditorRuntime,
} = createStrictContext<SequenceStepEditorRuntimeValue>({
  hookName: 'useSequenceStepEditorRuntime',
  providerName: 'SequenceStepEditorRuntimeProvider',
  displayName: 'SequenceStepEditorRuntimeContext',
});

export { SequenceStepEditorRuntimeContext, useSequenceStepEditorRuntime };
