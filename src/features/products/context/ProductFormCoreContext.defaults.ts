import type { ProductFormData, ProductDraft } from '@/shared/contracts/products/drafts';
import {
  normalizeProductMarketplaceContentOverrideDrafts,
  type ProductNotes,
  type ProductWithImages,
} from '@/shared/contracts/products/product';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';

type ProductFormDefaultsInput = {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialSku?: string;
};

const firstDefined = <T,>(
  productValue: T | null | undefined,
  draftValue: T | null | undefined,
  fallback: T
): T => {
  if (productValue !== null && productValue !== undefined) return productValue;
  if (draftValue !== null && draftValue !== undefined) return draftValue;
  return fallback;
};

const firstNonEmptyString = (
  productValue: string | null | undefined,
  draftValue: string | null | undefined
): string => {
  if (typeof productValue === 'string' && productValue.length > 0) return productValue;
  if (typeof draftValue === 'string' && draftValue.length > 0) return draftValue;
  return '';
};

const hasText = (value: string | null): boolean => value !== null && value.length > 0;

const resolveStringDefault = (
  { product, draft }: ProductFormDefaultsInput,
  key: keyof ProductWithImages & keyof ProductDraft
): string =>
  firstNonEmptyString(
    product?.[key] as string | null | undefined,
    draft?.[key] as string | null | undefined
  );

const resolveNumberDefault = (
  { product, draft }: ProductFormDefaultsInput,
  key: keyof ProductWithImages & keyof ProductDraft
): number =>
  firstDefined(
    product?.[key] as number | null | undefined,
    draft?.[key] as number | null | undefined,
    0
  );

const resolveOptionalDefault = <T,>(
  { product, draft }: ProductFormDefaultsInput,
  key: keyof ProductWithImages & keyof ProductDraft,
  fallback: T
): T =>
  firstDefined(
    product?.[key] as T | null | undefined,
    draft?.[key] as T | null | undefined,
    fallback
  );

const normalizeProductFormNotes = (
  value: ProductNotes | null | undefined
): ProductNotes | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = typeof value.text === 'string' ? value.text : null;
  const color = typeof value.color === 'string' ? value.color : null;
  if (!hasText(text) && !hasText(color)) return undefined;
  return { text, color };
};

const resolveNameDefaults = ({ product, draft }: ProductFormDefaultsInput): Pick<
  ProductFormData,
  'name_en' | 'name_pl' | 'name_de'
> => ({
  name_en: firstNonEmptyString(product?.name_en, draft?.name_en),
  name_pl: firstNonEmptyString(product?.name_pl, draft?.name_pl),
  name_de: firstNonEmptyString(product?.name_de, draft?.name_de),
});

const resolveIdentifierDefaults = ({ product, draft, initialSku }: ProductFormDefaultsInput): Pick<
  ProductFormData,
  'asin' | 'ean' | 'gtin' | 'sku'
> => ({
  sku: resolveProductFormDefaultSku({ product, draft, initialSku }),
  ean: firstNonEmptyString(product?.ean, draft?.ean),
  gtin: firstNonEmptyString(product?.gtin, draft?.gtin),
  asin: firstNonEmptyString(product?.asin, draft?.asin),
});

const resolveDescriptionDefaults = (input: ProductFormDefaultsInput): Pick<
  ProductFormData,
  | 'description_de'
  | 'description_en'
  | 'description_pl'
  | 'priceComment'
  | 'supplierLink'
  | 'supplierName'
> => ({
  description_en: resolveStringDefault(input, 'description_en'),
  description_pl: resolveStringDefault(input, 'description_pl'),
  description_de: resolveStringDefault(input, 'description_de'),
  supplierName: resolveStringDefault(input, 'supplierName'),
  supplierLink: resolveStringDefault(input, 'supplierLink'),
  priceComment: resolveStringDefault(input, 'priceComment'),
});

const resolveNumericDefaults = (input: ProductFormDefaultsInput): Pick<
  ProductFormData,
  'length' | 'price' | 'sizeLength' | 'sizeWidth' | 'stock' | 'weight'
> => ({
  price: resolveNumberDefault(input, 'price'),
  stock: resolveNumberDefault(input, 'stock'),
  sizeLength: resolveNumberDefault(input, 'sizeLength'),
  sizeWidth: resolveNumberDefault(input, 'sizeWidth'),
  weight: resolveNumberDefault(input, 'weight'),
  length: resolveNumberDefault(input, 'length'),
});

const resolveOptionalIdDefaults = (input: ProductFormDefaultsInput): Pick<
  ProductFormData,
  'baseProductId' | 'defaultPriceGroupId' | 'importSource' | 'shippingGroupId'
> => ({
  defaultPriceGroupId: resolveOptionalDefault<string | undefined>(
    input,
    'defaultPriceGroupId',
    undefined
  ),
  baseProductId: resolveOptionalDefault<string | undefined>(input, 'baseProductId', undefined),
  importSource: resolveOptionalDefault<string | undefined>(input, 'importSource', undefined),
  shippingGroupId: resolveOptionalDefault(input, 'shippingGroupId', ''),
});

const resolveMarketplaceContentDefaults = ({
  product,
  draft,
}: ProductFormDefaultsInput): Pick<ProductFormData, 'marketplaceContentOverrides'> => ({
  marketplaceContentOverrides: normalizeProductMarketplaceContentOverrideDrafts(
    firstDefined(product?.marketplaceContentOverrides, draft?.marketplaceContentOverrides, [])
  ).map((entry) => ({
    integrationIds: entry.integrationIds,
    title: entry.title ?? '',
    description: entry.description ?? '',
  })),
});

export const resolveProductFormDefaultSku = ({
  product,
  draft,
  initialSku,
}: ProductFormDefaultsInput): string => {
  if (typeof product?.sku === 'string' && product.sku.length > 0) return product.sku;
  if (typeof initialSku === 'string' && initialSku.length > 0) return initialSku;
  if (draft !== null && draft !== undefined) return PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER;
  return '';
};

export const resolveProductFormDefaultValues = (
  input: ProductFormDefaultsInput
): ProductFormData => ({
  ...resolveNameDefaults(input),
  ...resolveIdentifierDefaults(input),
  ...resolveDescriptionDefaults(input),
  ...resolveNumericDefaults(input),
  ...resolveOptionalIdDefaults(input),
  ...resolveMarketplaceContentDefaults(input),
  notes: normalizeProductFormNotes(input.product?.notes ?? input.draft?.notes ?? undefined),
});
