import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  BASE_EXPORT_FIELD_DOCS,
  BASE_EXPORT_FIELD_KEYS,
} from '@/shared/contracts/integrations/base-export-fields';
import {
  buildProductCustomFieldOptionTargetValue,
  buildProductCustomFieldTargetValue,
} from '@/shared/contracts/integrations/import-template-targets';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';

export const PRODUCT_FIELDS = [
  { value: 'sku', label: 'SKU' },
  { value: 'baseProductId', label: 'Base Product ID' },
  { value: 'categoryId', label: 'Category ID' },
  { value: 'ean', label: 'EAN / EANs' },
  { value: 'gtin', label: 'GTIN' },
  { value: 'asin', label: 'ASIN' },
  { value: 'name_en', label: 'Name (EN)' },
  { value: 'name_pl', label: 'Name (PL)' },
  { value: 'name_de', label: 'Name (DE)' },
  { value: 'description_en', label: 'Description (EN)' },
  { value: 'description_pl', label: 'Description (PL)' },
  { value: 'description_de', label: 'Description (DE)' },
  { value: 'supplierName', label: 'Supplier Name' },
  { value: 'supplierLink', label: 'Supplier Link' },
  { value: 'producerIds', label: 'Producer IDs' },
  { value: 'price', label: 'Price' },
  { value: 'priceComment', label: 'Price Comment' },
  { value: 'stock', label: 'Stock' },
  { value: 'sizeLength', label: 'Length (cm)' },
  { value: 'sizeWidth', label: 'Width (cm)' },
  { value: 'weight', label: 'Weight (kg)' },
  { value: 'length', label: 'Height (cm)' },
  { value: 'image_1', label: 'Image Link 1' },
  { value: 'image_2', label: 'Image Link 2' },
  { value: 'image_3', label: 'Image Link 3' },
  { value: 'image_4', label: 'Image Link 4' },
  { value: 'image_5', label: 'Image Link 5' },
  { value: 'image_6', label: 'Image Link 6' },
  { value: 'image_7', label: 'Image Link 7' },
  { value: 'image_8', label: 'Image Link 8' },
  { value: 'image_9', label: 'Image Link 9' },
  { value: 'image_10', label: 'Image Link 10' },
  { value: 'image_slot_1', label: 'Image Slot 1' },
  { value: 'image_slot_2', label: 'Image Slot 2' },
  { value: 'image_slot_3', label: 'Image Slot 3' },
  { value: 'image_slot_4', label: 'Image Slot 4' },
  { value: 'image_slot_5', label: 'Image Slot 5' },
  { value: 'image_slot_6', label: 'Image Slot 6' },
  { value: 'image_slot_7', label: 'Image Slot 7' },
  { value: 'image_slot_8', label: 'Image Slot 8' },
  { value: 'image_slot_9', label: 'Image Slot 9' },
  { value: 'image_slot_10', label: 'Image Slot 10' },
  { value: 'image_slot_11', label: 'Image Slot 11' },
  { value: 'image_slot_12', label: 'Image Slot 12' },
  { value: 'image_slot_13', label: 'Image Slot 13' },
  { value: 'image_slot_14', label: 'Image Slot 14' },
  { value: 'image_slot_15', label: 'Image Slot 15' },
  { value: 'image_slots_all', label: 'Image Slots (All)' },
  { value: 'image_links_all', label: 'Image Links (All)' },
  { value: 'images_all', label: 'Images (All: slots + links)' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const PRODUCT_PARAMETER_TARGET_PREFIX = 'parameter:' as const;
export const PRODUCT_PARAMETER_TARGET_PATTERN = `${PRODUCT_PARAMETER_TARGET_PREFIX}<parameter_id>`;
export const PRODUCT_PARAMETER_TARGET_TRANSLATED_PATTERN = `${PRODUCT_PARAMETER_TARGET_PREFIX}<parameter_id>|<language_code>`;

export const buildProductCustomFieldTargetOptions = (
  customFields: ProductCustomFieldDefinition[]
): Array<LabeledOptionDto<string>> => {
  const seen = new Set<string>();
  const options: Array<LabeledOptionDto<string>> = [];

  customFields.forEach((customField: ProductCustomFieldDefinition) => {
    const fieldId = customField.id.trim();
    if (!fieldId) return;

    if (customField.type === 'checkbox_set') {
      customField.options.forEach((option) => {
        const optionId = option.id.trim();
        if (!optionId) return;
        const value = buildProductCustomFieldOptionTargetValue(fieldId, optionId);
        const normalizedValue = value.trim().toLowerCase();
        if (seen.has(normalizedValue)) return;
        seen.add(normalizedValue);
        options.push({
          value,
          label: `Checkbox: ${customField.name} -> ${option.label}`,
        });
      });
      return;
    }

    const value = buildProductCustomFieldTargetValue(fieldId);
    const normalizedValue = value.trim().toLowerCase();
    if (seen.has(normalizedValue)) return;
    seen.add(normalizedValue);
    options.push({
      value,
      label: `Custom field: ${customField.name}`,
    });
  });

  return options;
};

export const IMAGE_SLOT_KEYS = Array.from(
  { length: 15 },
  (_: unknown, index: number) => `image_slot_${index + 1}`
);

export const ALL_IMAGE_KEYS = [
  ...IMAGE_SLOT_KEYS,
  'image_slots_all',
  'image_links_all',
  'images_all',
];

export const EXPORT_PARAMETER_DOCS = BASE_EXPORT_FIELD_DOCS;

export const EXPORT_PARAMETER_KEYS = BASE_EXPORT_FIELD_KEYS;
