'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { ProgressSnapshotDto } from '@/shared/contracts/base';
import { useToast } from '@/shared/ui/toast';

import { useResolveTraderaQuickExportConnection } from './useTraderaMassQuickExport.connection';
import { useTraderaMassQuickExportExecutor } from './useTraderaMassQuickExport.execution';

export type { ProgressSnapshotDto as MassQuickExportProgress };

export function useTraderaMassQuickExport(): {
  execute: (productIds: string[]) => Promise<void>;
  isRunning: boolean;
  progress: ProgressSnapshotDto;
} {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const resolveConnection = useResolveTraderaQuickExportConnection(queryClient);

  return useTraderaMassQuickExportExecutor({
    queryClient,
    resolveConnection,
    toast,
  });
}
