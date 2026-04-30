import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { MarketplaceCopyDebrandTriggerInput } from '@/shared/contracts/products/marketplace-copy-debrand-run';

import {
  normalizeMarketplaceCopyDebrandSourceDescription,
  normalizeMarketplaceCopyDebrandSourceText,
} from './marketplaceCopyDebrandText';

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

export const sanitizeMarketplaceCopyDebrandTriggerInput = (
  input: MarketplaceCopyDebrandTriggerInput
): MarketplaceCopyDebrandTriggerInput => ({
  sourceEnglishTitle: normalizeMarketplaceCopyDebrandSourceText(input.sourceEnglishTitle) ?? '',
  sourceEnglishDescription:
    normalizeMarketplaceCopyDebrandSourceDescription(input.sourceEnglishDescription) ?? '',
  targetRow: {
    ...input.targetRow,
    currentAlternateTitle: normalizeMarketplaceCopyDebrandSourceText(
      input.targetRow.currentAlternateTitle
    ),
    currentAlternateDescription: normalizeMarketplaceCopyDebrandSourceDescription(
      input.targetRow.currentAlternateDescription
    ),
  },
});

export const buildMarketplaceCopyDebrandTriggerInput = (
  args: BuildMarketplaceCopyDebrandTriggerInputArgs
): MarketplaceCopyDebrandTriggerInput =>
  sanitizeMarketplaceCopyDebrandTriggerInput({
    sourceEnglishTitle: normalizeMarketplaceCopyDebrandSourceText(args.values.name_en) ?? '',
    sourceEnglishDescription:
      normalizeMarketplaceCopyDebrandSourceDescription(args.values.description_en) ?? '',
    targetRow: {
      id: args.row.id,
      index: args.row.index,
      integrationIds: args.row.integrationIds,
      integrationNames: args.row.integrationNames,
      currentAlternateTitle: normalizeMarketplaceCopyDebrandSourceText(
        args.row.currentAlternateTitle
      ),
      currentAlternateDescription: normalizeMarketplaceCopyDebrandSourceDescription(
        args.row.currentAlternateDescription
      ),
    },
  });
