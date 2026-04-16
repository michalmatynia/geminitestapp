import type { ExportParameterDoc } from './import-export';

export const BASE_EXPORT_FIELD_DOCS: ExportParameterDoc[] = [
  { key: 'sku', description: 'Unique product SKU/code.' },
  {
    key: 'category_id',
    description: 'Target Base.com category identifier.',
  },
  {
    key: 'category',
    description: 'Category field alias (normalized to category_id on export).',
  },
  { key: 'ean', description: 'EAN barcode.' },
  { key: 'eans', description: 'EAN barcode alias (normalized to ean on export).' },
  { key: 'weight', description: 'Weight (kg).' },
  { key: 'length', description: 'Length (cm).' },
  { key: 'width', description: 'Width (cm).' },
  { key: 'height', description: 'Height (cm).' },
  { key: 'name', description: 'Product name (default language).' },
  { key: 'name|en', description: 'Product name (English).' },
  { key: 'name|pl', description: 'Product name (Polish).' },
  {
    key: 'description',
    description: 'Product description (default language).',
  },
  { key: 'description|en', description: 'Product description (English).' },
  { key: 'description|pl', description: 'Product description (Polish).' },
  { key: 'text_fields.name', description: 'Name inside text_fields object.' },
  {
    key: 'text_fields.description',
    description: 'Description inside text_fields object.',
  },
  {
    key: 'text_fields.name|en',
    description: 'English name inside text_fields.',
  },
  {
    key: 'text_fields.name|pl',
    description: 'Polish name inside text_fields.',
  },
  {
    key: 'text_fields.description|en',
    description: 'English description inside text_fields.',
  },
  {
    key: 'text_fields.description|pl',
    description: 'Polish description inside text_fields.',
  },
  { key: 'parameters', description: 'Product parameters / attributes array.' },
  { key: 'features', description: 'Product features / attributes (Base.com features field).' },
  { key: 'attributes', description: 'Product attributes (Base.com attributes field).' },
  { key: 'custom_fields', description: 'Product custom fields array.' },
  { key: 'prices.0', description: 'Price for price group 0.' },
  {
    key: 'prices.<price_group_id>',
    description: 'Price for a specific price group.',
  },
  { key: 'stock', description: 'Inventory-level stock (no warehouse).' },
  {
    key: 'manufacturer_id',
    description: 'Canonical Base.com manufacturer identifier used in the export payload.',
  },
  {
    key: 'stock.<warehouse_id>',
    description: 'Stock for a specific warehouse.',
  },
  {
    key: 'stock.bl_<warehouse_id>',
    description: 'Baselinker stock key format.',
  },
  { key: 'images', description: 'All product image URLs.' },
  { key: 'image', description: 'Single product image URL.' },
  { key: 'image_links_all', description: 'All image links.' },
  { key: 'image_slots_all', description: 'All image slots.' },
  { key: 'images_all', description: 'All images (slots + links).' },
  ...Array.from({ length: 15 }, (_: unknown, index: number) => ({
    key: `image_slot_${index + 1}`,
    description: `Image slot ${index + 1}.`,
  })),
];

export const BASE_EXPORT_FIELD_KEYS = Array.from(
  new Set(BASE_EXPORT_FIELD_DOCS.map((entry: ExportParameterDoc) => entry.key))
);
