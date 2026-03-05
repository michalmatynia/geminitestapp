import type {
  KangurScore,
  KangurScoreFilters,
  KangurScoreLimit,
  KangurScoreRepositoryCreateInput,
  KangurScoreSort,
} from '@/shared/contracts/kangur';

export type KangurScoreListInput = {
  sort?: KangurScoreSort;
  limit?: KangurScoreLimit;
  filters?: KangurScoreFilters;
};

export type KangurScoreRepository = {
  createScore: (input: KangurScoreRepositoryCreateInput) => Promise<KangurScore>;
  listScores: (input?: KangurScoreListInput) => Promise<KangurScore[]>;
};
