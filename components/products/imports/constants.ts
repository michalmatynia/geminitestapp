export const PRODUCT_FIELDS = [
  { value: "sku", label: "SKU" },
  { value: "baseProductId", label: "Base Product ID" },
  { value: "ean", label: "EAN" },
  { value: "gtin", label: "GTIN" },
  { value: "asin", label: "ASIN" },
  { value: "name_en", label: "Name (EN)" },
  { value: "name_pl", label: "Name (PL)" },
  { value: "name_de", label: "Name (DE)" },
  { value: "description_en", label: "Description (EN)" },
  { value: "description_pl", label: "Description (PL)" },
  { value: "description_de", label: "Description (DE)" },
  { value: "supplierName", label: "Supplier Name" },
  { value: "supplierLink", label: "Supplier Link" },
  { value: "price", label: "Price" },
  { value: "priceComment", label: "Price Comment" },
  { value: "stock", label: "Stock" },
  { value: "sizeLength", label: "Size Length" },
  { value: "sizeWidth", label: "Size Width" },
  { value: "weight", label: "Weight" },
  { value: "length", label: "Length" },
  { value: "image_1", label: "Image Link 1" },
  { value: "image_2", label: "Image Link 2" },
  { value: "image_3", label: "Image Link 3" },
  { value: "image_4", label: "Image Link 4" },
  { value: "image_5", label: "Image Link 5" },
  { value: "image_6", label: "Image Link 6" },
  { value: "image_7", label: "Image Link 7" },
  { value: "image_8", label: "Image Link 8" },
  { value: "image_9", label: "Image Link 9" },
  { value: "image_10", label: "Image Link 10" },
  { value: "image_slot_1", label: "Image Slot 1" },
  { value: "image_slot_2", label: "Image Slot 2" },
  { value: "image_slot_3", label: "Image Slot 3" },
  { value: "image_slot_4", label: "Image Slot 4" },
  { value: "image_slot_5", label: "Image Slot 5" },
  { value: "image_slot_6", label: "Image Slot 6" },
  { value: "image_slot_7", label: "Image Slot 7" },
  { value: "image_slot_8", label: "Image Slot 8" },
  { value: "image_slot_9", label: "Image Slot 9" },
  { value: "image_slot_10", label: "Image Slot 10" },
  { value: "image_slot_11", label: "Image Slot 11" },
  { value: "image_slot_12", label: "Image Slot 12" },
  { value: "image_slot_13", label: "Image Slot 13" },
  { value: "image_slot_14", label: "Image Slot 14" },
  { value: "image_slot_15", label: "Image Slot 15" },
  { value: "image_all", label: "Image Slots (All, legacy key)" },
  { value: "image_slots_all", label: "Image Slots (All)" },
  { value: "image_links_all", label: "Image Links (All)" },
  { value: "images_all", label: "Images (All: slots + links)" },
] as const;

export const IMAGE_SLOT_KEYS = Array.from({ length: 15 }, (_, index) => `image_slot_${index + 1}`);

export const ALL_IMAGE_KEYS = [
  ...IMAGE_SLOT_KEYS,
  "image_all",
  "image_slots_all",
  "image_links_all",
  "images_all",
];

export type ExportParameterDoc = {
  key: string;
  description: string;
};

export const EXPORT_PARAMETER_DOCS: ExportParameterDoc[] = [
  { key: "sku", description: "Unique product SKU/code." },
  { key: "ean", description: "EAN barcode." },
  { key: "weight", description: "Weight (kg)." },
  { key: "name", description: "Product name (default language)." },
  { key: "name|en", description: "Product name (English)." },
  { key: "description", description: "Product description (default language)." },
  { key: "description|en", description: "Product description (English)." },
  { key: "text_fields.name", description: "Name inside text_fields object." },
  { key: "text_fields.description", description: "Description inside text_fields object." },
  { key: "text_fields.name|en", description: "English name inside text_fields." },
  { key: "text_fields.description|en", description: "English description inside text_fields." },
  { key: "prices.0", description: "Price for price group 0." },
  { key: "prices.<price_group_id>", description: "Price for a specific price group." },
  { key: "stock", description: "Inventory-level stock (no warehouse)." },
  { key: "stock.<warehouse_id>", description: "Stock for a specific warehouse." },
  { key: "stock.bl_<warehouse_id>", description: "Baselinker stock key format." },
  { key: "images", description: "All product image URLs." },
  { key: "image", description: "Single product image URL." },
  { key: "image_links_all", description: "All image links." },
  { key: "image_slots_all", description: "All image slots." },
  { key: "images_all", description: "All images (slots + links)." },
  ...IMAGE_SLOT_KEYS.map((key, index) => ({
    key,
    description: `Image slot ${index + 1}.`,
  })),
];

export const EXPORT_PARAMETER_KEYS = Array.from(
  new Set(EXPORT_PARAMETER_DOCS.map((entry) => entry.key))
);
