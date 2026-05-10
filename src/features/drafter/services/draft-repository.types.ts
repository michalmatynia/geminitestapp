import type { ObjectId } from 'mongodb';

import type {
  ProductDraftKind,
  ProductImportSource,
  ProductParameterValue,
} from '@/shared/contracts/products';

export type MongoDraftDoc = {
  _id: string | ObjectId;
  id?: string;
  name?: string;
  draftKind?: ProductDraftKind | null;
  scrapeProfileId?: string | null;
  description?: string | null;
  sku?: string | null;
  ean?: string | null;
  gtin?: string | null;
  asin?: string | null;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  weight?: number | null;
  sizeLength?: number | null;
  sizeWidth?: number | null;
  length?: number | null;
  price?: number | null;
  supplierName?: string | null;
  supplierLink?: string | null;
  priceComment?: string | null;
  stock?: number | null;
  catalogIds?: string[];
  categoryId?: string | null;
  tagIds?: string[];
  producerIds?: string[];
  parameters?: ProductParameterValue[];
  defaultPriceGroupId?: string | null;
  active?: boolean;
  validatorEnabled?: boolean;
  formatterEnabled?: boolean;
  icon?: string | null;
  iconColorMode?: 'theme' | 'custom' | null;
  iconColor?: string | null;
  openProductFormTab?: string | null;
  imageLinks?: string[];
  baseProductId?: string | null;
  importSource?: ProductImportSource | null;
  createdAt?: Date;
  updatedAt?: Date;
};
