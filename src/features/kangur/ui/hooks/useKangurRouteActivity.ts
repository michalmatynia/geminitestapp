'use client';

import { useEffect, useMemo, useState } from 'react';

import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurAccessiblePageKey } from '@/features/kangur/ui/hooks/useKangurAccessiblePageKey';

const readDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.visibilityState === 'visible';
};

export function useKangurRouteActivity(targetPageKey: string): boolean {
  const { pageKey } = useKangurRouting();
  const accessiblePageKey = useKangurAccessiblePageKey(pageKey, 'Game');
  const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(() => readDocumentVisible());

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = (): void => {
      setIsDocumentVisible(readDocumentVisible());
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return useMemo(() => {
    const normalizedCurrentPageKey =
      typeof accessiblePageKey === 'string' ? accessiblePageKey.trim() : '';
    return normalizedCurrentPageKey === targetPageKey && isDocumentVisible;
  }, [accessiblePageKey, isDocumentVisible, targetPageKey]);
}
