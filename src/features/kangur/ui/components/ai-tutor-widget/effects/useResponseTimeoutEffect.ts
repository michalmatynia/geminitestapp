import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { PendingSelectionResponse, SectionExplainContext } from './KangurAiTutorWidget.types';

export function useResponseTimeoutEffect(input: {
  selectionResponseComplete: PendingSelectionResponse | null;
  sectionResponseComplete: SectionExplainContext | null;
  selectionResponseCompleteTimeoutRef: MutableRefObject<number | null>;
  sectionResponseCompleteTimeoutRef: MutableRefObject<number | null>;
  setSelectionResponseComplete: (value: PendingSelectionResponse | null) => void;
  setSectionResponseComplete: (value: SectionExplainContext | null) => void;
}): void {
  const {
    selectionResponseComplete,
    sectionResponseComplete,
    selectionResponseCompleteTimeoutRef,
    sectionResponseCompleteTimeoutRef,
    setSelectionResponseComplete,
    setSectionResponseComplete,
  } = input;

  useEffect(() => {
    const clear = (ref: MutableRefObject<number | null>): void => {
      if (ref.current !== null) {
        window.clearTimeout(ref.current);
        ref.current = null;
      }
    };

    if (!selectionResponseComplete) {
      clear(selectionResponseCompleteTimeoutRef);
      return;
    }

    clear(selectionResponseCompleteTimeoutRef);
    selectionResponseCompleteTimeoutRef.current = window.setTimeout(() => {
      selectionResponseCompleteTimeoutRef.current = null;
      setSelectionResponseComplete(null);
    }, 4200);

    return () => clear(selectionResponseCompleteTimeoutRef);
  }, [selectionResponseComplete, selectionResponseCompleteTimeoutRef, setSelectionResponseComplete]);

  useEffect(() => {
    const clear = (ref: MutableRefObject<number | null>): void => {
      if (ref.current !== null) {
        window.clearTimeout(ref.current);
        ref.current = null;
      }
    };

    if (!sectionResponseComplete) {
      clear(sectionResponseCompleteTimeoutRef);
      return;
    }

    clear(sectionResponseCompleteTimeoutRef);
    sectionResponseCompleteTimeoutRef.current = window.setTimeout(() => {
      sectionResponseCompleteTimeoutRef.current = null;
      setSectionResponseComplete(null);
    }, 4200);

    return () => clear(sectionResponseCompleteTimeoutRef);
  }, [sectionResponseComplete, sectionResponseCompleteTimeoutRef, setSectionResponseComplete]);
}
