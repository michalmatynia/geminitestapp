import type {
  KangurLearnerActivitySnapshot,
  KangurLearnerActivityUpdateInput,
} from '@kangur/contracts';

export type KangurLearnerActivityRepository = {
  getActivity: (learnerId: string) => Promise<KangurLearnerActivitySnapshot | null>;
  saveActivity: (
    learnerId: string,
    input: KangurLearnerActivityUpdateInput
  ) => Promise<KangurLearnerActivitySnapshot>;
};
