const RESPONSE_BODY_SNIFF_BYTES = 512;

type ImageSignatureCheck = (bytes: Uint8Array) => boolean;

type ImageLikeResponseInput = {
  extension: string | null;
  response: Response;
  supportedExtensions: ReadonlySet<string>;
};

const readResponsePrefixBytes = async (response: Response): Promise<Uint8Array | null> => {
  try {
    const cloned = response.clone();
    const reader = cloned.body?.getReader();
    if (reader === undefined) {
      const buffer = await cloned.arrayBuffer();
      return new Uint8Array(buffer.slice(0, RESPONSE_BODY_SNIFF_BYTES));
    }

    const chunk = await reader.read();
    await reader.cancel().catch(() => undefined);
    return (chunk.value ?? new Uint8Array()).slice(0, RESPONSE_BODY_SNIFF_BYTES);
  } catch {
    return null;
  }
};

const startsWithBytes = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  signature.every((value, index) => bytes[index] === value);

const asciiPrefix = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes).trimStart().toLowerCase();

const hasWebpSignature = (bytes: Uint8Array): boolean => {
  const text = asciiPrefix(bytes);
  return text.startsWith('riff') && text.slice(8, 12) === 'webp';
};

const hasAvifSignature = (bytes: Uint8Array): boolean => {
  const text = asciiPrefix(bytes);
  return text.slice(4, 8) === 'ftyp' && text.slice(8, 12) === 'avif';
};

const hasSvgSignature = (bytes: Uint8Array): boolean => {
  const text = asciiPrefix(bytes);
  return text.startsWith('<svg') || (text.startsWith('<?xml') && text.includes('<svg'));
};

const IMAGE_SIGNATURE_CHECKS: Record<string, ImageSignatureCheck> = {
  '.avif': hasAvifSignature,
  '.gif': (bytes) => asciiPrefix(bytes).startsWith('gif'),
  '.jpeg': (bytes) => startsWithBytes(bytes, [0xff, 0xd8, 0xff]),
  '.jpg': (bytes) => startsWithBytes(bytes, [0xff, 0xd8, 0xff]),
  '.png': (bytes) => startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47]),
  '.svg': hasSvgSignature,
  '.webp': hasWebpSignature,
};

const hasKnownImageSignature = (bytes: Uint8Array, extension: string): boolean =>
  IMAGE_SIGNATURE_CHECKS[extension]?.(bytes) ?? false;

const looksLikeHtmlDocument = (bytes: Uint8Array): boolean => {
  const text = asciiPrefix(bytes);
  return ['<!doctype html', '<html', '<head', '<body'].some((prefix) =>
    text.startsWith(prefix)
  );
};

const isAmbiguousImageLikeResponse = async (
  response: Response,
  extension: string
): Promise<boolean> => {
  const bytes = await readResponsePrefixBytes(response);
  if (bytes === null) return true;
  if (bytes.length === 0) return false;
  if (hasKnownImageSignature(bytes, extension)) return true;
  return !looksLikeHtmlDocument(bytes);
};

const isImageContentTypeResponse = async (response: Response): Promise<boolean> => {
  const bytes = await readResponsePrefixBytes(response);
  if (bytes === null || bytes.length === 0) return true;
  return !looksLikeHtmlDocument(bytes);
};

const responseContentType = (response: Response): string =>
  response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';

export const isRemoteProductImageLikeResponse = async ({
  extension,
  response,
  supportedExtensions,
}: ImageLikeResponseInput): Promise<boolean> => {
  const contentType = responseContentType(response);
  if (contentType.startsWith('image/')) return await isImageContentTypeResponse(response);
  if (contentType.length > 0 && contentType !== 'application/octet-stream') return false;
  if (extension === null || !supportedExtensions.has(extension)) return false;
  return await isAmbiguousImageLikeResponse(response, extension);
};
