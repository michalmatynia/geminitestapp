import type { KangurProgressState } from '@/features/kangur/shared/contracts/kangur';

export type KangurProgressRepository = {
  getProgress: (userKey: string) => Promise<KangurProgressState>;
  saveProgress: (userKey: string, progress: KangurProgressState) => Promise<KangurProgressState>;
};
