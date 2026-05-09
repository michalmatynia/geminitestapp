import { badRequestError } from '@/shared/errors/app-error';

type ImageDimensions = { width: number; height: number };

const hasPngSignature = (bytes: Uint8Array): boolean =>
  bytes[0] === 0x89 && bytes[1] === 0x50;

const hasJpegSignature = (bytes: Uint8Array): boolean =>
  bytes[0] === 0xff && bytes[1] === 0xd8;

const readByte = (bytes: Uint8Array, index: number): number => {
  const value = bytes[index];
  if (value === undefined) throw badRequestError(`Invalid image buffer: byte at index ${index} is out of bounds (buffer length: ${bytes.length}).`);
  return value;
};

const readUint16 = (bytes: Uint8Array, index: number): number =>
  (readByte(bytes, index) << 8) | readByte(bytes, index + 1);

const readUint32 = (bytes: Uint8Array, index: number): number =>
  (readByte(bytes, index) << 24) |
  (readByte(bytes, index + 1) << 16) |
  (readByte(bytes, index + 2) << 8) |
  readByte(bytes, index + 3);

const getPngDimensions = (bytes: Uint8Array): ImageDimensions => {
  if (bytes.length < 24) throw badRequestError(`Invalid PNG buffer: expected at least 24 bytes to read dimensions, but got ${bytes.length}.`);
  return { width: readUint32(bytes, 16), height: readUint32(bytes, 20) };
};

const isJpegSofMarker = (marker: number): boolean =>
  marker >= 0xc0 &&
  marker <= 0xcf &&
  marker !== 0xc4 &&
  marker !== 0xc8 &&
  marker !== 0xcc;

const isStandaloneJpegMarker = (marker: number): boolean =>
  marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9);

const readJpegSofDimensions = (
  bytes: Uint8Array,
  offset: number
): ImageDimensions | null => {
  if (offset + 8 >= bytes.length) return null;
  const height = readUint16(bytes, offset + 5);
  const width = readUint16(bytes, offset + 7);
  return width > 0 && height > 0 ? { width, height } : null;
};

const getJpegNextOffset = (
  bytes: Uint8Array,
  offset: number,
  marker: number
): number | null => {
  if (marker === 0xd9) return null;
  if (isStandaloneJpegMarker(marker)) return offset + 2;
  if (offset + 3 >= bytes.length) return null;
  const segmentLength = readUint16(bytes, offset + 2);
  if (segmentLength < 2) return null;
  return offset + 2 + segmentLength;
};

const getJpegDimensions = (bytes: Uint8Array): ImageDimensions => {
  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (readByte(bytes, offset) !== 0xff) break;
    const marker = readByte(bytes, offset + 1);
    if (isJpegSofMarker(marker)) {
      const dimensions = readJpegSofDimensions(bytes, offset);
      if (dimensions !== null) return dimensions;
    }
    const nextOffset = getJpegNextOffset(bytes, offset, marker);
    if (nextOffset === null) break;
    offset = nextOffset;
  }
  throw badRequestError('Could not parse JPEG dimensions. The file may be corrupt or use an unsupported JPEG encoding.');
};

export const getImageDimensions = (buffer: ArrayBuffer): ImageDimensions => {
  const bytes = new Uint8Array(buffer);
  if (hasPngSignature(bytes)) return getPngDimensions(bytes);
  if (hasJpegSignature(bytes)) return getJpegDimensions(bytes);
  throw badRequestError('Unsupported image format for dimension reading. Only PNG and JPEG files are supported.');
};
