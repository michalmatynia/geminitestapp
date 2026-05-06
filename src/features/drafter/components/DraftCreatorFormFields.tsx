'use client';

import { useMemo } from 'react';

import {
  CatalogMultiSelectField,
} from '@/features/products/forms.public';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

import {
  useDraftCreatorBasicInfo,
  useDraftCreatorProductData,
} from './DraftCreatorFormContext';
import { DraftCreatorDraftInfoSection } from './tabs/DraftCreatorDraftInfoSection';
import { DraftCreatorProductDefaultsSection } from './tabs/DraftCreatorProductDefaultsSection';

const getParameterLabel = (parameter: ProductParameter): string =>
  parameter.name_en || parameter.name_pl || parameter.name_de || 'Unnamed parameter';

const buildParameterOptions = (
  parameters: ProductParameter[]
): Array<LabeledOptionDto<string>> =>
  parameters.map((parameter) => ({
    value: parameter.id,
    label: getParameterLabel(parameter),
  }));

export function DraftCreatorCatalogsSection(): React.JSX.Element {
  return (
    <div className='p-4'>
      <CatalogMultiSelectField />
    </div>
  );
}
