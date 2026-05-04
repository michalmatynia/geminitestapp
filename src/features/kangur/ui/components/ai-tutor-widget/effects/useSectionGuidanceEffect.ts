import { useEffect } from 'react';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { SectionExplainContext } from './KangurAiTutorWidget.types';
import type { KangurAiTutorTelemetryContextDto } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

export function useSectionGuidanceEffect(input: {
  isLoading: boolean;
  isOpen: boolean;
  isSectionGuidedMode: boolean;
  sectionResponsePending: SectionExplainContext | null;
  setSectionResponseComplete: (value: SectionExplainContext | null) => void;
  setSectionResponsePending: (value: SectionExplainContext | null) => void;
  telemetryContext: KangurAiTutorTelemetryContextDto;
}): void {
  const {
    isLoading,
    isOpen,
    isSectionGuidedMode,
    sectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    telemetryContext,
  } = input;

  useEffect(() => {
    if (!sectionResponsePending || isLoading || isSectionGuidedMode || !isOpen) {
      return;
    }

    trackKangurClientEvent('kangur_ai_tutor_section_guidance_completed', {
      ...telemetryContext,
      sectionId: sectionResponsePending.anchorId,
      sectionKind: sectionResponsePending.kind,
      sectionLabel: sectionResponsePending.label,
    });
    setSectionResponseComplete(sectionResponsePending);
    setSectionResponsePending(null);
  }, [
    isLoading,
    isOpen,
    isSectionGuidedMode,
    sectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    telemetryContext,
  ]);
}
