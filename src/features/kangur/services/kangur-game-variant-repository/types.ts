import type {
  KangurGameVariantCatalogEntry,
  KangurGameVariantCatalogFilter,
} from '@/features/kangur/games';

export type KangurGameVariantListInput = KangurGameVariantCatalogFilter;

export type KangurGameVariantRepository = {
  listVariants: (input?: KangurGameVariantListInput) => Promise<KangurGameVariantCatalogEntry[]>;
};
