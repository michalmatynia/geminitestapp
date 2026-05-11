export interface ValuesHeroContent {
  watermark: string;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  body: string;
}

export interface ValuesStatContent {
  value: string;
  label: string;
}

export interface ValuesMaterialContent {
  name: string;
  origin: string;
  desc: string;
}

export interface ValuesCommitmentContent {
  title: string;
  body: string;
}

export interface ValuesClosingContent {
  quote: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
}

export interface ValuesContent {
  hero: ValuesHeroContent;
  stats: ValuesStatContent[];
  materialsEyebrow: string;
  materialsTitle: string;
  materials: ValuesMaterialContent[];
  commitmentsEyebrow: string;
  commitmentsTitle: string;
  commitments: ValuesCommitmentContent[];
  closing: ValuesClosingContent;
}

export interface ValuesContentValidationResult {
  content: ValuesContent;
  errors: string[];
}

export const VALUES_CONTENT_DEFAULTS: ValuesContent = {
  hero: {
    watermark: 'Values',
    eyebrow: 'How we work',
    titleLine1: 'Objects are not made.',
    titleLine2: 'They are earned.',
    body:
      'Every material has a provenance. Every maker has a name. Every object we sell should outlast the season \u2014 and the decade \u2014 it was made in.',
  },
  stats: [
    { value: '8', label: 'Maker studios' },
    { value: '5', label: 'Countries of origin' },
    { value: '100%', label: 'Natural materials' },
    { value: '\u221e', label: 'Repair guarantee' },
  ],
  materialsEyebrow: 'What we use',
  materialsTitle: 'The materials',
  materials: [
    {
      name: 'Belgian Linen',
      origin: 'Ghent, Belgium',
      desc:
        'Stone-washed in small batches. No bleach, no optical brighteners. The flax is retted in river water according to a process unchanged for 400 years.',
    },
    {
      name: 'Vegetable Leather',
      origin: 'Perigord, France',
      desc:
        'Tanned with oak bark over 12 months. No chrome salts. The leather develops its own character \u2014 we consider each bag finished when you do.',
    },
    {
      name: 'Shetland Wool',
      origin: 'Outer Hebrides, Scotland',
      desc:
        'Undyed and unwashed beyond a cold-water rinse. The natural lanolin remains. Spun on century-old jacquard looms on the island of Harris.',
    },
    {
      name: 'Stoneware Clay',
      origin: 'Limoges, France',
      desc:
        "Hand-thrown by three ceramicists working in independent studios. Natural ash glazes only. No two pieces are identical \u2014 each carries the maker's touch in the clay.",
    },
    {
      name: 'Carrara Marble',
      origin: 'Tuscany, Italy',
      desc:
        'Quarried by a family in its fourth generation. Carved by hand rather than machine-routed. The veining in every piece is the record of millions of years underground.',
    },
    {
      name: 'Black Walnut',
      origin: 'Danish workshop, American timber',
      desc:
        'Sourced from FSC-certified forests. Dried for two years before milling. Finished with food-safe hard oil \u2014 three coats, each hand-rubbed before the next is applied.',
    },
  ],
  commitmentsEyebrow: 'Our commitments',
  commitmentsTitle: 'How we operate',
  commitments: [
    {
      title: 'No seasonal collections',
      body:
        'We release objects when they are ready, not when the calendar demands it. No fashion weeks, no trend cycles. Each piece is designed to remain relevant indefinitely.',
    },
    {
      title: 'Direct artisan relationships',
      body:
        'Every maker we work with is named and paid fairly above market rate. We visit each studio at least once per year. Our margins are lower as a result \u2014 we consider this correct.',
    },
    {
      title: 'Carbon offset on every shipment',
      body:
        'We partner with Pachama to offset the carbon footprint of every delivery. Shipping boxes are recycled paper with water-based inks. We use no plastic in our packaging.',
    },
    {
      title: 'Lifetime repair programme',
      body:
        'We will repair any STARGATER object for the lifetime of the owner at cost price. A broken clasp, a worn sole, a chipped glaze \u2014 send it back. We will make it right.',
    },
    {
      title: 'No paid advertising',
      body:
        'We do not run paid social media or influencer campaigns. Every customer who finds STARGATER does so through editorial coverage, word of mouth, or the objects themselves.',
    },
    {
      title: 'B-Corp certification in progress',
      body:
        'We began our B-Corp certification process in January 2026. Our current score is 84.2 \u2014 the certification threshold is 80. We expect full certification by Q4 2026.',
    },
  ],
  closing: {
    quote: 'The best objects are the ones that ask nothing of you \u2014 they simply endure.',
    primaryCtaLabel: 'Meet our makers',
    primaryCtaHref: '/about',
    secondaryCtaLabel: 'Shop the collection',
    secondaryCtaHref: '/',
  },
};

const TEXT_LIMITS = {
  short: 120,
  medium: 300,
  long: 1000,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
  maxLength: number,
  errors: string[],
  path: string,
): string {
  const value = source[key];
  if (value == null) return fallback;
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

function isAllowedHref(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.startsWith('#')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function readHref(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
  errors: string[],
  path: string,
): string {
  const value = readString(source, key, fallback, TEXT_LIMITS.medium, errors, path);
  if (!value) return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${path} must be an internal path, anchor, or http(s) URL.`);
    return fallback;
  }
  return value;
}

function readStats(source: Record<string, unknown>, key: string, fallback: ValuesStatContent[], errors: string[]): ValuesStatContent[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('values.stats must be a list.');
    return fallback;
  }

  const stats: ValuesStatContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackStat = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('values.stats items must be objects.');
      return fallback;
    }
    stats.push({
      value: readString(item, 'value', fallbackStat.value, TEXT_LIMITS.short, errors, `values.stats.${index}.value`),
      label: readString(item, 'label', fallbackStat.label, TEXT_LIMITS.short, errors, `values.stats.${index}.label`),
    });
  }

  if (stats.length > 8) {
    errors.push('values.stats can contain at most 8 items.');
    return fallback;
  }

  return stats.length > 0 ? stats : fallback;
}

function readMaterials(
  source: Record<string, unknown>,
  key: string,
  fallback: ValuesMaterialContent[],
  errors: string[],
): ValuesMaterialContent[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('values.materials must be a list.');
    return fallback;
  }

  const materials: ValuesMaterialContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackMaterial = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('values.materials items must be objects.');
      return fallback;
    }
    materials.push({
      name: readString(item, 'name', fallbackMaterial.name, TEXT_LIMITS.short, errors, `values.materials.${index}.name`),
      origin: readString(item, 'origin', fallbackMaterial.origin, TEXT_LIMITS.short, errors, `values.materials.${index}.origin`),
      desc: readString(item, 'desc', fallbackMaterial.desc, TEXT_LIMITS.long, errors, `values.materials.${index}.desc`),
    });
  }

  if (materials.length > 12) {
    errors.push('values.materials can contain at most 12 items.');
    return fallback;
  }

  return materials.length > 0 ? materials : fallback;
}

function readCommitments(
  source: Record<string, unknown>,
  key: string,
  fallback: ValuesCommitmentContent[],
  errors: string[],
): ValuesCommitmentContent[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('values.commitments must be a list.');
    return fallback;
  }

  const commitments: ValuesCommitmentContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackCommitment = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('values.commitments items must be objects.');
      return fallback;
    }
    commitments.push({
      title: readString(item, 'title', fallbackCommitment.title, TEXT_LIMITS.short, errors, `values.commitments.${index}.title`),
      body: readString(item, 'body', fallbackCommitment.body, TEXT_LIMITS.long, errors, `values.commitments.${index}.body`),
    });
  }

  if (commitments.length > 12) {
    errors.push('values.commitments can contain at most 12 items.');
    return fallback;
  }

  return commitments.length > 0 ? commitments : fallback;
}

export function validateValuesContent(input: unknown): ValuesContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};
  const hero = isRecord(root['hero']) ? root['hero'] : {};
  const closing = isRecord(root['closing']) ? root['closing'] : {};

  const content: ValuesContent = {
    hero: {
      watermark: readString(hero, 'watermark', VALUES_CONTENT_DEFAULTS.hero.watermark, TEXT_LIMITS.short, errors, 'values.hero.watermark'),
      eyebrow: readString(hero, 'eyebrow', VALUES_CONTENT_DEFAULTS.hero.eyebrow, TEXT_LIMITS.short, errors, 'values.hero.eyebrow'),
      titleLine1: readString(hero, 'titleLine1', VALUES_CONTENT_DEFAULTS.hero.titleLine1, TEXT_LIMITS.short, errors, 'values.hero.titleLine1'),
      titleLine2: readString(hero, 'titleLine2', VALUES_CONTENT_DEFAULTS.hero.titleLine2, TEXT_LIMITS.short, errors, 'values.hero.titleLine2'),
      body: readString(hero, 'body', VALUES_CONTENT_DEFAULTS.hero.body, TEXT_LIMITS.long, errors, 'values.hero.body'),
    },
    stats: readStats(root, 'stats', VALUES_CONTENT_DEFAULTS.stats, errors),
    materialsEyebrow: readString(
      root,
      'materialsEyebrow',
      VALUES_CONTENT_DEFAULTS.materialsEyebrow,
      TEXT_LIMITS.short,
      errors,
      'values.materialsEyebrow',
    ),
    materialsTitle: readString(
      root,
      'materialsTitle',
      VALUES_CONTENT_DEFAULTS.materialsTitle,
      TEXT_LIMITS.short,
      errors,
      'values.materialsTitle',
    ),
    materials: readMaterials(root, 'materials', VALUES_CONTENT_DEFAULTS.materials, errors),
    commitmentsEyebrow: readString(
      root,
      'commitmentsEyebrow',
      VALUES_CONTENT_DEFAULTS.commitmentsEyebrow,
      TEXT_LIMITS.short,
      errors,
      'values.commitmentsEyebrow',
    ),
    commitmentsTitle: readString(
      root,
      'commitmentsTitle',
      VALUES_CONTENT_DEFAULTS.commitmentsTitle,
      TEXT_LIMITS.short,
      errors,
      'values.commitmentsTitle',
    ),
    commitments: readCommitments(root, 'commitments', VALUES_CONTENT_DEFAULTS.commitments, errors),
    closing: {
      quote: readString(closing, 'quote', VALUES_CONTENT_DEFAULTS.closing.quote, TEXT_LIMITS.long, errors, 'values.closing.quote'),
      primaryCtaLabel: readString(
        closing,
        'primaryCtaLabel',
        VALUES_CONTENT_DEFAULTS.closing.primaryCtaLabel,
        TEXT_LIMITS.short,
        errors,
        'values.closing.primaryCtaLabel',
      ),
      primaryCtaHref: readHref(
        closing,
        'primaryCtaHref',
        VALUES_CONTENT_DEFAULTS.closing.primaryCtaHref,
        errors,
        'values.closing.primaryCtaHref',
      ),
      secondaryCtaLabel: readString(
        closing,
        'secondaryCtaLabel',
        VALUES_CONTENT_DEFAULTS.closing.secondaryCtaLabel,
        TEXT_LIMITS.short,
        errors,
        'values.closing.secondaryCtaLabel',
      ),
      secondaryCtaHref: readHref(
        closing,
        'secondaryCtaHref',
        VALUES_CONTENT_DEFAULTS.closing.secondaryCtaHref,
        errors,
        'values.closing.secondaryCtaHref',
      ),
    },
  };

  return { content, errors };
}

export function normalizeValuesContent(input: unknown): ValuesContent {
  return validateValuesContent(input).content;
}
