'use client';

import { useCallback, useState } from 'react';

export function useMemoryPageExpanded(): {
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
} {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = useCallback((id: string): void => {
    setExpanded((current) => ({
      ...current,
      [id]: current[id] !== true,
    }));
  }, []);
  return { expanded, toggleExpanded };
}
