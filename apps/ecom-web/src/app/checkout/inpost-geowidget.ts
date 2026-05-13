import { normalizeInpostPointCode } from '@/lib/inpost-point-code';
import type { InpostPoint } from '@/lib/orders';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPointString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readNestedRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  return isPlainRecord(value) ? value : {};
}

function toOptionalText(value: string): string | undefined {
  return value === '' ? undefined : value;
}

function firstNonEmptyString(items: readonly string[]): string {
  for (const item of items) {
    if (item !== '') return item;
  }
  return '';
}

function joinAddressParts(parts: readonly string[]): string {
  return parts.filter((part) => part !== '').join(' ').trim();
}

function pointPayload(value: Record<string, unknown>): Record<string, unknown> {
  const nestedPoint = readNestedRecord(value, 'point');
  if (readPointString(nestedPoint, 'name') !== '' || readPointString(nestedPoint, 'id') !== '') {
    return nestedPoint;
  }
  return value;
}

export type GeowidgetPointSelectedRegistrar = (callback: (point: unknown) => void) => void;

export function normalizeGeowidgetPoint(value: unknown): InpostPoint | null {
  if (!isPlainRecord(value)) return null;

  const source = pointPayload(value);
  const rawName = firstNonEmptyString([
    readPointString(source, 'name'),
    readPointString(source, 'id'),
  ]);
  const code = normalizeInpostPointCode(rawName);
  if (code === null) return null;

  const address = readNestedRecord(source, 'address');
  const addressDetails = readNestedRecord(source, 'address_details');
  const location = readNestedRecord(source, 'location');
  const streetAddress = joinAddressParts([
    readPointString(addressDetails, 'street'),
    readPointString(addressDetails, 'building_number'),
  ]);
  const addressLine1 = firstNonEmptyString([
    readPointString(address, 'line1'),
    readPointString(source, 'address'),
    streetAddress,
  ]);
  const addressLine2 = readPointString(address, 'line2');

  return {
    id: code,
    name: code,
    description: toOptionalText(readPointString(source, 'description')),
    addressLine1: toOptionalText(addressLine1),
    addressLine2: toOptionalText(addressLine2),
    city: toOptionalText(readPointString(addressDetails, 'city')),
    postCode: toOptionalText(readPointString(addressDetails, 'post_code')),
    latitude: typeof location['latitude'] === 'number' ? location['latitude'] : undefined,
    longitude: typeof location['longitude'] === 'number' ? location['longitude'] : undefined,
  };
}

export function normalizeGeowidgetEventPoint(event: Event): InpostPoint | null {
  const eventWithPayload = event as Event & { detail?: unknown; details?: unknown };
  return normalizeGeowidgetPoint(eventWithPayload.detail ?? eventWithPayload.details);
}

export function readGeowidgetPointSelectedRegistrar(event: Event): GeowidgetPointSelectedRegistrar | null {
  const detail = (event as Event & { detail?: unknown }).detail;
  if (!isPlainRecord(detail)) return null;
  const api = detail['api'];
  if (!isPlainRecord(api)) return null;
  const addPointSelectedCallback = api['addPointSelectedCallback'];
  if (typeof addPointSelectedCallback !== 'function') return null;

  return (callback: (point: unknown) => void): void => {
    (addPointSelectedCallback as (callback: (point: unknown) => void) => void).call(api, callback);
  };
}
