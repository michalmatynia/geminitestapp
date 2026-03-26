import type { KangurGameLibraryCoverageGroup } from '@/features/kangur/games';

export type KangurGameLibraryCoverageRepository = {
  listCoverage: () => Promise<KangurGameLibraryCoverageGroup[]>;
};
