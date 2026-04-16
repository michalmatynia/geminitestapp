import type { ProductFormData } from '@/shared/contracts/products/drafts';

type BuildMarketplaceCopyDebrandTriggerInputArgs = {
  values: Pick<ProductFormData, 'name_en' | 'description_en'>;
  row: {
    id: string;
    index: number;
    integrationIds: string[];
    integrationNames: string[];
    currentAlternateTitle: string;
    currentAlternateDescription: string;
  };
};

export type MarketplaceCopyDebrandTriggerInput = {
  sourceEnglishTitle: string;
  sourceEnglishDescription: string;
  targetRow: {
    id: string;
    index: number;
    integrationIds: string[];
    integrationNames: string[];
    currentAlternateTitle: string | null;
    currentAlternateDescription: string | null;
  };
};

const normalizeOptionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const buildMarketplaceCopyDebrandTriggerInput = (
  args: BuildMarketplaceCopyDebrandTriggerInputArgs
): MarketplaceCopyDebrandTriggerInput => ({
  sourceEnglishTitle: normalizeOptionalText(args.values.name_en) ?? '',
  sourceEnglishDescription: normalizeOptionalText(args.values.description_en) ?? '',
  targetRow: {
    id: args.row.id,
    index: args.row.index,
    integrationIds: args.row.integrationIds,
    integrationNames: args.row.integrationNames,
    currentAlternateTitle: normalizeOptionalText(args.row.currentAlternateTitle),
    currentAlternateDescription: normalizeOptionalText(args.row.currentAlternateDescription),
  },
});
