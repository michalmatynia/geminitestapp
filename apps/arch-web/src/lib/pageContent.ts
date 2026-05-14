import type { ArchPageContent } from './types';

export const DEFAULT_ARCH_PAGE_CONTENT: ArchPageContent = {
  hero: {
    location: 'Amsterdam / London / Zurich',
    indexLabel: 'Index - MMXXV',
    titleLines: ['Architecture drawn', 'with quiet', 'intelligence.'],
    lede:
      'A small studio working between architecture and machine learning, automating the administrative so practice returns to the considered drawing.',
    primaryCtaLabel: 'see the practice',
    secondaryCtaLabel: 'selected projects',
  },
  drawing: {
    eyebrow: '- 01 / drawing',
    title: 'Every line carries',
    emphasis: 'intent.',
    description:
      'Our systems parse architectural intent from natural language, existing drawings, and site constraint. They produce documentation a peer-reviewing architect would accept without amendment.',
    ctaLabel: 'how it works',
    hint: '- drag rooms to reassign programme',
  },
  philosophy: {
    eyebrow: '- 02 / philosophy',
    title: 'The discipline of',
    emphasis: 'negative space.',
    body:
      'In architecture, the most powerful element is often what is absent. The void between walls defines a room. The pause between columns creates rhythm. We hold our software to the same standard.',
    closing: 'We do not add complexity. We subtract it.',
    caption: 'the productive void',
    principles: [
      {
        number: 'i.',
        title: 'Reduce, then refine',
        emphasis: '- restraint as method',
        description:
          'Remove every redundant process before optimising what remains. Complexity is never a solution; it is a symptom.',
      },
      {
        number: 'ii.',
        title: 'Precision over speed',
        emphasis: '- accuracy is non-negotiable',
        description:
          'Our models are trained on building codes across thirty-eight jurisdictions. Output is verified against the canon before it leaves the studio.',
      },
      {
        number: 'iii.',
        title: 'Augment, never replace',
        emphasis: '- the architect remains',
        description:
          'The architect eye is irreplaceable. We automate the administrative so creativity operates unencumbered by the regulatory.',
      },
    ],
  },
  services: {
    eyebrow: '- 03 / practice',
    label: 'four systems',
    title: 'What we quietly automate, so practice can resume.',
    emphasis: 'quietly automate',
  },
  projects: {
    eyebrow: '- 04 / projects',
    label: 'three of recent note',
    title: 'A selection of built work rendered through the studio systems.',
    emphasis: 'built work',
  },
  process: {
    eyebrow: '- 05 / process',
    label: 'four movements',
    title: 'How an engagement unfolds.',
    emphasis: 'unfolds.',
    steps: [
      {
        number: 'i.',
        title: 'Audit',
        description:
          'We map your existing workflow: every touchpoint, every tool, every wasted hour. The picture is usually clarifying.',
      },
      {
        number: 'ii.',
        title: 'Configure',
        description:
          'Models are trained on your project typology, drawing conventions, and the jurisdictions in which you build.',
      },
      {
        number: 'iii.',
        title: 'Integrate',
        description:
          'The systems plug into Revit, AutoCAD, ArchiCAD, Rhino. No workflow disruption; new capability appears in place.',
      },
      {
        number: 'iv.',
        title: 'Refine',
        description:
          'With each project cycle the system learns your standards. Output improves quietly, continuously, and without ceremony.',
      },
    ],
  },
  metrics: [
    { value: '340', suffix: '+', label: 'Projects processed through studio systems' },
    { value: '72', suffix: '%', label: 'Median reduction in documentation hours' },
    { value: '98', suffix: '.4%', label: 'Compliance check accuracy rate' },
    { value: '38', suffix: '', label: 'Active jurisdictional regulation models' },
  ],
  quote: {
    eyebrow: '- 07 / note',
    text: 'The measure of a great building is not what it shows',
    emphasis: 'but what it eliminates.',
    attribution: 'From the studio design principles / 2024',
  },
  cta: {
    title: 'Ready to eliminate the unnecessary?',
    emphasis: 'eliminate',
    description:
      'Pilot programme places are limited to twelve practices per quarter. Enquiries are reviewed weekly.',
    emailPlaceholder: 'your practice email',
    submitLabel: 'send enquiry',
    loadingLabel: 'sending...',
    successMessage: "received - we'll be in touch within five working days.",
    note: 'No obligation. Reviewed weekly / response within five working days.',
  },
  footer: {
    brandName: 'Milk Bar Designers',
    address: 'Herengracht 44\n1017 BS / Amsterdam\nThe Netherlands',
    tagline:
      'A small studio designing software for architecture, and architecture with the help of software.',
    columns: [
      {
        title: 'Practice',
        links: [
          { label: 'Compliance', href: '#' },
          { label: 'Massing', href: '#' },
          { label: 'Documentation', href: '#' },
          { label: 'Intelligence', href: '#' },
        ],
      },
      {
        title: 'Studio',
        links: [
          { label: 'Philosophy', href: '#' },
          { label: 'Projects', href: '#' },
          { label: 'Research', href: '#' },
          { label: 'Careers', href: '#' },
        ],
      },
      {
        title: 'Contact',
        links: [
          { label: 'hello@milkbar.studio', href: '#' },
          { label: 'Amsterdam', href: '#' },
          { label: 'London', href: '#' },
          { label: 'Zurich', href: '#' },
        ],
      },
    ],
    copyright: 'MMXXV / Milk Bar Designers B.V.',
  },
};

type AnyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AnyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const asStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const next = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
  return next.length > 0 ? next : fallback;
};

export function normalizeArchPageContent(input: unknown): ArchPageContent {
  const source = isRecord(input) ? input : {};
  const hero = isRecord(source.hero) ? source.hero : {};
  const drawing = isRecord(source.drawing) ? source.drawing : {};
  const philosophy = isRecord(source.philosophy) ? source.philosophy : {};
  const services = isRecord(source.services) ? source.services : {};
  const projects = isRecord(source.projects) ? source.projects : {};
  const process = isRecord(source.process) ? source.process : {};
  const quote = isRecord(source.quote) ? source.quote : {};
  const cta = isRecord(source.cta) ? source.cta : {};
  const footer = isRecord(source.footer) ? source.footer : {};

  return {
    ...DEFAULT_ARCH_PAGE_CONTENT,
    hero: {
      ...DEFAULT_ARCH_PAGE_CONTENT.hero,
      location: asString(hero.location, DEFAULT_ARCH_PAGE_CONTENT.hero.location),
      indexLabel: asString(hero.indexLabel, DEFAULT_ARCH_PAGE_CONTENT.hero.indexLabel),
      titleLines: asStringArray(hero.titleLines, DEFAULT_ARCH_PAGE_CONTENT.hero.titleLines),
      lede: asString(hero.lede, DEFAULT_ARCH_PAGE_CONTENT.hero.lede),
      primaryCtaLabel: asString(
        hero.primaryCtaLabel,
        DEFAULT_ARCH_PAGE_CONTENT.hero.primaryCtaLabel
      ),
      secondaryCtaLabel: asString(
        hero.secondaryCtaLabel,
        DEFAULT_ARCH_PAGE_CONTENT.hero.secondaryCtaLabel
      ),
    },
    drawing: {
      ...DEFAULT_ARCH_PAGE_CONTENT.drawing,
      eyebrow: asString(drawing.eyebrow, DEFAULT_ARCH_PAGE_CONTENT.drawing.eyebrow),
      title: asString(drawing.title, DEFAULT_ARCH_PAGE_CONTENT.drawing.title),
      emphasis: asString(drawing.emphasis, DEFAULT_ARCH_PAGE_CONTENT.drawing.emphasis),
      description: asString(drawing.description, DEFAULT_ARCH_PAGE_CONTENT.drawing.description),
      ctaLabel: asString(drawing.ctaLabel, DEFAULT_ARCH_PAGE_CONTENT.drawing.ctaLabel),
      hint: asString(drawing.hint, DEFAULT_ARCH_PAGE_CONTENT.drawing.hint),
    },
    philosophy: {
      ...DEFAULT_ARCH_PAGE_CONTENT.philosophy,
      eyebrow: asString(philosophy.eyebrow, DEFAULT_ARCH_PAGE_CONTENT.philosophy.eyebrow),
      title: asString(philosophy.title, DEFAULT_ARCH_PAGE_CONTENT.philosophy.title),
      emphasis: asString(philosophy.emphasis, DEFAULT_ARCH_PAGE_CONTENT.philosophy.emphasis),
      body: asString(philosophy.body, DEFAULT_ARCH_PAGE_CONTENT.philosophy.body),
      closing: asString(philosophy.closing, DEFAULT_ARCH_PAGE_CONTENT.philosophy.closing),
      caption: asString(philosophy.caption, DEFAULT_ARCH_PAGE_CONTENT.philosophy.caption),
      principles: Array.isArray(philosophy.principles)
        ? (philosophy.principles as ArchPageContent['philosophy']['principles'])
        : DEFAULT_ARCH_PAGE_CONTENT.philosophy.principles,
    },
    services: {
      ...DEFAULT_ARCH_PAGE_CONTENT.services,
      eyebrow: asString(services.eyebrow, DEFAULT_ARCH_PAGE_CONTENT.services.eyebrow),
      label: asString(services.label, DEFAULT_ARCH_PAGE_CONTENT.services.label),
      title: asString(services.title, DEFAULT_ARCH_PAGE_CONTENT.services.title),
      emphasis: asString(services.emphasis, DEFAULT_ARCH_PAGE_CONTENT.services.emphasis),
    },
    projects: {
      ...DEFAULT_ARCH_PAGE_CONTENT.projects,
      eyebrow: asString(projects.eyebrow, DEFAULT_ARCH_PAGE_CONTENT.projects.eyebrow),
      label: asString(projects.label, DEFAULT_ARCH_PAGE_CONTENT.projects.label),
      title: asString(projects.title, DEFAULT_ARCH_PAGE_CONTENT.projects.title),
      emphasis: asString(projects.emphasis, DEFAULT_ARCH_PAGE_CONTENT.projects.emphasis),
    },
    process: {
      ...DEFAULT_ARCH_PAGE_CONTENT.process,
      eyebrow: asString(process.eyebrow, DEFAULT_ARCH_PAGE_CONTENT.process.eyebrow),
      label: asString(process.label, DEFAULT_ARCH_PAGE_CONTENT.process.label),
      title: asString(process.title, DEFAULT_ARCH_PAGE_CONTENT.process.title),
      emphasis: asString(process.emphasis, DEFAULT_ARCH_PAGE_CONTENT.process.emphasis),
      steps: Array.isArray(process.steps)
        ? (process.steps as ArchPageContent['process']['steps'])
        : DEFAULT_ARCH_PAGE_CONTENT.process.steps,
    },
    metrics: Array.isArray(source.metrics)
      ? (source.metrics as ArchPageContent['metrics'])
      : DEFAULT_ARCH_PAGE_CONTENT.metrics,
    quote: {
      ...DEFAULT_ARCH_PAGE_CONTENT.quote,
      eyebrow: asString(quote.eyebrow, DEFAULT_ARCH_PAGE_CONTENT.quote.eyebrow),
      text: asString(quote.text, DEFAULT_ARCH_PAGE_CONTENT.quote.text),
      emphasis: asString(quote.emphasis, DEFAULT_ARCH_PAGE_CONTENT.quote.emphasis),
      attribution: asString(quote.attribution, DEFAULT_ARCH_PAGE_CONTENT.quote.attribution),
    },
    cta: {
      ...DEFAULT_ARCH_PAGE_CONTENT.cta,
      title: asString(cta.title, DEFAULT_ARCH_PAGE_CONTENT.cta.title),
      emphasis: asString(cta.emphasis, DEFAULT_ARCH_PAGE_CONTENT.cta.emphasis),
      description: asString(cta.description, DEFAULT_ARCH_PAGE_CONTENT.cta.description),
      emailPlaceholder: asString(
        cta.emailPlaceholder,
        DEFAULT_ARCH_PAGE_CONTENT.cta.emailPlaceholder
      ),
      submitLabel: asString(cta.submitLabel, DEFAULT_ARCH_PAGE_CONTENT.cta.submitLabel),
      loadingLabel: asString(cta.loadingLabel, DEFAULT_ARCH_PAGE_CONTENT.cta.loadingLabel),
      successMessage: asString(cta.successMessage, DEFAULT_ARCH_PAGE_CONTENT.cta.successMessage),
      note: asString(cta.note, DEFAULT_ARCH_PAGE_CONTENT.cta.note),
    },
    footer: {
      ...DEFAULT_ARCH_PAGE_CONTENT.footer,
      brandName: asString(footer.brandName, DEFAULT_ARCH_PAGE_CONTENT.footer.brandName),
      address: asString(footer.address, DEFAULT_ARCH_PAGE_CONTENT.footer.address),
      tagline: asString(footer.tagline, DEFAULT_ARCH_PAGE_CONTENT.footer.tagline),
      columns: Array.isArray(footer.columns)
        ? (footer.columns as ArchPageContent['footer']['columns'])
        : DEFAULT_ARCH_PAGE_CONTENT.footer.columns,
      copyright: asString(footer.copyright, DEFAULT_ARCH_PAGE_CONTENT.footer.copyright),
    },
  };
}
