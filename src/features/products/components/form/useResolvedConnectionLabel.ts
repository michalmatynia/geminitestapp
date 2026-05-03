'use client';

import { useMemo } from 'react';

export function useResolvedConnectionLabel(isAmazonScan: boolean, connectionId: string | null | undefined, connectionNamesById: Map<string, string>): string | null {
  return useMemo((): string | null => {
    if (isAmazonScan === true) return null;
    if (typeof connectionId === 'string' && connectionId !== '') {
      return connectionNamesById.get(connectionId) ?? connectionId;
    }
    return null;
  }, [isAmazonScan, connectionId, connectionNamesById]);
}
