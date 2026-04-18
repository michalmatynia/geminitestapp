'use client';

import { useCallback, useEffect, useRef } from 'react';

type FocusSection = 'script' | 'import' | null;

export const usePlaywrightProgrammableIntegrationPageRefs = (
  focusSection: FocusSection
): {
  importSectionRef: React.RefObject<HTMLDivElement | null>;
  resultSectionRef: React.RefObject<HTMLDivElement | null>;
  scriptSectionRef: React.RefObject<HTMLDivElement | null>;
  scrollToResultSection: () => void;
} => {
  const scriptSectionRef = useRef<HTMLDivElement | null>(null);
  const importSectionRef = useRef<HTMLDivElement | null>(null);
  const resultSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToResultSection = useCallback(() => {
    resultSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (focusSection === null) {
      return;
    }

    const target =
      focusSection === 'script' ? scriptSectionRef.current : importSectionRef.current;
    target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focusSection]);

  return { importSectionRef, resultSectionRef, scriptSectionRef, scrollToResultSection };
};
