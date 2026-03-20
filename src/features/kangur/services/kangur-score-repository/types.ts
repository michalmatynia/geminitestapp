import type {
  KangurScore,
  KangurScoreFilters,
  KangurScoreLimit,
  KangurScoreRepositoryCreateInput,
  KangurScoreSort,
} from '@kangur/contracts';

export type KangurScoreListInput = {
  sort?: KangurScoreSort;
  limit?: KangurScoreLimit;
  filters?: KangurScoreFilters;
};

export type KangurScoreRepository = {
  createScore: (input: KangurScoreRepositoryCreateInput) => Promise<KangurScore>;
  listScores: (input?: KangurScoreListInput) => Promise<KangurScore[]>;
};
