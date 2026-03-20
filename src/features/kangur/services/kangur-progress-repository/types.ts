import type { KangurProgressState } from '@kangur/contracts';

export type KangurProgressRepository = {
  getProgress: (userKey: string) => Promise<KangurProgressState>;
  saveProgress: (userKey: string, progress: KangurProgressState) => Promise<KangurProgressState>;
};
