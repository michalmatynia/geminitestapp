import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

export type AmazonScanMappedField = {
  sourceLabel: string;
  value: string;
};

export type ProductScanAmazonTextField = 'asin' | 'ean' | 'gtin';

export type ProductScanAmazonNumberField = 'weight' | 'sizeLength' | 'sizeWidth' | 'length';

export type ParsedAmazonDimensions = {
  length: number;
  sizeLength: number;
  sizeWidth: number;
};

export type ScanAttributeMapping =
  | {
      sourceLabel: string;
      targetId: string;
      targetLabel: string;
      targetType: 'parameter';
      value: string;
    }
  | {
      sourceLabel: string;
      targetId: string;
      targetLabel: string;
      targetType: 'custom_field_text';
      value: string;
    }
  | {
      sourceLabel: string;
      targetId: string;
      targetLabel: string;
      targetOptionIds: string[];
      targetOptionLabels: string[];
      targetType: 'custom_field_checkbox_set';
      value: string;
    };

export type ProductScanAmazonFormBindings = {
  addParameterValue: () => void;
  applyNumberField: (field: ProductScanAmazonNumberField, value: number) => void;
  applyTextField: (field: ProductScanAmazonTextField, value: string) => void;
  customFieldValues: ProductCustomFieldValue[];
  customFields: ProductCustomFieldDefinition[];
  getNumberFieldValue: (
    field: ProductScanAmazonNumberField
  ) => number | null | undefined;
  getTextFieldValue: (
    field: ProductScanAmazonTextField
  ) => string | null | undefined;
  parameterValues: ProductParameterValue[];
  parameters: ProductParameter[];
  setTextValue: (fieldId: string, value: string) => void;
  toggleSelectedOption: (fieldId: string, optionId: string, checked: boolean) => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
};

export type ProductScanAmazonTextAction = {
  currentValue: string | null;
  field: ProductScanAmazonTextField;
  label: 'Use ASIN' | 'Use EAN' | 'Use GTIN';
  value: string;
};

export type ProductScanAmazonAttributeMappingRow = {
  currentValue: string | null;
  isPending: boolean;
  label: string;
  mapping: ScanAttributeMapping;
};

export type ProductScanAmazonExtractedFieldsModel = {
  attributeMappingRows: ProductScanAmazonAttributeMappingRow[];
  canApplyDimensions: boolean;
  canApplyWeight: boolean;
  formBindings: ProductScanAmazonFormBindings | null;
  parsedDimensions: ParsedAmazonDimensions | null;
  parsedWeight: number | null;
  pendingAttributeMappings: ScanAttributeMapping[];
  scan: ProductScanRecord;
  textActions: ProductScanAmazonTextAction[];
  unmappedFields: AmazonScanMappedField[];
};
