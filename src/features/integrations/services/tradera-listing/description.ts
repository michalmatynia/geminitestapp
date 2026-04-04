const readString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const ITEM_REFERENCE_PATTERN = /item reference\s*:/i;
const SKU_REFERENCE_PATTERN = /(^|\n)\s*sku\s*:/i;

export const buildTraderaListingDescription = ({
  rawDescription,
  fallbackTitle,
  baseProductId,
  sku,
}: {
  rawDescription: string | null | undefined;
  fallbackTitle: string | null | undefined;
  baseProductId: string | null | undefined;
  sku: string | null | undefined;
}): string => {
  const description = readString(rawDescription) ?? readString(fallbackTitle) ?? 'Listing';
  const normalizedBaseProductId = readString(baseProductId);
  const normalizedSku = readString(sku);

  const metadataLines: string[] = [];
  if (normalizedBaseProductId && !ITEM_REFERENCE_PATTERN.test(description)) {
    metadataLines.push(`Item reference: ${normalizedBaseProductId}`);
  }
  if (normalizedSku && !SKU_REFERENCE_PATTERN.test(description)) {
    metadataLines.push(`SKU: ${normalizedSku}`);
  }

  if (metadataLines.length === 0) {
    return description;
  }

  return `${description}\n\n${metadataLines.join('\n')}`;
};
