export type ArchLocale = 'en' | 'de' | 'pl';

export const ARCH_LOCALES: ArchLocale[] = ['en', 'de', 'pl'];

export const ARCH_LOCALE_LABELS: Record<ArchLocale, string> = {
  en: 'EN',
  de: 'DE',
  pl: 'PL',
};

export const ARCH_LOCALE_NAMES: Record<ArchLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  pl: 'Polski',
};

export function isArchLocale(value: unknown): value is ArchLocale {
  return value === 'en' || value === 'de' || value === 'pl';
}

export type ArchSectionVisibility = {
  drawing: boolean;
  philosophy: boolean;
  services: boolean;
  projects: boolean;
  process: boolean;
  metrics: boolean;
  caseStudy: boolean;
  quote: boolean;
  cta: boolean;
};

export type ArchSeoMeta = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
};

export type ArchPageSettings = {
  visibility: ArchSectionVisibility;
  seo: { [K in ArchLocale]: ArchSeoMeta };
  defaultLocale: ArchLocale;
  publishedLocales: ArchLocale[];
};

export interface Project {
  code: string;
  name: string;
  projectType: string;
  city: string;
  country: string;
  stats: string[];
  description: string;
  order: number;
  status: 'published' | 'draft';
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
}

export interface Service {
  code: string;
  title: string;
  emphasis: string;
  description: string;
  order: number;
}

export interface Inquiry {
  email: string;
  createdAt: Date;
  status: 'pending' | 'contacted';
  source: string;
  locale?: string;
}

export interface ArchPageContent {
  nav: {
    brandSub: string;
    links: Array<{ label: string; href: string }>;
    ctaLabel: string;
  };
  hero: {
    location: string;
    indexLabel: string;
    titleLines: string[];
    lede: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
  };
  drawing: {
    eyebrow: string;
    title: string;
    emphasis: string;
    description: string;
    ctaLabel: string;
    hint: string;
  };
  philosophy: {
    eyebrow: string;
    title: string;
    emphasis: string;
    body: string;
    closing: string;
    caption: string;
    principles: Array<{
      number: string;
      title: string;
      emphasis: string;
      description: string;
    }>;
  };
  services: {
    eyebrow: string;
    label: string;
    title: string;
    emphasis: string;
  };
  projects: {
    eyebrow: string;
    label: string;
    title: string;
    emphasis: string;
  };
  process: {
    eyebrow: string;
    label: string;
    title: string;
    emphasis: string;
    steps: Array<{
      number: string;
      title: string;
      description: string;
    }>;
  };
  metrics: Array<{
    value: string;
    suffix: string;
    label: string;
  }>;
  caseStudy: {
    eyebrow: string;
    label: string;
    title: string;
    titleEmphasis: string;
    heading: string;
    headingEmphasis: string;
    body: string;
    stats: Array<{ value: string; suffix: string; label: string }>;
  };
  quote: {
    eyebrow: string;
    text: string;
    emphasis: string;
    attribution: string;
  };
  cta: {
    title: string;
    emphasis: string;
    description: string;
    emailPlaceholder: string;
    submitLabel: string;
    loadingLabel: string;
    successMessage: string;
    note: string;
  };
  footer: {
    brandName: string;
    address: string;
    tagline: string;
    columns: Array<{
      title: string;
      links: Array<{ label: string; href: string }>;
    }>;
    copyright: string;
  };
}
