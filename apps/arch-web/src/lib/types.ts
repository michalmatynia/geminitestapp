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
  cameraTarget:   { x: number; y: number; z: number };
}

export interface Service {
  code: string;
  title: string;
  description: string;
  order: number;
}

export interface Inquiry {
  email: string;
  createdAt: Date;
  status: 'pending' | 'contacted';
  source: string;
}

export interface ArchPageContent {
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
