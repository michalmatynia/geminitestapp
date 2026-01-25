const looksLikeImageUrl = (value: string) =>
  /(\.png|\.jpe?g|\.webp|\.gif|\.svg|\/uploads\/|^https?:\/\/)/i.test(value);

const extractImageUrls = (value: unknown, seen = new Set<object>()): string[] => {
  if (!value) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return extractImageUrls(parsed, seen);
      } catch {
        return looksLikeImageUrl(value) ? [value] : [];
      }
    }
    return looksLikeImageUrl(value) ? [value] : [];
  }
  if (Array.isArray(value)) {
    return Array.from(new Set(value.flatMap((item) => extractImageUrls(item, seen))));
  }
  if (typeof value === "object") {
    if (seen.has(value as object)) return [];
    seen.add(value as object);
    const record = value as Record<string, unknown>;
    const candidates = [
      "url",
      "src",
      "thumbnail",
      "thumb",
      "imageUrl",
      "image",
      "imageFile",
      "filepath",
      "filePath",
      "path",
      "file",
      "previewUrl",
      "preview",
    ];
    const urls = candidates.flatMap((key) => extractImageUrls(record[key], seen));
    if (urls.length) return Array.from(new Set(urls));
    const deepUrls = Object.values(record).flatMap((val) => extractImageUrls(val, seen));
    return Array.from(new Set(deepUrls));
  }
  return [];
};

const formatPortLabel = (port: string) => (port === "images" ? "images (urls)" : port);

const formatPlaceholderLabel = (port: string) =>
  port === "images" ? "{{images}} (urls)" : `{{${port}}}`;

export { extractImageUrls, formatPortLabel, formatPlaceholderLabel };
