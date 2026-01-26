/**
 * Common utilities for product listing and export modals.
 */

export const normalizeSearchText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Checks if a marketplace export error message is related to images.
 * Useful for showing retry options with image transforms.
 */
export const isImageExportError = (message: string | null) => {
  if (!message) return false;
  const normalized = normalizeSearchText(message.toLowerCase());
  return (
    normalized.includes("zdjec") ||
    normalized.includes("image") ||
    normalized.includes("photo")
  );
};
