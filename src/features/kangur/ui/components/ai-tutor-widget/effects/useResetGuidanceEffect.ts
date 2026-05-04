import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { PendingSelectionResponse, SectionExplainContext } from './KangurAiTutorWidget.types';

export function useResetGuidanceEffect(input: {
  activeSelectedText: string | null;
  highlightedSection: SectionExplainContext | null;
  selectionResponseCompleteTimeoutRef: MutableRefObject<number | null>;
  sectionResponseCompleteTimeoutRef: MutableRefObject<number | null>;
  setSelectionResponseComplete: (value: PendingSelectionResponse | null) => void;
  setSectionResponseComplete: (value: SectionExplainContext | null) => void;
  setSectionResponsePending: (value: SectionExplainContext | null) => void;
}): void {
  const {
    activeSelectedText,
    highlightedSection,
    selectionResponseCompleteTimeoutRef,
    sectionResponseCompleteTimeoutRef,
    setSelectionResponseComplete,
    setSectionResponseComplete,
    setSectionResponsePending,
  } = input;

  useEffect(() => {
    if (activeSelectedText !== null && activeSelectedText.length > 0) return;

    if (selectionResponseCompleteTimeoutRef.current !== null) {
      window.clearTimeout(selectionResponseCompleteTimeoutRef.current);
      selectionResponseCompleteTimeoutRef.current = null;
    }
    setSelectionResponseComplete(null);
  }, [activeSelectedText, selectionResponseCompleteTimeoutRef, setSelectionResponseComplete]);

  useEffect(() => {
    if (highlightedSection !== null) return;

    if (sectionResponseCompleteTimeoutRef.current !== null) {
      window.clearTimeout(sectionResponseCompleteTimeoutRef.current);
      sectionResponseCompleteTimeoutRef.current = null;
    }
    setSectionResponsePending(null);
    setSectionResponseComplete(null);
  }, [
    highlightedSection,
    sectionResponseCompleteTimeoutRef,
    setSectionResponseComplete,
    setSectionResponsePending,
  ]);
}
