import type {
  ContactHoursContent,
  ContactLinkContent,
} from './contactContent';

const TEXT_LIMITS = {
  short: 120,
  medium: 360,
  long: 900,
} as const;

export { TEXT_LIMITS };

type ReadStringParams = {
  source: Record<string, unknown>;
  key: string;
  fallback: string;
  maxLength: number;
  errors: string[];
  path: string;
};

type ReadBooleanParams = {
  source: Record<string, unknown>;
  key: string;
  fallback: boolean;
  errors: string[];
  path: string;
};

type ReadStringListParams = {
  source: Record<string, unknown>;
  key: string;
  fallback: string[];
  maxItems: number;
  maxItemLength: number;
  errors: string[];
  path: string;
};

type ReadLinksParams = {
  input: unknown;
  fallback: ContactLinkContent[];
  maxItems: number;
  errors: string[];
  path: string;
};

export function isContactRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString({
  source,
  key,
  fallback,
  maxLength,
  errors,
  path,
}: ReadStringParams): string {
  const value = source[key];
  if (value === null) return fallback;
  if (typeof value !== 'string') {
    errors.push(`${path} must be text.`);
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors.push(`${path} must be ${maxLength} characters or fewer.`);
    return fallback;
  }

  return trimmed;
}

export function readBoolean({
  source,
  key,
  fallback,
  errors,
  path,
}: ReadBooleanParams): boolean {
  const value = source[key];
  if (value === null) return fallback;
  if (typeof value !== 'boolean') {
    errors.push(`${path} must be true or false.`);
    return fallback;
  }
  return value;
}

function isAllowedHref(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.startsWith('#')) return true;
  if (value.startsWith('mailto:')) return true;
  if (value.startsWith('tel:')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function readHref({
  source,
  key,
  fallback,
  errors,
  path,
}: Omit<ReadStringParams, 'maxLength'>): string {
  const value = readString({
    source,
    key,
    fallback,
    maxLength: TEXT_LIMITS.medium,
    errors,
    path,
  });
  if (value === '') return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${path} must be an internal path, anchor, mailto, tel, or http(s) URL.`);
    return fallback;
  }
  return value;
}

function parseStringListItem(
  item: unknown,
  maxItemLength: number,
  errors: string[],
  path: string,
): string | null {
  if (typeof item !== 'string') {
    errors.push(`${path} can only contain text items.`);
    return null;
  }
  const trimmed = item.trim();
  if (trimmed === '') return '';
  if (trimmed.length > maxItemLength) {
    errors.push(`${path} items must be ${maxItemLength} characters or fewer.`);
    return null;
  }
  return trimmed;
}

export function readStringList({
  source,
  key,
  fallback,
  maxItems,
  maxItemLength,
  errors,
  path,
}: ReadStringListParams): string[] {
  const value = source[key];
  if (value === null) return fallback;
  if (!Array.isArray(value)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const items: string[] = [];
  for (const item of value) {
    const parsed = parseStringListItem(item, maxItemLength, errors, path);
    if (parsed === null) return fallback;
    if (parsed !== '') {
      items.push(parsed);
    }
  }

  if (items.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }

  return items.length > 0 ? items : fallback;
}

export function readLinks({
  input,
  fallback,
  maxItems,
  errors,
  path,
}: ReadLinksParams): ContactLinkContent[] {
  if (input === null) return fallback;
  if (!Array.isArray(input)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const links: ContactLinkContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackLink = fallback[index] ?? { label: '', href: '#' };
    if (!isContactRecord(item)) {
      errors.push(`${path} items must be objects.`);
      return fallback;
    }
    links.push({
      label: readString({
        source: item,
        key: 'label',
        fallback: fallbackLink.label,
        maxLength: TEXT_LIMITS.short,
        errors,
        path: `${path}.${index}.label`,
      }),
      href: readHref({
        source: item,
        key: 'href',
        fallback: fallbackLink.href,
        errors,
        path: `${path}.${index}.href`,
      }),
    });
  }

  if (links.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }

  return links.length > 0 ? links : fallback;
}

export function readHours(input: unknown, fallback: ContactHoursContent[], errors: string[]): ContactHoursContent[] {
  if (input === null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('contact.info.hours must be a list.');
    return fallback;
  }

  const hours: ContactHoursContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackRow = fallback[index] ?? { label: '', value: '', muted: false };
    if (!isContactRecord(item)) {
      errors.push('contact.info.hours items must be objects.');
      return fallback;
    }
    hours.push({
      label: readString({
        source: item,
        key: 'label',
        fallback: fallbackRow.label,
        maxLength: TEXT_LIMITS.short,
        errors,
        path: `contact.info.hours.${index}.label`,
      }),
      value: readString({
        source: item,
        key: 'value',
        fallback: fallbackRow.value,
        maxLength: TEXT_LIMITS.short,
        errors,
        path: `contact.info.hours.${index}.value`,
      }),
      muted: readBoolean({
        source: item,
        key: 'muted',
        fallback: fallbackRow.muted,
        errors,
        path: `contact.info.hours.${index}.muted`,
      }),
    });
  }

  if (hours.length > 10) {
    errors.push('contact.info.hours can contain at most 10 items.');
    return fallback;
  }

  return hours.length > 0 ? hours : fallback;
}
