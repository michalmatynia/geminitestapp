import {
  buildValuesContent,
  isValuesRecord,
} from './valuesContentHelpers';

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
        'Hand-thrown by three ceramicists working in independent studios. Natural ash glazes only. No two pieces are identical \u2014 each carries the maker\'s touch in the clay.',
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

export function validateValuesContent(input: unknown): ValuesContentValidationResult {
  const errors: string[] = [];
  const content = buildValuesContent(
    isValuesRecord(input) ? input : {},
    VALUES_CONTENT_DEFAULTS,
    errors,
  );

  return {
    content,
    errors,
  };
}

export function normalizeValuesContent(input: unknown): ValuesContent {
  return validateValuesContent(input).content;
}
