export type MilkbarLinkItem = {
  label: string;
  href: string;
};

export type MilkbarFooterColumn = {
  title: string;
  links: MilkbarLinkItem[];
};

export type MilkbarPrinciple = {
  number: string;
  title: string;
  emphasis: string;
  description: string;
};

export type MilkbarProcessStep = {
  number: string;
  title: string;
  description: string;
};

export type MilkbarMetric = {
  value: string;
  suffix: string;
  label: string;
};

export type MilkbarPageContent = {
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
    principles: MilkbarPrinciple[];
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
    steps: MilkbarProcessStep[];
  };
  metrics: MilkbarMetric[];
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
    columns: MilkbarFooterColumn[];
    copyright: string;
  };
};

export type MilkbarProjectCmsRecord = {
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
};

export type MilkbarServiceCmsRecord = {
  code: string;
  title: string;
  description: string;
  order: number;
};

export type MilkbarInquiryCmsRecord = {
  email: string;
  createdAt: string | null;
  status: string;
  source: string;
};

export type MilkbarCmsSourceStatus = {
  local: {
    configured: boolean;
    dbName: string | null;
    uriLabel: string | null;
  };
  cloud: {
    configured: boolean;
    dbName: string | null;
    uriLabel: string | null;
  };
};

export type MilkbarCmsSnapshot = {
  ok: true;
  pageContent: MilkbarPageContent;
  projects: MilkbarProjectCmsRecord[];
  services: MilkbarServiceCmsRecord[];
  inquiries: MilkbarInquiryCmsRecord[];
  sourceStatus: MilkbarCmsSourceStatus;
  counts: {
    projects: number;
    services: number;
    inquiries: number;
  };
  updatedAt: string | null;
};

export type MilkbarCmsUpdateInput = {
  pageContent: MilkbarPageContent;
  projects: MilkbarProjectCmsRecord[];
  services: MilkbarServiceCmsRecord[];
};

export const DEFAULT_MILKBAR_PAGE_CONTENT: MilkbarPageContent = {
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
