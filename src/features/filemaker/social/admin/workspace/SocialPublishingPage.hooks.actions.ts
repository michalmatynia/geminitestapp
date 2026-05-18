import { useCallback } from 'react';

import type { useSocialCaptureFlows } from './hooks/useSocialCaptureFlows';
import type { useSocialGeneration } from './hooks/useSocialGeneration';
import type { useSocialPipelineRunner } from './hooks/useSocialPipelineRunner';

type CaptureFlowsState = ReturnType<typeof useSocialCaptureFlows>;
type GenerationState = ReturnType<typeof useSocialGeneration>;
type PipelineState = ReturnType<typeof useSocialPipelineRunner>;

export type AdminSocialPageActions = {
  handleGeneratePostWithVisualAnalysis: () => Promise<void>;
  handleRunFullPipeline: () => Promise<void>;
  handleRunFullPipelineWithFreshCapture: () => Promise<void>;
};

export const useAdminSocialPageActions = ({
  captureFlows,
  generation,
  pipeline,
}: {
  captureFlows: CaptureFlowsState;
  generation: GenerationState;
  pipeline: PipelineState;
}): AdminSocialPageActions => {
  const handleRunFullPipeline = useCallback(async (): Promise<void> => {
    captureFlows.handleCloseProgrammablePlaywrightModal();
    await pipeline.handleRunFullPipeline();
  }, [captureFlows.handleCloseProgrammablePlaywrightModal, pipeline.handleRunFullPipeline]);

  const handleRunFullPipelineWithFreshCapture = useCallback(async (): Promise<void> => {
    captureFlows.handleCloseProgrammablePlaywrightModal();
    await pipeline.handleRunFullPipelineWithFreshCapture();
  }, [
    captureFlows.handleCloseProgrammablePlaywrightModal,
    pipeline.handleRunFullPipelineWithFreshCapture,
  ]);

  const handleGeneratePostWithVisualAnalysis = useCallback(async (): Promise<void> => {
    if (pipeline.visualAnalysisResult === null) {
      return;
    }

    const didGenerate = await generation.handleGenerateWithVisualAnalysis(
      pipeline.visualAnalysisResult
    );
    if (didGenerate) {
      pipeline.handleCloseVisualAnalysisModal();
    }
  }, [
    generation.handleGenerateWithVisualAnalysis,
    pipeline.handleCloseVisualAnalysisModal,
    pipeline.visualAnalysisResult,
  ]);

  return {
    handleGeneratePostWithVisualAnalysis,
    handleRunFullPipeline,
    handleRunFullPipelineWithFreshCapture,
  };
};
