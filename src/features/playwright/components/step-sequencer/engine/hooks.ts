import { useState, useMemo } from 'react';
import type { PlaywrightResolvedActionBlock } from '../../context/PlaywrightStepSequencerContext.types';

export const useActionConstructorEngineLogic = () => {
  const [isCodePreviewOpen, setIsCodePreviewOpen] = useState(false);
  const [selectedActionBlock, setSelectedActionBlock] = useState<PlaywrightResolvedActionBlock | null>(null);

  const toggleCodePreview = () => setIsCodePreviewOpen(prev => !prev);
  
  return {
    isCodePreviewOpen,
    setIsCodePreviewOpen,
    selectedActionBlock,
    setSelectedActionBlock,
    toggleCodePreview,
  };
};
