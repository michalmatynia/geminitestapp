import type { FolderTreeTransaction, MasterFolderTreeAdapterV3 } from '../types';
import { createMasterFolderTreeTransactionAdapter } from './createMasterFolderTreeTransactionAdapter';

export type CreateMasterFolderTreeProjectionAdapterOptions<TProjection> = {
  project: (tx: FolderTreeTransaction) => Promise<TProjection> | TProjection;
  onPersistProjection: (
    projection: TProjection,
    tx: FolderTreeTransaction
  ) => Promise<unknown> | void;
  shouldPersist?: (tx: FolderTreeTransaction) => boolean;
};

export const createMasterFolderTreeProjectionAdapter = <TProjection>({
  project,
  onPersistProjection,
  shouldPersist,
}: CreateMasterFolderTreeProjectionAdapterOptions<TProjection>): MasterFolderTreeAdapterV3 =>
  createMasterFolderTreeTransactionAdapter({
    onApply: async (tx): Promise<void> => {
      if (shouldPersist?.(tx) === false) return;
      const projection = await project(tx);
      await onPersistProjection(projection, tx);
    },
  });
