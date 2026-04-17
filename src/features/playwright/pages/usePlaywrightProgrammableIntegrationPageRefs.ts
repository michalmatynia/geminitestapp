'use client';

import { useEffect, useRef } from 'react';

type FocusSection = 'script' | 'import' | null;

export const usePlaywrightProgrammableIntegrationPageRefs = (
  focusSection: FocusSection
): {
  importSectionRef: React.RefObject<HTMLDivElement | null>;
  scriptSectionRef: React.RefObject<HTMLDivElement | null>;
} => {
  const scriptSectionRef = useRef<HTMLDivElement | null>(null);
  const importSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focusSection === null) {
      return;
    }

    const target =
      focusSection === 'script' ? scriptSectionRef.current : importSectionRef.current;
    target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focusSection]);

  return { importSectionRef, scriptSectionRef };
};
