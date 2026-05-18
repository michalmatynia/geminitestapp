/* eslint-disable max-lines */

export type MilkbarLocale = 'en' | 'de' | 'pl';

export const MILKBAR_LOCALES: MilkbarLocale[] = ['en', 'de', 'pl'];

export const MILKBAR_LOCALE_LABELS: Record<MilkbarLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  pl: 'Polski',
};

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
  nav: {
    brandSub: string;
    links: MilkbarLinkItem[];
    ctaLabel: string;
  };
  hero: {
    location: string;
    indexLabel: string;
    titleLines: string[];
    lede: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    modelAssetId?: string | undefined;
    modelUrl?: string | undefined;
  };
  drawing: {
    eyebrow: string;
    title: string;
    emphasis: string;
    description: string;
    ctaLabel: string;
    hint: string;
    thumbImages: string[];
    asset3dSlots: string[];
    asset3dSlotUrls?: string[] | undefined;
    interiorModelAssetId?: string | undefined;
    interiorModelUrl?: string | undefined;
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
  caseStudy: {
    eyebrow: string;
    label: string;
    title: string;
    titleEmphasis: string;
    heading: string;
    headingEmphasis: string;
    body: string;
    stats: MilkbarMetric[];
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
    columns: MilkbarFooterColumn[];
    copyright: string;
  };
};

export type MilkbarLocalizedContent = {
  [K in MilkbarLocale]: MilkbarPageContent;
};

export type MilkbarSectionVisibility = {
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

export type MilkbarSeoMeta = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
};

export type MilkbarPageSettings = {
  visibility: MilkbarSectionVisibility;
  seo: { [K in MilkbarLocale]: MilkbarSeoMeta };
  defaultLocale: MilkbarLocale;
  publishedLocales: MilkbarLocale[];
  contactEmail: string;
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
  modelAssetId?: string | undefined;
  modelUrl?: string | undefined;
};

export type MilkbarServiceCmsRecord = {
  code: string;
  title: string;
  emphasis: string;
  description: string;
  order: number;
};

export type MilkbarInquiryCmsRecord = {
  email: string;
  createdAt: string | null;
  status: string;
  source: string;
  locale?: string;
};

export type MilkbarCmsSourceStatus = {
  sourceOfTruth: MilkbarMongoSourceStatus;
  runtimeLocal: MilkbarMongoSourceStatus;
  runtimeCloud: MilkbarMongoSourceStatus;
};

export type MilkbarMongoSourceStatus = {
  configured: boolean;
  dbName: string | null;
  uriLabel: string | null;
};

export type MilkbarCmsSnapshot = {
  ok: true;
  localizedContent: MilkbarLocalizedContent;
  pageSettings: MilkbarPageSettings;
  projects: MilkbarProjectCmsRecord[];
  services: MilkbarServiceCmsRecord[];
  inquiries: MilkbarInquiryCmsRecord[];
  sourceStatus: MilkbarCmsSourceStatus;
  counts: {
    sourceOfTruth: {
      projects: number;
      services: number;
    };
    runtimeLocal: {
      projects: number;
      services: number;
      inquiries: number;
    };
  };
  contentSource: 'sourceOfTruth' | 'runtimeFallback';
  updatedAt: string | null;
};

export type MilkbarCmsUpdateInput = {
  localizedContent: MilkbarLocalizedContent;
  pageSettings: MilkbarPageSettings;
  projects: MilkbarProjectCmsRecord[];
  services: MilkbarServiceCmsRecord[];
};

// ─── English defaults ───────────────────────────────────────────────────────

export const DEFAULT_MILKBAR_PAGE_CONTENT: MilkbarPageContent = {
  nav: {
    brandSub: '/ est. Amsterdam',
    links: [
      { label: 'practice', href: '#practice' },
      { label: 'projects', href: '#projects' },
      { label: 'process', href: '#process' },
      { label: 'studio', href: '#studio' },
    ],
    ctaLabel: 'enquire',
  },
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
    thumbImages: [],
    asset3dSlots: [],
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
  caseStudy: {
    eyebrow: '— 06 / case study',
    label: 'helios tower',
    title: 'Compliance',
    titleEmphasis: 'at scale.',
    heading: 'Six thousand drawings',
    headingEmphasis: 'verified in three hours.',
    body: 'A thirty-two-storey mixed-use development in Zurich required simultaneous compliance with Swiss federal, cantonal, and municipal building codes — three concurrent regulatory frames.',
    stats: [
      { value: '6,400', suffix: '', label: 'drawings audited' },
      { value: '3', suffix: 'hrs', label: 'processing time' },
      { value: '0', suffix: '', label: 'missed clauses' },
      { value: '2.1', suffix: 'mo', label: 'manual equivalent' },
    ],
  },
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
    successMessage: 'received - we will be in touch within five working days.',
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

// ─── German defaults ─────────────────────────────────────────────────────────

const DEFAULT_MILKBAR_PAGE_CONTENT_DE: MilkbarPageContent = {
  nav: {
    brandSub: '/ gegr. Amsterdam',
    links: [
      { label: 'Praxis', href: '#practice' },
      { label: 'Projekte', href: '#projects' },
      { label: 'Prozess', href: '#process' },
      { label: 'Studio', href: '#studio' },
    ],
    ctaLabel: 'Anfragen',
  },
  hero: {
    location: 'Amsterdam / London / Zürich',
    indexLabel: 'Index - MMXXV',
    titleLines: ['Architektur gezeichnet', 'mit stiller', 'Intelligenz.'],
    lede:
      'Ein kleines Studio zwischen Architektur und maschinellem Lernen – es automatisiert das Administrative, damit die Praxis zum durchdachten Entwurf zurückkehren kann.',
    primaryCtaLabel: 'die Praxis entdecken',
    secondaryCtaLabel: 'ausgewählte Projekte',
  },
  drawing: {
    eyebrow: '- 01 / Zeichnung',
    title: 'Jede Linie trägt',
    emphasis: 'Absicht.',
    description:
      'Unsere Systeme analysieren architektonische Intentionen aus natürlicher Sprache, bestehenden Zeichnungen und standortbedingten Einschränkungen. Sie erzeugen Dokumentation, die ein prüfender Architekt unverändert akzeptieren würde.',
    ctaLabel: 'wie es funktioniert',
    hint: '- Räume ziehen, um Nutzungen neu zuzuweisen',
    thumbImages: [],
    asset3dSlots: [],
  },
  philosophy: {
    eyebrow: '- 02 / Philosophie',
    title: 'Die Disziplin des',
    emphasis: 'Negativraums.',
    body:
      'In der Architektur ist das Mächtigste oft das, was fehlt. Die Leere zwischen Wänden definiert einen Raum. Die Pause zwischen Stützen erzeugt Rhythmus. Unsere Software messen wir an denselben Maßstäben.',
    closing: 'Wir fügen keine Komplexität hinzu. Wir reduzieren sie.',
    caption: 'die produktive Leere',
    principles: [
      {
        number: 'i.',
        title: 'Reduzieren, dann verfeinern',
        emphasis: '- Zurückhaltung als Methode',
        description:
          'Jeden redundanten Prozess entfernen, bevor das Verbleibende optimiert wird. Komplexität ist nie eine Lösung; sie ist ein Symptom.',
      },
      {
        number: 'ii.',
        title: 'Präzision vor Geschwindigkeit',
        emphasis: '- Genauigkeit ist nicht verhandelbar',
        description:
          'Unsere Modelle werden mit Bauvorschriften aus achtunddreißig Rechtssystemen trainiert. Ergebnisse werden vor dem Verlassen des Studios gegen den Kanon geprüft.',
      },
      {
        number: 'iii.',
        title: 'Ergänzen, nie ersetzen',
        emphasis: '- der Architekt bleibt',
        description:
          'Der Blick des Architekten ist unersetzlich. Wir automatisieren das Administrative, damit Kreativität ohne regulatorische Last wirken kann.',
      },
    ],
  },
  services: {
    eyebrow: '- 03 / Praxis',
    label: 'vier Systeme',
    title: 'Was wir leise automatisieren, damit die Praxis fortgeführt werden kann.',
    emphasis: 'leise automatisieren',
  },
  projects: {
    eyebrow: '- 04 / Projekte',
    label: 'drei jüngste Notizen',
    title: 'Eine Auswahl realisierter Arbeiten, dargestellt durch die Studiosysteme.',
    emphasis: 'realisierter Arbeiten',
  },
  process: {
    eyebrow: '- 05 / Prozess',
    label: 'vier Bewegungen',
    title: 'Wie ein Auftrag sich entfaltet.',
    emphasis: 'entfaltet.',
    steps: [
      {
        number: 'i.',
        title: 'Analyse',
        description:
          'Wir erfassen Ihren bestehenden Arbeitsablauf: jeden Berührungspunkt, jedes Werkzeug, jede verschwendete Stunde. Das Bild ist meist erhellend.',
      },
      {
        number: 'ii.',
        title: 'Konfiguration',
        description:
          'Modelle werden auf Ihre Projekttypologie, Zeichnungskonventionen und die Baurechtsgebiete, in denen Sie tätig sind, trainiert.',
      },
      {
        number: 'iii.',
        title: 'Integration',
        description:
          'Die Systeme verbinden sich mit Revit, AutoCAD, ArchiCAD, Rhino. Kein Eingriff in den Arbeitsablauf; neue Fähigkeit entsteht an Ort und Stelle.',
      },
      {
        number: 'iv.',
        title: 'Verfeinerung',
        description:
          'Mit jedem Projektzyklus erlernt das System Ihre Standards. Die Qualität steigt still, kontinuierlich und ohne Aufwand.',
      },
    ],
  },
  metrics: [
    { value: '340', suffix: '+', label: 'Projekte durch Studiosysteme verarbeitet' },
    { value: '72', suffix: '%', label: 'Mittlere Reduktion der Dokumentationszeit' },
    { value: '98', suffix: '.4%', label: 'Genauigkeitsrate bei Konformitätsprüfungen' },
    { value: '38', suffix: '', label: 'Aktive Baurechtsmodelle' },
  ],
  caseStudy: {
    eyebrow: '— 06 / Fallstudie',
    label: 'helios tower',
    title: 'Compliance',
    titleEmphasis: 'im Maßstab.',
    heading: 'Sechstausend Zeichnungen',
    headingEmphasis: 'verifiziert in drei Stunden.',
    body: 'Ein 32-stöckiges Mischnutzungsprojekt in Zürich erforderte gleichzeitige Konformität mit schweizerischem Bundes-, Kantons- und Gemeinderecht — drei simultane Regulierungsrahmen.',
    stats: [
      { value: '6.400', suffix: '', label: 'Zeichnungen geprüft' },
      { value: '3', suffix: 'Std', label: 'Verarbeitungszeit' },
      { value: '0', suffix: '', label: 'verpasste Klauseln' },
      { value: '2,1', suffix: 'Mo', label: 'manuelles Äquivalent' },
    ],
  },
  quote: {
    eyebrow: '- 07 / Anmerkung',
    text: 'Das Maß eines großen Gebäudes ist nicht, was es zeigt',
    emphasis: 'sondern was es weglässt.',
    attribution: 'Aus den Designprinzipien des Studios / 2024',
  },
  cta: {
    title: 'Bereit, das Unnötige zu eliminieren?',
    emphasis: 'eliminieren',
    description:
      'Die Plätze im Pilotprogramm sind auf zwölf Büros pro Quartal begrenzt. Anfragen werden wöchentlich geprüft.',
    emailPlaceholder: 'Ihre Büro-E-Mail',
    submitLabel: 'Anfrage senden',
    loadingLabel: 'wird gesendet…',
    successMessage: 'Eingegangen – wir melden uns innerhalb von fünf Werktagen.',
    note: 'Keine Verpflichtung. Wöchentlich geprüft / Antwort innerhalb von fünf Werktagen.',
  },
  footer: {
    brandName: 'Milk Bar Designers',
    address: 'Herengracht 44\n1017 BS / Amsterdam\nNiederlande',
    tagline:
      'Ein kleines Studio, das Software für die Architektur entwirft und Architektur mit Softwareunterstützung gestaltet.',
    columns: [
      {
        title: 'Praxis',
        links: [
          { label: 'Compliance', href: '#' },
          { label: 'Baumasse', href: '#' },
          { label: 'Dokumentation', href: '#' },
          { label: 'Intelligenz', href: '#' },
        ],
      },
      {
        title: 'Studio',
        links: [
          { label: 'Philosophie', href: '#' },
          { label: 'Projekte', href: '#' },
          { label: 'Forschung', href: '#' },
          { label: 'Karriere', href: '#' },
        ],
      },
      {
        title: 'Kontakt',
        links: [
          { label: 'hello@milkbar.studio', href: '#' },
          { label: 'Amsterdam', href: '#' },
          { label: 'London', href: '#' },
          { label: 'Zürich', href: '#' },
        ],
      },
    ],
    copyright: 'MMXXV / Milk Bar Designers B.V.',
  },
};

// ─── Polish defaults ──────────────────────────────────────────────────────────

const DEFAULT_MILKBAR_PAGE_CONTENT_PL: MilkbarPageContent = {
  nav: {
    brandSub: '/ zał. Amsterdam',
    links: [
      { label: 'Praktyka', href: '#practice' },
      { label: 'Projekty', href: '#projects' },
      { label: 'Proces', href: '#process' },
      { label: 'Studio', href: '#studio' },
    ],
    ctaLabel: 'Zapytaj',
  },
  hero: {
    location: 'Amsterdam / Londyn / Zurych',
    indexLabel: 'Indeks - MMXXV',
    titleLines: ['Architektura rysowana', 'z cichą', 'inteligencją.'],
    lede:
      'Małe studio na pograniczu architektury i uczenia maszynowego – automatyzujące administrację, by praktyka mogła powrócić do przemyślanego rysunku.',
    primaryCtaLabel: 'poznaj pracownię',
    secondaryCtaLabel: 'wybrane projekty',
  },
  drawing: {
    eyebrow: '- 01 / rysunek',
    title: 'Każda linia niesie',
    emphasis: 'intencję.',
    description:
      'Nasze systemy odczytują architektoniczną intencję z języka naturalnego, istniejących rysunków i uwarunkowań terenu. Tworzą dokumentację, którą architekt weryfikujący przyjąłby bez poprawek.',
    ctaLabel: 'jak to działa',
    hint: '- przeciągnij pomieszczenia, by przypisać program',
    thumbImages: [],
    asset3dSlots: [],
  },
  philosophy: {
    eyebrow: '- 02 / filozofia',
    title: 'Dyscyplina',
    emphasis: 'pustej przestrzeni.',
    body:
      'W architekturze to, czego nie ma, bywa najpotężniejsze. Pustka między ścianami definiuje pomieszczenie. Pauza między kolumnami tworzy rytm. Tym samym standardom poddajemy nasze oprogramowanie.',
    closing: 'Nie dodajemy złożoności. Ją odejmujemy.',
    caption: 'produktywna pustka',
    principles: [
      {
        number: 'i.',
        title: 'Redukuj, potem udoskonalaj',
        emphasis: '- powściągliwość jako metoda',
        description:
          'Usuń każdy zbędny proces, zanim zaczniesz optymalizować to, co pozostało. Złożoność nigdy nie jest rozwiązaniem; jest objawem.',
      },
      {
        number: 'ii.',
        title: 'Precyzja ponad szybkość',
        emphasis: '- dokładność jest niepodlegalna negocjacjom',
        description:
          'Nasze modele są trenowane na przepisach budowlanych z trzydziestu ośmiu jurysdykcji. Wyniki są weryfikowane względem kanonu przed opuszczeniem studia.',
      },
      {
        number: 'iii.',
        title: 'Uzupełniaj, nie zastępuj',
        emphasis: '- architekt pozostaje',
        description:
          'Spojrzenie architekta jest niezastąpione. Automatyzujemy administrację, by kreatywność działała swobodnie, bez regulacyjnych ograniczeń.',
      },
    ],
  },
  services: {
    eyebrow: '- 03 / praktyka',
    label: 'cztery systemy',
    title: 'Co cicho automatyzujemy, by praktyka mogła trwać.',
    emphasis: 'cicho automatyzujemy',
  },
  projects: {
    eyebrow: '- 04 / projekty',
    label: 'trzy z ostatnich',
    title: 'Wybór zrealizowanych prac przedstawionych przez systemy studia.',
    emphasis: 'zrealizowanych prac',
  },
  process: {
    eyebrow: '- 05 / proces',
    label: 'cztery ruchy',
    title: 'Jak przebiega nasza współpraca.',
    emphasis: 'przebiega.',
    steps: [
      {
        number: 'i.',
        title: 'Audyt',
        description:
          'Mapujemy Twój obecny przepływ pracy: każdy punkt styku, każde narzędzie, każdą straconą godzinę. Obraz bywa zaskakująco klarowny.',
      },
      {
        number: 'ii.',
        title: 'Konfiguracja',
        description:
          'Modele są trenowane na typologii Twoich projektów, konwencjach rysunkowych i jurysdykcjach, w których budujesz.',
      },
      {
        number: 'iii.',
        title: 'Integracja',
        description:
          'Systemy łączą się z Revit, AutoCAD, ArchiCAD, Rhino. Żadnych zakłóceń w pracy; nowa możliwość pojawia się na swoim miejscu.',
      },
      {
        number: 'iv.',
        title: 'Doskonalenie',
        description:
          'Z każdym cyklem projektowym system przyswaja Twoje standardy. Jakość rośnie cicho, nieprzerwanie i bez fanfar.',
      },
    ],
  },
  metrics: [
    { value: '340', suffix: '+', label: 'Projektów przetworzonych przez systemy studia' },
    { value: '72', suffix: '%', label: 'Mediana redukcji czasu dokumentacji' },
    { value: '98', suffix: '.4%', label: 'Wskaźnik dokładności kontroli zgodności' },
    { value: '38', suffix: '', label: 'Aktywnych modeli regulacji jurysdykcyjnych' },
  ],
  caseStudy: {
    eyebrow: '— 06 / studium przypadku',
    label: 'helios tower',
    title: 'Zgodność',
    titleEmphasis: 'na skalę.',
    heading: 'Sześć tysięcy rysunków',
    headingEmphasis: 'zweryfikowanych w trzy godziny.',
    body: 'Trzydziestodwupiętrowy budynek wielofunkcyjny w Zurychu wymagał jednoczesnej zgodności z federalnym, kantonalnym i miejskim prawem budowlanym — trzy równoległe ramy regulacyjne.',
    stats: [
      { value: '6 400', suffix: '', label: 'rysunków skontrolowanych' },
      { value: '3', suffix: 'godz', label: 'czas przetwarzania' },
      { value: '0', suffix: '', label: 'przeoczonych klauzul' },
      { value: '2,1', suffix: 'mies', label: 'ekwiwalent manualny' },
    ],
  },
  quote: {
    eyebrow: '- 07 / nota',
    text: 'Miarą wielkiego budynku nie jest to, co pokazuje',
    emphasis: 'lecz to, co eliminuje.',
    attribution: 'Z zasad projektowych studia / 2024',
  },
  cta: {
    title: 'Gotowy wyeliminować zbędne?',
    emphasis: 'wyeliminować',
    description:
      'Miejsca w programie pilotażowym są ograniczone do dwunastu pracowni na kwartał. Zapytania rozpatrujemy co tydzień.',
    emailPlaceholder: 'adres e-mail pracowni',
    submitLabel: 'wyślij zapytanie',
    loadingLabel: 'wysyłanie…',
    successMessage: 'Otrzymano – odpiszemy w ciągu pięciu dni roboczych.',
    note: 'Bez zobowiązań. Rozpatrywane co tydzień / odpowiedź w ciągu pięciu dni roboczych.',
  },
  footer: {
    brandName: 'Milk Bar Designers',
    address: 'Herengracht 44\n1017 BS / Amsterdam\nHolandia',
    tagline:
      'Małe studio projektujące oprogramowanie dla architektury i architekturę z pomocą oprogramowania.',
    columns: [
      {
        title: 'Praktyka',
        links: [
          { label: 'Zgodność', href: '#' },
          { label: 'Bryła', href: '#' },
          { label: 'Dokumentacja', href: '#' },
          { label: 'Inteligencja', href: '#' },
        ],
      },
      {
        title: 'Studio',
        links: [
          { label: 'Filozofia', href: '#' },
          { label: 'Projekty', href: '#' },
          { label: 'Badania', href: '#' },
          { label: 'Kariera', href: '#' },
        ],
      },
      {
        title: 'Kontakt',
        links: [
          { label: 'hello@milkbar.studio', href: '#' },
          { label: 'Amsterdam', href: '#' },
          { label: 'Londyn', href: '#' },
          { label: 'Zurych', href: '#' },
        ],
      },
    ],
    copyright: 'MMXXV / Milk Bar Designers B.V.',
  },
};

// ─── Composed defaults ────────────────────────────────────────────────────────

export const DEFAULT_MILKBAR_LOCALIZED_CONTENT: MilkbarLocalizedContent = {
  en: DEFAULT_MILKBAR_PAGE_CONTENT,
  de: DEFAULT_MILKBAR_PAGE_CONTENT_DE,
  pl: DEFAULT_MILKBAR_PAGE_CONTENT_PL,
};

export const DEFAULT_MILKBAR_PAGE_SETTINGS: MilkbarPageSettings = {
  visibility: {
    drawing: true,
    philosophy: true,
    services: true,
    projects: true,
    process: true,
    metrics: true,
    caseStudy: true,
    quote: true,
    cta: true,
  },
  seo: {
    en: {
      title: 'Milk Bar Designers — Architecture & AI Studio',
      description:
        'A small studio working between architecture and machine learning, automating the administrative so practice returns to the considered drawing.',
      ogTitle: 'Milk Bar Designers',
      ogDescription: 'Architecture drawn with quiet intelligence.',
    },
    de: {
      title: 'Milk Bar Designers — Architektur & KI-Studio',
      description:
        'Ein kleines Studio zwischen Architektur und maschinellem Lernen – es automatisiert das Administrative, damit die Praxis zum durchdachten Entwurf zurückkehren kann.',
      ogTitle: 'Milk Bar Designers',
      ogDescription: 'Architektur gezeichnet mit stiller Intelligenz.',
    },
    pl: {
      title: 'Milk Bar Designers — Pracownia architektury i AI',
      description:
        'Małe studio na pograniczu architektury i uczenia maszynowego – automatyzujące administrację, by praktyka mogła powrócić do przemyślanego rysunku.',
      ogTitle: 'Milk Bar Designers',
      ogDescription: 'Architektura rysowana z cichą inteligencją.',
    },
  },
  defaultLocale: 'en',
  publishedLocales: ['en'],
  contactEmail: 'hello@milkbar.studio',
};

export const DEFAULT_MILKBAR_PROJECTS: MilkbarProjectCmsRecord[] = [
  {
    code: 'MBD-001',
    name: 'Helios Tower',
    projectType: 'Mixed-Use Tower',
    city: 'Zurich',
    country: 'CH',
    stats: ['32 Floors - 42,000 m2', 'Mixed-Use - Zurich, CH'],
    description:
      'A mixed-use tower study coordinating envelope rhythm, compliance checking, and vertical programme stacking.',
    order: 0,
    status: 'published',
    cameraPosition: { x: 22, y: 18, z: 22 },
    cameraTarget: { x: 0, y: 8, z: 0 },
  },
  {
    code: 'MBD-002',
    name: 'Kulturhaus',
    projectType: 'Cultural Centre',
    city: 'Amsterdam',
    country: 'NL',
    stats: ['3 Volumes - 4,200 m2', 'Cultural - Amsterdam, NL'],
    description:
      'A civic cultural centre arranged as interlocking volumes with tracked public flows and programme adjacency.',
    order: 1,
    status: 'published',
    cameraPosition: { x: 20, y: 12, z: 20 },
    cameraTarget: { x: 0, y: 5, z: 0 },
  },
  {
    code: 'MBD-003',
    name: 'South Quarter',
    projectType: 'Residential Ensemble',
    city: 'Berlin',
    country: 'DE',
    stats: ['3 Volumes - 8,600 m2', 'Residential - Berlin, DE'],
    description:
      'A residential ensemble balancing courtyard massing, daylight access, and repeatable documentation logic.',
    order: 2,
    status: 'published',
    cameraPosition: { x: 18, y: 15, z: 18 },
    cameraTarget: { x: 0, y: 6, z: 0 },
  },
];

export const DEFAULT_MILKBAR_SERVICES: MilkbarServiceCmsRecord[] = [
  {
    code: 'S-01',
    title: 'Code compliance',
    emphasis: 'compliance',
    description:
      'Planning rules, building regulations, access standards, and project constraints are checked before drawings leave review.',
    order: 0,
  },
  {
    code: 'S-02',
    title: 'Brief to massing',
    emphasis: 'massing',
    description:
      'Natural language briefs become tested spatial options with area schedules, circulation logic, and daylight constraints attached.',
    order: 1,
  },
  {
    code: 'S-03',
    title: 'Drawing documentation',
    emphasis: 'documentation',
    description:
      'Plans, elevations, and schedules are coordinated against studio standards so issue sets stay consistent.',
    order: 2,
  },
  {
    code: 'S-04',
    title: 'Practice intelligence',
    emphasis: 'intelligence',
    description:
      'Project data becomes searchable memory, linking precedents, decisions, risks, and consultant responses.',
    order: 3,
  },
];
