'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { ProgressSnapshotDto } from '@/shared/contracts/base';
import { useToast } from '@/shared/ui/toast';

import { useVintedMassQuickExportExecutor } from './useVintedMassQuickExport.execution';
import { useResolveVintedQuickExportConnection } from './useVintedMassQuickExport.connection';

export type { ProgressSnapshotDto as MassQuickExportProgress };

export function useVintedMassQuickExport(): {
  execute: (productIds: string[]) => Promise<void>;
  isRunning: boolean;
  progress: ProgressSnapshotDto;
} {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const resolveConnection = useResolveVintedQuickExportConnection(queryClient);

  return useVintedMassQuickExportExecutor({
    queryClient,
    resolveConnection,
    toast,
  });
}
