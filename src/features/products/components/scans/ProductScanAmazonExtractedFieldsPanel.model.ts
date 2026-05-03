import { hasProductScanAmazonDetails } from './ProductScanAmazonDetails';
import {
  buildAttributeMappingRows,
} from './ProductScanAmazonExtractedFieldsPanel.mapping-rows';
import {
  buildAttributeMappings,
  resolveUnmappedAmazonFields,
} from './ProductScanAmazonExtractedFieldsPanel.mappings';
import {
  normalizeComparableText,
  parseAmazonDimensionsCm,
  parseAmazonWeightKg,
} from './ProductScanAmazonExtractedFieldsPanel.parse';
import type {
  ParsedAmazonDimensions,
  ProductScanAmazonExtractedFieldsModel,
  ProductScanAmazonFormBindings,
  ProductScanAmazonTextAction,
} from './ProductScanAmazonExtractedFieldsPanel.types';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

type CurrentNumberValues = {
  currentHeight: number | null;
  currentSizeLength: number | null;
  currentSizeWidth: number | null;
  currentWeight: number | null;
};

type ParsedAmazonFields = {
  dimensions: ParsedAmazonDimensions | null;
  weight: number | null;
};

type EditableModelInput = {
  asin: string | null;
  formBindings: ProductScanAmazonFormBindings;
  parsedFields: ParsedAmazonFields;
  scan: ProductScanRecord;
};

export const resolveProductScanAmazonExtractedFieldsModel = (
  scan: ProductScanRecord,
  formBindings: ProductScanAmazonFormBindings | null
): ProductScanAmazonExtractedFieldsModel | null => {
  const asin = normalizeComparableText(scan.asin);
  if (hasAmazonPanelContent(scan, asin) === false) return null;

  const parsedFields = parseAmazonFields(scan);
  if (formBindings === null) {
    return buildReadonlyModel(scan, parsedFields);
  }
  return buildEditableModel({ asin, formBindings, parsedFields, scan });
};

const hasAmazonPanelContent = (scan: ProductScanRecord, asin: string | null): boolean =>
  hasProductScanAmazonDetails(scan.amazonDetails) || asin !== null;

const parseAmazonFields = (scan: ProductScanRecord): ParsedAmazonFields => ({
  dimensions: parseAmazonDimensionsCm(resolveAmazonDimensionSource(scan)),
  weight: parseAmazonWeightKg(resolveAmazonWeightSource(scan)),
});

const resolveAmazonDimensionSource = (scan: ProductScanRecord): string | null => {
  const details = scan.amazonDetails;
  if (details === null) return null;
  return details.itemDimensions ?? details.packageDimensions ?? null;
};

const resolveAmazonWeightSource = (scan: ProductScanRecord): string | null => {
  const details = scan.amazonDetails;
  if (details === null) return null;
  return details.itemWeight ?? details.packageWeight ?? null;
};

const buildReadonlyModel = (
  scan: ProductScanRecord,
  parsedFields: ParsedAmazonFields
): ProductScanAmazonExtractedFieldsModel => ({
  attributeMappingRows: [],
  canApplyDimensions: false,
  canApplyWeight: false,
  formBindings: null,
  parsedDimensions: parsedFields.dimensions,
  parsedWeight: parsedFields.weight,
  pendingAttributeMappings: [],
  scan,
  textActions: [],
  unmappedFields: [],
});

const buildEditableModel = (input: EditableModelInput): ProductScanAmazonExtractedFieldsModel => {
  const { asin, formBindings, parsedFields, scan } = input;
  const currentNumbers = readCurrentNumberValues(formBindings);
  const attributeMappings = buildAttributeMappings(scan, formBindings);
  const attributeMappingRows = buildAttributeMappingRows(attributeMappings, formBindings);
  return {
    attributeMappingRows,
    canApplyDimensions: canApplyDimensions(parsedFields.dimensions, currentNumbers),
    canApplyWeight: parsedFields.weight !== null && currentNumbers.currentWeight !== parsedFields.weight,
    formBindings,
    parsedDimensions: parsedFields.dimensions,
    parsedWeight: parsedFields.weight,
    pendingAttributeMappings: attributeMappingRows
      .filter((row) => row.isPending)
      .map((row) => row.mapping),
    scan,
    textActions: buildTextActions(scan, formBindings, asin),
    unmappedFields: resolveUnmappedAmazonFields(scan, attributeMappings),
  };
};

const readCurrentNumberValues = (
  formBindings: ProductScanAmazonFormBindings
): CurrentNumberValues => ({
  currentHeight: formBindings.getNumberFieldValue('length') ?? null,
  currentSizeLength: formBindings.getNumberFieldValue('sizeLength') ?? null,
  currentSizeWidth: formBindings.getNumberFieldValue('sizeWidth') ?? null,
  currentWeight: formBindings.getNumberFieldValue('weight') ?? null,
});

const canApplyDimensions = (
  parsedDimensions: ParsedAmazonDimensions | null,
  currentValues: CurrentNumberValues
): boolean =>
  parsedDimensions !== null &&
  (currentValues.currentSizeLength !== parsedDimensions.sizeLength ||
    currentValues.currentSizeWidth !== parsedDimensions.sizeWidth ||
    currentValues.currentHeight !== parsedDimensions.length);

const buildTextActions = (
  scan: ProductScanRecord,
  formBindings: ProductScanAmazonFormBindings,
  asin: string | null
): ProductScanAmazonTextAction[] =>
  [
    buildTextAction('asin', 'Use ASIN', asin, formBindings),
    buildTextAction(
      'ean',
      'Use EAN',
      normalizeComparableText(scan.amazonDetails?.ean),
      formBindings
    ),
    buildTextAction(
      'gtin',
      'Use GTIN',
      normalizeComparableText(scan.amazonDetails?.gtin),
      formBindings
    ),
  ].filter((action): action is ProductScanAmazonTextAction => action !== null);

const buildTextAction = (
  field: ProductScanAmazonTextAction['field'],
  label: ProductScanAmazonTextAction['label'],
  value: string | null,
  formBindings: ProductScanAmazonFormBindings
): ProductScanAmazonTextAction | null => {
  if (value === null) return null;
  return {
    currentValue: normalizeComparableText(formBindings.getTextFieldValue(field) ?? null),
    field,
    label,
    value,
  };
};
