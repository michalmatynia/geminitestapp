'use client';

import { useEffect, useMemo, useState } from 'react';

import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';

const readDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.visibilityState === 'visible';
};

export function useKangurRouteActivity(targetPageKey: string): boolean {
  const { pageKey } = useKangurRouting();
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
    const normalizedCurrentPageKey = typeof pageKey === 'string' ? pageKey.trim() : '';
    return normalizedCurrentPageKey === targetPageKey && isDocumentVisible;
  }, [isDocumentVisible, pageKey, targetPageKey]);
}
