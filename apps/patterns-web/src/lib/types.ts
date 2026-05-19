export const PATTERN_CATEGORIES = [
  'architecture',
  'botanical',
  'editorial',
  'interior',
  'textile',
] as const;

export type PatternCategory = typeof PATTERN_CATEGORIES[number];

export const PATTERN_LICENSE_IDS = ['personal', 'studio', 'extended'] as const;

export type PatternLicenseId = typeof PATTERN_LICENSE_IDS[number];

export const PATTERN_FORMATS = ['SVG', 'PDF', 'AI', 'EPS', 'PNG'] as const;

export type PatternFormat = typeof PATTERN_FORMATS[number];

export const PATTERN_MOTIFS = [
  'arches',
  'botanical-trace',
  'constellation',
  'cut-stone',
  'grid',
  'paper-fold',
  'terrazzo',
  'tile',
  'wave',
  'weave',
] as const;

export type PatternMotif = typeof PATTERN_MOTIFS[number];

export type PatternLicense = {
  id: PatternLicenseId;
  label: string;
  price: number;
  summary: string;
};

export type PatternPreview = {
  motif: PatternMotif;
  paper: string;
  ink: string;
  accent: string;
  density: number;
};

export type PatternProduct = {
  id: string;
  slug: string;
  name: string;
  collection: string;
  edition: string;
  category: PatternCategory;
  description: string;
  tags: string[];
  formats: PatternFormat[];
  repeatSize: string;
  fileSize: string;
  updatedAt: string;
  featured: boolean;
  status: 'published' | 'draft';
  preview: PatternPreview;
  defaultLicense: PatternLicenseId;
  licenses: PatternLicense[];
};

export type PatternCatalogSource = 'mongo' | 'fallback';

export type PatternCatalogResult = {
  patterns: PatternProduct[];
  source: PatternCatalogSource;
};
