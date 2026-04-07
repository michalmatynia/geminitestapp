const readString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const PRODUCT_ID_PATTERN = /(item reference|product id)\s*:/i;
const SKU_REFERENCE_PATTERN = /\bsku\s*:/i;
const EAN_REFERENCE_PATTERN = /\b(ean|gtin|barcode)\s*:/i;

export const buildTraderaListingDescription = ({
  rawDescription,
  fallbackTitle,
  baseProductId,
  sku,
  ean,
  gtin,
}: {
  rawDescription: string | null | undefined;
  fallbackTitle: string | null | undefined;
  baseProductId: string | null | undefined;
  sku: string | null | undefined;
  ean?: string | null | undefined;
  gtin?: string | null | undefined;
}): string => {
  const description = readString(rawDescription) ?? readString(fallbackTitle) ?? 'Listing';
  const normalizedBaseProductId = readString(baseProductId);
  const normalizedSku = readString(sku);
  const normalizedEan = readString(ean) || readString(gtin);

  const metadataLines: string[] = [];
  if (normalizedBaseProductId && !PRODUCT_ID_PATTERN.test(description)) {
    metadataLines.push(`Product ID: ${normalizedBaseProductId}`);
  }
  if (normalizedSku && !SKU_REFERENCE_PATTERN.test(description)) {
    metadataLines.push(`SKU: ${normalizedSku}`);
  }
  if (normalizedEan && !EAN_REFERENCE_PATTERN.test(description)) {
    metadataLines.push(`EAN: ${normalizedEan}`);
  }

  if (metadataLines.length === 0) {
    return description;
  }

  return `${description} | ${metadataLines.join(' | ')}`;
};
