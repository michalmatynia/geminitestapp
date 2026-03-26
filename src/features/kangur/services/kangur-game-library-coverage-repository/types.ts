import type { KangurGameLibraryCoverage } from '@/features/kangur/games';

export type KangurGameLibraryCoverageRepository = {
  getCoverage: () => Promise<KangurGameLibraryCoverage>;
};
