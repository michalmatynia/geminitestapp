import type {
  KangurLearnerActivitySnapshot,
  KangurLearnerActivityUpdateInput,
} from '@/features/kangur/shared/contracts/kangur';

export type KangurLearnerActivityRepository = {
  getActivity: (learnerId: string) => Promise<KangurLearnerActivitySnapshot | null>;
  saveActivity: (
    learnerId: string,
    input: KangurLearnerActivityUpdateInput
  ) => Promise<KangurLearnerActivitySnapshot>;
};
