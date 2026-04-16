import type { ProductCustomFieldDefinition, ProductCustomFieldValue } from '@/shared/contracts/products/custom-fields';
import type { ProductParameterDefinition, ProductParameterValue } from '@/shared/contracts/products/parameters';

export type Supplier1688FormBindings = {
  getTextFieldValue: (field: 'supplierName' | 'supplierLink' | 'priceComment') => string | null;
  applyTextField: (field: 'supplierName' | 'supplierLink' | 'priceComment', value: string) => void;
  imageLinks?: string[];
  imageBase64s?: string[];
  setImageLinkAt?: (index: number, url: string | null) => void;
  setImageBase64At?: (index: number, base64: string | null) => void;
};

export type ProductFormBindings = {
  getTextFieldValue: (field: 'asin' | 'ean' | 'gtin') => string | null;
  getNumberFieldValue: (field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length') => number | null;
  applyTextField: (field: 'asin' | 'ean' | 'gtin', value: string) => void;
  applyNumberField: (field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length', value: number) => void;
  parameters: ProductParameterDefinition[];
  parameterValues: ProductParameterValue[];
  addParameterValue: (parameterId: string, value: string) => void;
  updateParameterId: (oldParameterId: string, newParameterId: string) => void;
  updateParameterValue: (parameterId: string, value: string) => void;
  customFields: ProductCustomFieldDefinition[];
  customFieldValues: ProductCustomFieldValue[];
  setTextValue: (fieldId: string, value: string) => void;
  toggleSelectedOption: (fieldId: string, optionId: string) => void;
};
