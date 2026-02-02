const looksLikeImageUrl = (value: string): boolean =>
  /(\.png|\.jpe?g|\.webp|\.gif|\.svg|\/uploads\/|^https?:\/\/)/i.test(value);

const extractImageUrls = (value: unknown, seen: Set<object> = new Set<object>()): string[] => {
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
    return Array.from(new Set(value.flatMap((item: unknown) => extractImageUrls(item, seen))));
  }
  if (typeof value === "object") {
    if (seen.has(value)) return [];
    seen.add(value);
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
    const urls: string[] = candidates.flatMap((key: string) => extractImageUrls(record[key], seen));
    if (urls.length) return Array.from(new Set(urls));
    const deepUrls: string[] = Object.values(record).flatMap((val: unknown) => extractImageUrls(val, seen));
    return Array.from(new Set(deepUrls));
  }
  return [];
};

const formatPortLabel = (port: string): string => (port === "images" ? "images (urls)" : port);

const formatPlaceholderLabel = (port: string): string =>
  port === "images" ? "{{images}} (urls)" : `{{${port}}}`;

export { extractImageUrls, formatPortLabel, formatPlaceholderLabel };
