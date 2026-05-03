export type TransformArgs = Record<string, unknown>;

export type TransformFn = (value: unknown, args: TransformArgs) => unknown;

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d,.\-]/g, '').replace(/,/g, '.');
    if (cleaned.length === 0 || !/\d/.test(cleaned)) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const trim: TransformFn = (value) => {
  const str = asString(value);
  return str === null ? null : str.trim();
};

const toNumber: TransformFn = (value) => asNumber(value);

const money: TransformFn = (value, args) => {
  const amount = asNumber(value);
  if (amount === null) return null;
  const decimals = typeof args['decimals'] === 'number' ? args['decimals'] : 2;
  const factor = 10 ** decimals;
  return Math.round(amount * factor) / factor;
};

const lowercase: TransformFn = (value) => {
  const str = asString(value);
  return str === null ? null : str.toLowerCase();
};

const uppercase: TransformFn = (value) => {
  const str = asString(value);
  return str === null ? null : str.toUpperCase();
};

const NON_DECOMPOSING_LATIN: Readonly<Record<string, string>> = {
  ł: 'l',
  Ł: 'L',
  đ: 'd',
  Đ: 'D',
  ø: 'o',
  Ø: 'O',
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  ß: 'ss',
};

const slug: TransformFn = (value) => {
  const str = asString(value);
  if (str === null) return null;
  const mapped = str.replace(/[ŁłĐđØøÆæŒœß]/g, (ch) => NON_DECOMPOSING_LATIN[ch] ?? ch);
  return mapped
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const absoluteUrl: TransformFn = (value, args) => {
  const str = asString(value);
  if (!str) return null;
  const base = typeof args['base'] === 'string' ? args['base'] : undefined;
  try {
    return new URL(str, base).toString();
  } catch {
    return null;
  }
};

const extractPattern: TransformFn = (value, args) => {
  const str = asString(value);
  if (!str || typeof args['pattern'] !== 'string') return null;
  const flags = typeof args['flags'] === 'string' ? args['flags'] : undefined;
  const regex = new RegExp(args['pattern'], flags);
  const match = regex.exec(str);
  if (!match) return null;
  return match[1] ?? match[0];
};

const replace: TransformFn = (value, args) => {
  const str = asString(value);
  if (str === null) return null;
  if (typeof args['pattern'] !== 'string') return str;
  const flags = typeof args['flags'] === 'string' ? args['flags'] : 'g';
  const replacement = typeof args['replacement'] === 'string' ? args['replacement'] : '';
  return str.replace(new RegExp(args['pattern'], flags), replacement);
};

const coerceStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const maybeUrl = (item as Record<string, unknown>)['url'];
          if (typeof maybeUrl === 'string') return maybeUrl.trim();
        }
        return '';
      })
      .filter((item) => item.length > 0);
  }
  const str = asString(value);
  return str ? [str.trim()] : [];
};

const toStringArray: TransformFn = (value) => coerceStringArray(value);

const joinArray: TransformFn = (value, args) => {
  const arr = coerceStringArray(value);
  const separator = typeof args['separator'] === 'string' ? args['separator'] : ', ';
  return arr.join(separator);
};

const pickFirst: TransformFn = (value) => {
  if (Array.isArray(value)) return value.length > 0 ? value[0] : null;
  return value;
};

const defaultTo: TransformFn = (value, args) => {
  if (value === null || value === undefined || value === '') return args['value'] ?? null;
  return value;
};

const stripHtml: TransformFn = (value) => {
  const str = asString(value);
  if (str === null) return null;
  return str
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const BUILTIN_TRANSFORMS: Readonly<Record<string, TransformFn>> = Object.freeze({
  trim,
  toNumber,
  money,
  lowercase,
  uppercase,
  slug,
  absoluteUrl,
  extractPattern,
  replace,
  toStringArray,
  joinArray,
  pickFirst,
  defaultTo,
  stripHtml,
});

export type TransformRegistry = Readonly<Record<string, TransformFn>>;

export const applyTransforms = (
  value: unknown,
  refs: readonly { name: string; args?: TransformArgs }[] | undefined,
  registry: TransformRegistry = BUILTIN_TRANSFORMS
): { value: unknown; missing: string[] } => {
  if (!refs || refs.length === 0) return { value, missing: [] };
  const missing: string[] = [];
  let current: unknown = value;
  for (const ref of refs) {
    const fn = registry[ref.name];
    if (!fn) {
      missing.push(ref.name);
      continue;
    }
    current = fn(current, ref.args ?? {});
  }
  return { value: current, missing };
};
