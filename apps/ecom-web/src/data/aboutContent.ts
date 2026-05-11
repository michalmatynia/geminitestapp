export interface AboutHeroContent {
  watermark: string;
  eyebrow: string;
  title: string;
  body: string;
}

export interface AboutOriginContent {
  eyebrow: string;
  title: string;
  paragraphs: string[];
}

export interface AboutStatContent {
  value: string;
  label: string;
  sub: string;
}

export interface AboutMilestoneContent {
  year: string;
  event: string;
}

export interface AboutArtisanContent {
  name: string;
  role: string;
  location: string;
  note: string;
}

export interface AboutValueContent {
  number: string;
  title: string;
  body: string;
}

export interface AboutClosingContent {
  quote: string;
  attribution: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
}

export interface AboutContent {
  hero: AboutHeroContent;
  origin: AboutOriginContent;
  statsEyebrow: string;
  stats: AboutStatContent[];
  historyEyebrow: string;
  milestones: AboutMilestoneContent[];
  artisansEyebrow: string;
  artisansTitle: string;
  artisansCtaLabel: string;
  artisansCtaHref: string;
  artisans: AboutArtisanContent[];
  valuesEyebrow: string;
  values: AboutValueContent[];
  closing: AboutClosingContent;
}

export interface AboutContentValidationResult {
  content: AboutContent;
  errors: string[];
}

export const ABOUT_CONTENT_DEFAULTS: AboutContent = {
  hero: {
    watermark: 'STARGATER',
    eyebrow: 'Founded 2012 — Lyon, France',
    title: 'Objects of Enduring Beauty',
    body:
      'We are a small luxury house making things that last. Everything we sell was made by a person whose name we know, in a place we have visited, using materials we can trace to their source.',
  },
  origin: {
    eyebrow: 'The beginning',
    title: 'A linen shirt and a question',
    paragraphs: [
      'Stargater began with a single question: why does everything fall apart? Clara Morin, then working as a textile designer in Lyon, bought a linen shirt from a market stall in Bruges in 2011. She is still wearing it.',
      'The shirt was not expensive. It was made by a weaver who had learned from his father, using techniques unchanged in three centuries. The price reflected craft, not brand. She began asking why this was so rare.',
      'With her husband Étienne — a leather goods maker with a workshop in the Périgord — she spent two years identifying the last remaining practitioners of the techniques they admired: linen weavers, vegetable tanners, stone carvers, ceramicists. The people who had not optimised for speed.',
      'In 2012, they made 200 linen shirts from the Bruges workshop. They sold them from a table at a Paris design fair. By the end of the weekend, they were gone. Stargater began.',
    ],
  },
  statsEyebrow: 'By the numbers',
  stats: [
    { value: '38', label: 'Named artisans', sub: 'across 9 countries' },
    { value: '840+', label: 'Objects in the archive', sub: 'since 2012' },
    { value: '∞', label: 'Repair guarantee', sub: 'on everything we make' },
    { value: '0', label: 'Trend collections', sub: 'we do not do seasons' },
  ],
  historyEyebrow: 'History',
  milestones: [
    { year: '2012', event: 'Founded in Lyon by Clara and Étienne Morin, with a single linen textile run of 200 pieces.' },
    { year: '2014', event: 'First leather collaboration with the Garonne tannery in Ribérac. The cognac tote sells out in three days.' },
    { year: '2016', event: 'Opened the Paris atelier on Rue du Temple. Began working with ceramicist Hélène Morin.' },
    { year: '2018', event: 'First international collection. Stocked in six countries. Still made by fewer than forty artisans.' },
    { year: '2021', event: 'Launched the Objects line. Furniture, vessels, lights — all repaired or replaced for life.' },
    { year: '2024', event: 'Committed to zero virgin plastic in all packaging. Switched to reclaimed kraft and linen cloth wrapping.' },
  ],
  artisansEyebrow: 'The makers',
  artisansTitle: 'Artisans',
  artisansCtaLabel: 'Read their stories',
  artisansCtaHref: '/stories',
  artisans: [
    {
      name: 'Hélène Morin',
      role: 'Ceramicist',
      location: 'Limoges, France',
      note: 'Makes every Stargater vessel alone, by hand, in a converted stable outside the city. Refuses to work with moulds.',
    },
    {
      name: 'Hendrik De Wolf',
      role: 'Master Weaver',
      location: 'Bruges, Belgium',
      note: 'One of three remaining draw-loom weavers in Belgium. Has been weaving linen for forty years. Will not rush.',
    },
    {
      name: 'Lars Bundgaard',
      role: 'Furniture Maker',
      location: 'Aarhus, Denmark',
      note: 'Builds furniture without glue or screws. Every joint is mechanical, every surface oiled. Will repair anything he makes, forever.',
    },
    {
      name: 'Catriona MacLeod',
      role: 'Textile Weaver',
      location: 'Isle of Lewis, Scotland',
      note: 'Third-generation operator of the Shawbost Mill. Weaves undyed Shetland wool on a loom built in 1923.',
    },
  ],
  valuesEyebrow: 'How we work',
  values: [
    {
      number: '01',
      title: 'Made once, kept forever',
      body: 'We design everything to outlast a trend cycle. If you buy it from us, it should still be with you in twenty years.',
    },
    {
      number: '02',
      title: 'Named makers only',
      body: 'Every object on this site was made by a specific person in a specific place. We know them. We will introduce you.',
    },
    {
      number: '03',
      title: 'Repair over replace',
      body: 'We maintain a repair service for every object we have ever sold. Bring it back. We will fix it.',
    },
    {
      number: '04',
      title: 'Slow production',
      body: 'We do not respond to trends with new collections. We make things when they are ready. Sometimes that takes three years.',
    },
  ],
  closing: {
    quote: 'Come slowly. Choose carefully. Buy the thing you will still want in fifteen years.',
    attribution: '— Clara Morin, Founder',
    primaryCtaLabel: 'Explore the collection',
    primaryCtaHref: '/',
    secondaryCtaLabel: 'Read our stories',
    secondaryCtaHref: '/stories',
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

function readStringList(
  source: Record<string, unknown>,
  key: string,
  fallback: string[],
  maxItems: number,
  maxItemLength: number,
  errors: string[],
  path: string,
): string[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      errors.push(`${path} can only contain text items.`);
      return fallback;
    }
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxItemLength) {
      errors.push(`${path} items must be ${maxItemLength} characters or fewer.`);
      return fallback;
    }
    items.push(trimmed);
  }

  if (items.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }

  return items.length > 0 ? items : fallback;
}

function readStats(source: Record<string, unknown>, key: string, fallback: AboutStatContent[], errors: string[]): AboutStatContent[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('about.stats must be a list.');
    return fallback;
  }

  const stats: AboutStatContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackStat = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('about.stats items must be objects.');
      return fallback;
    }
    stats.push({
      value: readString(item, 'value', fallbackStat.value, TEXT_LIMITS.short, errors, `about.stats.${index}.value`),
      label: readString(item, 'label', fallbackStat.label, TEXT_LIMITS.short, errors, `about.stats.${index}.label`),
      sub: readString(item, 'sub', fallbackStat.sub, TEXT_LIMITS.short, errors, `about.stats.${index}.sub`),
    });
  }

  if (stats.length > 8) {
    errors.push('about.stats can contain at most 8 items.');
    return fallback;
  }

  return stats.length > 0 ? stats : fallback;
}

function readMilestones(
  source: Record<string, unknown>,
  key: string,
  fallback: AboutMilestoneContent[],
  errors: string[],
): AboutMilestoneContent[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('about.milestones must be a list.');
    return fallback;
  }

  const milestones: AboutMilestoneContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackMilestone = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('about.milestones items must be objects.');
      return fallback;
    }
    milestones.push({
      year: readString(item, 'year', fallbackMilestone.year, TEXT_LIMITS.short, errors, `about.milestones.${index}.year`),
      event: readString(item, 'event', fallbackMilestone.event, TEXT_LIMITS.long, errors, `about.milestones.${index}.event`),
    });
  }

  if (milestones.length > 16) {
    errors.push('about.milestones can contain at most 16 items.');
    return fallback;
  }

  return milestones.length > 0 ? milestones : fallback;
}

function readArtisans(
  source: Record<string, unknown>,
  key: string,
  fallback: AboutArtisanContent[],
  errors: string[],
): AboutArtisanContent[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('about.artisans must be a list.');
    return fallback;
  }

  const artisans: AboutArtisanContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackArtisan = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('about.artisans items must be objects.');
      return fallback;
    }
    artisans.push({
      name: readString(item, 'name', fallbackArtisan.name, TEXT_LIMITS.short, errors, `about.artisans.${index}.name`),
      role: readString(item, 'role', fallbackArtisan.role, TEXT_LIMITS.short, errors, `about.artisans.${index}.role`),
      location: readString(item, 'location', fallbackArtisan.location, TEXT_LIMITS.short, errors, `about.artisans.${index}.location`),
      note: readString(item, 'note', fallbackArtisan.note, TEXT_LIMITS.long, errors, `about.artisans.${index}.note`),
    });
  }

  if (artisans.length > 12) {
    errors.push('about.artisans can contain at most 12 items.');
    return fallback;
  }

  return artisans.length > 0 ? artisans : fallback;
}

function readValues(source: Record<string, unknown>, key: string, fallback: AboutValueContent[], errors: string[]): AboutValueContent[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('about.values must be a list.');
    return fallback;
  }

  const values: AboutValueContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackValue = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('about.values items must be objects.');
      return fallback;
    }
    values.push({
      number: readString(item, 'number', fallbackValue.number, TEXT_LIMITS.short, errors, `about.values.${index}.number`),
      title: readString(item, 'title', fallbackValue.title, TEXT_LIMITS.short, errors, `about.values.${index}.title`),
      body: readString(item, 'body', fallbackValue.body, TEXT_LIMITS.long, errors, `about.values.${index}.body`),
    });
  }

  if (values.length > 12) {
    errors.push('about.values can contain at most 12 items.');
    return fallback;
  }

  return values.length > 0 ? values : fallback;
}

export function validateAboutContent(input: unknown): AboutContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};
  const hero = isRecord(root['hero']) ? root['hero'] : {};
  const origin = isRecord(root['origin']) ? root['origin'] : {};
  const closing = isRecord(root['closing']) ? root['closing'] : {};

  const content: AboutContent = {
    hero: {
      watermark: readString(hero, 'watermark', ABOUT_CONTENT_DEFAULTS.hero.watermark, TEXT_LIMITS.short, errors, 'about.hero.watermark'),
      eyebrow: readString(hero, 'eyebrow', ABOUT_CONTENT_DEFAULTS.hero.eyebrow, TEXT_LIMITS.short, errors, 'about.hero.eyebrow'),
      title: readString(hero, 'title', ABOUT_CONTENT_DEFAULTS.hero.title, TEXT_LIMITS.short, errors, 'about.hero.title'),
      body: readString(hero, 'body', ABOUT_CONTENT_DEFAULTS.hero.body, TEXT_LIMITS.long, errors, 'about.hero.body'),
    },
    origin: {
      eyebrow: readString(origin, 'eyebrow', ABOUT_CONTENT_DEFAULTS.origin.eyebrow, TEXT_LIMITS.short, errors, 'about.origin.eyebrow'),
      title: readString(origin, 'title', ABOUT_CONTENT_DEFAULTS.origin.title, TEXT_LIMITS.short, errors, 'about.origin.title'),
      paragraphs: readStringList(
        origin,
        'paragraphs',
        ABOUT_CONTENT_DEFAULTS.origin.paragraphs,
        8,
        TEXT_LIMITS.long,
        errors,
        'about.origin.paragraphs',
      ),
    },
    statsEyebrow: readString(
      root,
      'statsEyebrow',
      ABOUT_CONTENT_DEFAULTS.statsEyebrow,
      TEXT_LIMITS.short,
      errors,
      'about.statsEyebrow',
    ),
    stats: readStats(root, 'stats', ABOUT_CONTENT_DEFAULTS.stats, errors),
    historyEyebrow: readString(
      root,
      'historyEyebrow',
      ABOUT_CONTENT_DEFAULTS.historyEyebrow,
      TEXT_LIMITS.short,
      errors,
      'about.historyEyebrow',
    ),
    milestones: readMilestones(root, 'milestones', ABOUT_CONTENT_DEFAULTS.milestones, errors),
    artisansEyebrow: readString(
      root,
      'artisansEyebrow',
      ABOUT_CONTENT_DEFAULTS.artisansEyebrow,
      TEXT_LIMITS.short,
      errors,
      'about.artisansEyebrow',
    ),
    artisansTitle: readString(
      root,
      'artisansTitle',
      ABOUT_CONTENT_DEFAULTS.artisansTitle,
      TEXT_LIMITS.short,
      errors,
      'about.artisansTitle',
    ),
    artisansCtaLabel: readString(
      root,
      'artisansCtaLabel',
      ABOUT_CONTENT_DEFAULTS.artisansCtaLabel,
      TEXT_LIMITS.short,
      errors,
      'about.artisansCtaLabel',
    ),
    artisansCtaHref: readHref(
      root,
      'artisansCtaHref',
      ABOUT_CONTENT_DEFAULTS.artisansCtaHref,
      errors,
      'about.artisansCtaHref',
    ),
    artisans: readArtisans(root, 'artisans', ABOUT_CONTENT_DEFAULTS.artisans, errors),
    valuesEyebrow: readString(
      root,
      'valuesEyebrow',
      ABOUT_CONTENT_DEFAULTS.valuesEyebrow,
      TEXT_LIMITS.short,
      errors,
      'about.valuesEyebrow',
    ),
    values: readValues(root, 'values', ABOUT_CONTENT_DEFAULTS.values, errors),
    closing: {
      quote: readString(closing, 'quote', ABOUT_CONTENT_DEFAULTS.closing.quote, TEXT_LIMITS.long, errors, 'about.closing.quote'),
      attribution: readString(
        closing,
        'attribution',
        ABOUT_CONTENT_DEFAULTS.closing.attribution,
        TEXT_LIMITS.short,
        errors,
        'about.closing.attribution',
      ),
      primaryCtaLabel: readString(
        closing,
        'primaryCtaLabel',
        ABOUT_CONTENT_DEFAULTS.closing.primaryCtaLabel,
        TEXT_LIMITS.short,
        errors,
        'about.closing.primaryCtaLabel',
      ),
      primaryCtaHref: readHref(
        closing,
        'primaryCtaHref',
        ABOUT_CONTENT_DEFAULTS.closing.primaryCtaHref,
        errors,
        'about.closing.primaryCtaHref',
      ),
      secondaryCtaLabel: readString(
        closing,
        'secondaryCtaLabel',
        ABOUT_CONTENT_DEFAULTS.closing.secondaryCtaLabel,
        TEXT_LIMITS.short,
        errors,
        'about.closing.secondaryCtaLabel',
      ),
      secondaryCtaHref: readHref(
        closing,
        'secondaryCtaHref',
        ABOUT_CONTENT_DEFAULTS.closing.secondaryCtaHref,
        errors,
        'about.closing.secondaryCtaHref',
      ),
    },
  };

  return { content, errors };
}

export function normalizeAboutContent(input: unknown): AboutContent {
  return validateAboutContent(input).content;
}
