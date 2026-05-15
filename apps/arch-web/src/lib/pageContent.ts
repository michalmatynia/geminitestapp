import type { ArchLocale, ArchPageContent, ArchPageSettings, ArchSeoMeta } from './types';

export const DEFAULT_ARCH_PAGE_CONTENT: ArchPageContent = {
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
    messagePlaceholder: 'tell us about your practice and what you would like to automate',
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

const DEFAULT_ARCH_PAGE_CONTENT_DE: ArchPageContent = {
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
    lede: 'Ein kleines Studio zwischen Architektur und maschinellem Lernen – es automatisiert das Administrative, damit die Praxis zum durchdachten Entwurf zurückkehren kann.',
    primaryCtaLabel: 'die Praxis entdecken',
    secondaryCtaLabel: 'ausgewählte Projekte',
  },
  drawing: {
    eyebrow: '- 01 / Zeichnung',
    title: 'Jede Linie trägt',
    emphasis: 'Absicht.',
    description: 'Unsere Systeme analysieren architektonische Intentionen aus natürlicher Sprache, bestehenden Zeichnungen und standortbedingten Einschränkungen.',
    ctaLabel: 'wie es funktioniert',
    hint: '- Räume ziehen, um Nutzungen neu zuzuweisen',
    thumbImages: [],
  },
  philosophy: {
    eyebrow: '- 02 / Philosophie',
    title: 'Die Disziplin des',
    emphasis: 'Negativraums.',
    body: 'In der Architektur ist das Mächtigste oft das, was fehlt. Die Leere zwischen Wänden definiert einen Raum. Die Pause zwischen Stützen erzeugt Rhythmus.',
    closing: 'Wir fügen keine Komplexität hinzu. Wir reduzieren sie.',
    caption: 'die produktive Leere',
    principles: [
      { number: 'i.', title: 'Reduzieren, dann verfeinern', emphasis: '- Zurückhaltung als Methode', description: 'Jeden redundanten Prozess entfernen, bevor das Verbleibende optimiert wird.' },
      { number: 'ii.', title: 'Präzision vor Geschwindigkeit', emphasis: '- Genauigkeit ist nicht verhandelbar', description: 'Unsere Modelle werden mit Bauvorschriften aus achtunddreißig Rechtssystemen trainiert.' },
      { number: 'iii.', title: 'Ergänzen, nie ersetzen', emphasis: '- der Architekt bleibt', description: 'Der Blick des Architekten ist unersetzlich.' },
    ],
  },
  services: { eyebrow: '- 03 / Praxis', label: 'vier Systeme', title: 'Was wir leise automatisieren, damit die Praxis fortgeführt werden kann.', emphasis: 'leise automatisieren' },
  projects: { eyebrow: '- 04 / Projekte', label: 'drei jüngste Notizen', title: 'Eine Auswahl realisierter Arbeiten, dargestellt durch die Studiosysteme.', emphasis: 'realisierter Arbeiten' },
  process: {
    eyebrow: '- 05 / Prozess',
    label: 'vier Bewegungen',
    title: 'Wie ein Auftrag sich entfaltet.',
    emphasis: 'entfaltet.',
    steps: [
      { number: 'i.', title: 'Analyse', description: 'Wir erfassen Ihren bestehenden Arbeitsablauf: jeden Berührungspunkt, jedes Werkzeug, jede verschwendete Stunde.' },
      { number: 'ii.', title: 'Konfiguration', description: 'Modelle werden auf Ihre Projekttypologie, Zeichnungskonventionen und die Baurechtsgebiete, in denen Sie tätig sind, trainiert.' },
      { number: 'iii.', title: 'Integration', description: 'Die Systeme verbinden sich mit Revit, AutoCAD, ArchiCAD, Rhino.' },
      { number: 'iv.', title: 'Verfeinerung', description: 'Mit jedem Projektzyklus erlernt das System Ihre Standards.' },
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
    body: 'Ein 32-stöckiges Mischnutzungsprojekt in Zürich erforderte gleichzeitige Konformität mit schweizerischem Bundes-, Kantons- und Gemeinderecht.',
    stats: [
      { value: '6.400', suffix: '', label: 'Zeichnungen geprüft' },
      { value: '3', suffix: 'Std', label: 'Verarbeitungszeit' },
      { value: '0', suffix: '', label: 'verpasste Klauseln' },
      { value: '2,1', suffix: 'Mo', label: 'manuelles Äquivalent' },
    ],
  },
  quote: { eyebrow: '- 07 / Anmerkung', text: 'Das Maß eines großen Gebäudes ist nicht, was es zeigt', emphasis: 'sondern was es weglässt.', attribution: 'Aus den Designprinzipien des Studios / 2024' },
  cta: {
    title: 'Bereit, das Unnötige zu eliminieren?',
    emphasis: 'eliminieren',
    description: 'Die Plätze im Pilotprogramm sind auf zwölf Büros pro Quartal begrenzt.',
    emailPlaceholder: 'Ihre Büro-E-Mail',
    messagePlaceholder: 'erzählen Sie uns von Ihrem Büro',
    submitLabel: 'Anfrage senden',
    loadingLabel: 'wird gesendet…',
    successMessage: 'Eingegangen – wir melden uns innerhalb von fünf Werktagen.',
    note: 'Keine Verpflichtung. Wöchentlich geprüft / Antwort innerhalb von fünf Werktagen.',
  },
  footer: {
    brandName: 'Milk Bar Designers',
    address: 'Herengracht 44\n1017 BS / Amsterdam\nNiederlande',
    tagline: 'Ein kleines Studio, das Software für die Architektur entwirft und Architektur mit Softwareunterstützung gestaltet.',
    columns: [
      { title: 'Praxis', links: [{ label: 'Compliance', href: '#' }, { label: 'Baumasse', href: '#' }, { label: 'Dokumentation', href: '#' }, { label: 'Intelligenz', href: '#' }] },
      { title: 'Studio', links: [{ label: 'Philosophie', href: '#' }, { label: 'Projekte', href: '#' }, { label: 'Forschung', href: '#' }, { label: 'Karriere', href: '#' }] },
      { title: 'Kontakt', links: [{ label: 'hello@milkbar.studio', href: '#' }, { label: 'Amsterdam', href: '#' }, { label: 'London', href: '#' }, { label: 'Zürich', href: '#' }] },
    ],
    copyright: 'MMXXV / Milk Bar Designers B.V.',
  },
};

const DEFAULT_ARCH_PAGE_CONTENT_PL: ArchPageContent = {
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
    lede: 'Małe studio na pograniczu architektury i uczenia maszynowego – automatyzujące administrację, by praktyka mogła powrócić do przemyślanego rysunku.',
    primaryCtaLabel: 'poznaj pracownię',
    secondaryCtaLabel: 'wybrane projekty',
  },
  drawing: {
    eyebrow: '- 01 / rysunek',
    title: 'Każda linia niesie',
    emphasis: 'intencję.',
    description: 'Nasze systemy odczytują architektoniczną intencję z języka naturalnego, istniejących rysunków i uwarunkowań terenu.',
    ctaLabel: 'jak to działa',
    hint: '- przeciągnij pomieszczenia, by przypisać program',
    thumbImages: [],
  },
  philosophy: {
    eyebrow: '- 02 / filozofia',
    title: 'Dyscyplina',
    emphasis: 'pustej przestrzeni.',
    body: 'W architekturze to, czego nie ma, bywa najpotężniejsze. Pustka między ścianami definiuje pomieszczenie. Pauza między kolumnami tworzy rytm.',
    closing: 'Nie dodajemy złożoności. Ją odejmujemy.',
    caption: 'produktywna pustka',
    principles: [
      { number: 'i.', title: 'Redukuj, potem udoskonalaj', emphasis: '- powściągliwość jako metoda', description: 'Usuń każdy zbędny proces, zanim zaczniesz optymalizować to, co pozostało.' },
      { number: 'ii.', title: 'Precyzja ponad szybkość', emphasis: '- dokładność jest niepodlegalna negocjacjom', description: 'Nasze modele są trenowane na przepisach budowlanych z trzydziestu ośmiu jurysdykcji.' },
      { number: 'iii.', title: 'Uzupełniaj, nie zastępuj', emphasis: '- architekt pozostaje', description: 'Spojrzenie architekta jest niezastąpione.' },
    ],
  },
  services: { eyebrow: '- 03 / praktyka', label: 'cztery systemy', title: 'Co cicho automatyzujemy, by praktyka mogła trwać.', emphasis: 'cicho automatyzujemy' },
  projects: { eyebrow: '- 04 / projekty', label: 'trzy z ostatnich', title: 'Wybór zrealizowanych prac przedstawionych przez systemy studia.', emphasis: 'zrealizowanych prac' },
  process: {
    eyebrow: '- 05 / proces',
    label: 'cztery ruchy',
    title: 'Jak przebiega nasza współpraca.',
    emphasis: 'przebiega.',
    steps: [
      { number: 'i.', title: 'Audyt', description: 'Mapujemy Twój obecny przepływ pracy: każdy punkt styku, każde narzędzie, każdą straconą godzinę.' },
      { number: 'ii.', title: 'Konfiguracja', description: 'Modele są trenowane na typologii Twoich projektów, konwencjach rysunkowych i jurysdykcjach, w których budujesz.' },
      { number: 'iii.', title: 'Integracja', description: 'Systemy łączą się z Revit, AutoCAD, ArchiCAD, Rhino.' },
      { number: 'iv.', title: 'Doskonalenie', description: 'Z każdym cyklem projektowym system przyswaja Twoje standardy.' },
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
    body: 'Trzydziestodwupiętrowy budynek wielofunkcyjny w Zurychu wymagał jednoczesnej zgodności z federalnym, kantonalnym i miejskim prawem budowlanym.',
    stats: [
      { value: '6 400', suffix: '', label: 'rysunków skontrolowanych' },
      { value: '3', suffix: 'godz', label: 'czas przetwarzania' },
      { value: '0', suffix: '', label: 'przeoczonych klauzul' },
      { value: '2,1', suffix: 'mies', label: 'ekwiwalent manualny' },
    ],
  },
  quote: { eyebrow: '- 07 / nota', text: 'Miarą wielkiego budynku nie jest to, co pokazuje', emphasis: 'lecz to, co eliminuje.', attribution: 'Z zasad projektowych studia / 2024' },
  cta: {
    title: 'Gotowy wyeliminować zbędne?',
    emphasis: 'wyeliminować',
    description: 'Miejsca w programie pilotażowym są ograniczone do dwunastu pracowni na kwartał.',
    emailPlaceholder: 'adres e-mail pracowni',
    messagePlaceholder: 'opowiedz nam o swojej pracowni',
    submitLabel: 'wyślij zapytanie',
    loadingLabel: 'wysyłanie…',
    successMessage: 'Otrzymano – odpiszemy w ciągu pięciu dni roboczych.',
    note: 'Bez zobowiązań. Rozpatrywane co tydzień / odpowiedź w ciągu pięciu dni roboczych.',
  },
  footer: {
    brandName: 'Milk Bar Designers',
    address: 'Herengracht 44\n1017 BS / Amsterdam\nHolandia',
    tagline: 'Małe studio projektujące oprogramowanie dla architektury i architekturę z pomocą oprogramowania.',
    columns: [
      { title: 'Praktyka', links: [{ label: 'Zgodność', href: '#' }, { label: 'Bryła', href: '#' }, { label: 'Dokumentacja', href: '#' }, { label: 'Inteligencja', href: '#' }] },
      { title: 'Studio', links: [{ label: 'Filozofia', href: '#' }, { label: 'Projekty', href: '#' }, { label: 'Badania', href: '#' }, { label: 'Kariera', href: '#' }] },
      { title: 'Kontakt', links: [{ label: 'hello@milkbar.studio', href: '#' }, { label: 'Amsterdam', href: '#' }, { label: 'Londyn', href: '#' }, { label: 'Zurych', href: '#' }] },
    ],
    copyright: 'MMXXV / Milk Bar Designers B.V.',
  },
};

export const DEFAULT_ARCH_LOCALIZED_CONTENT: Record<ArchLocale, ArchPageContent> = {
  en: DEFAULT_ARCH_PAGE_CONTENT,
  de: DEFAULT_ARCH_PAGE_CONTENT_DE,
  pl: DEFAULT_ARCH_PAGE_CONTENT_PL,
};

export const DEFAULT_ARCH_PAGE_SETTINGS: ArchPageSettings = {
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
        'Ein kleines Studio zwischen Architektur und maschinellem Lernen – automatisiert das Administrative, damit die Praxis zum durchdachten Entwurf zurückkehren kann.',
      ogTitle: 'Milk Bar Designers',
      ogDescription: 'Architektur gezeichnet mit stiller Intelligenz.',
    },
    pl: {
      title: 'Milk Bar Designers — Pracownia architektury i AI',
      description:
        'Małe studio na pograniczu architektury i uczenia maszynowego – automatyzuje administrację, by praktyka mogła powrócić do przemyślanego rysunku.',
      ogTitle: 'Milk Bar Designers',
      ogDescription: 'Architektura rysowana z cichą inteligencją.',
    },
  },
  defaultLocale: 'en',
  publishedLocales: ['en', 'de', 'pl'],
};

// ─── Normalize helpers ────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AnyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const next = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
  return next.length > 0 ? next : fallback;
};

function normalizePrinciples(
  value: unknown,
  fallback: ArchPageContent['philosophy']['principles']
): ArchPageContent['philosophy']['principles'] {
  if (!Array.isArray(value)) return fallback;
  const result = value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((p) => ({
      number: asString(p['number'], ''),
      title: asString(p['title'], ''),
      emphasis: asString(p['emphasis'], ''),
      description: asString(p['description'], ''),
    }));
  return result.length > 0 ? result : fallback;
}

function normalizeProcessSteps(
  value: unknown,
  fallback: ArchPageContent['process']['steps']
): ArchPageContent['process']['steps'] {
  if (!Array.isArray(value)) return fallback;
  const result = value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((s) => ({
      number: asString(s['number'], ''),
      title: asString(s['title'], ''),
      description: asString(s['description'], ''),
    }));
  return result.length > 0 ? result : fallback;
}

function normalizeMetrics(
  value: unknown,
  fallback: ArchPageContent['metrics']
): ArchPageContent['metrics'] {
  if (!Array.isArray(value)) return fallback;
  const result = value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((m) => ({
      value: asString(m['value'], ''),
      suffix: asString(m['suffix'], ''),
      label: asString(m['label'], ''),
    }));
  return result.length > 0 ? result : fallback;
}

function normalizeCaseStudyStats(
  value: unknown,
  fallback: ArchPageContent['caseStudy']['stats']
): ArchPageContent['caseStudy']['stats'] {
  if (!Array.isArray(value)) return fallback;
  const result = value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((s) => ({
      value: asString(s['value'], ''),
      suffix: asString(s['suffix'], ''),
      label: asString(s['label'], ''),
    }));
  return result.length > 0 ? result : fallback;
}

function normalizeNavLinks(
  value: unknown,
  fallback: ArchPageContent['nav']['links']
): ArchPageContent['nav']['links'] {
  if (!Array.isArray(value)) return fallback;
  const result = value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((l) => ({
      label: asString(l['label'], ''),
      href: asString(l['href'], '#'),
    }))
    .filter((l) => l.label.length > 0);
  return result.length > 0 ? result : fallback;
}

function normalizeFooterColumns(
  value: unknown,
  fallback: ArchPageContent['footer']['columns']
): ArchPageContent['footer']['columns'] {
  if (!Array.isArray(value)) return fallback;
  const result = value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((col) => ({
      title: asString(col['title'], ''),
      links: Array.isArray(col['links'])
        ? (col['links'] as unknown[])
            .filter((l): l is Record<string, unknown> => isRecord(l))
            .map((link) => ({
              label: asString(link['label'], ''),
              href: asString(link['href'], '#'),
            }))
        : [],
    }));
  return result.length > 0 ? result : fallback;
}

export function normalizeArchPageContent(input: unknown): ArchPageContent {
  const source = isRecord(input) ? input : {};
  const nav = isRecord(source['nav']) ? source['nav'] : {};
  const hero = isRecord(source['hero']) ? source['hero'] : {};
  const drawing = isRecord(source['drawing']) ? source['drawing'] : {};
  const philosophy = isRecord(source['philosophy']) ? source['philosophy'] : {};
  const services = isRecord(source['services']) ? source['services'] : {};
  const projects = isRecord(source['projects']) ? source['projects'] : {};
  const process = isRecord(source['process']) ? source['process'] : {};
  const caseStudy = isRecord(source['caseStudy']) ? source['caseStudy'] : {};
  const quote = isRecord(source['quote']) ? source['quote'] : {};
  const cta = isRecord(source['cta']) ? source['cta'] : {};
  const footer = isRecord(source['footer']) ? source['footer'] : {};
  const d = DEFAULT_ARCH_PAGE_CONTENT;

  return {
    nav: {
      brandSub: asString(nav['brandSub'], d.nav.brandSub),
      links: normalizeNavLinks(nav['links'], d.nav.links),
      ctaLabel: asString(nav['ctaLabel'], d.nav.ctaLabel),
    },
    hero: {
      location: asString(hero['location'], d.hero.location),
      indexLabel: asString(hero['indexLabel'], d.hero.indexLabel),
      titleLines: asStringArray(hero['titleLines'], d.hero.titleLines),
      lede: asString(hero['lede'], d.hero.lede),
      primaryCtaLabel: asString(hero['primaryCtaLabel'], d.hero.primaryCtaLabel),
      secondaryCtaLabel: asString(hero['secondaryCtaLabel'], d.hero.secondaryCtaLabel),
    },
    drawing: {
      eyebrow: asString(drawing['eyebrow'], d.drawing.eyebrow),
      title: asString(drawing['title'], d.drawing.title),
      emphasis: asString(drawing['emphasis'], d.drawing.emphasis),
      description: asString(drawing['description'], d.drawing.description),
      ctaLabel: asString(drawing['ctaLabel'], d.drawing.ctaLabel),
      hint: asString(drawing['hint'], d.drawing.hint),
      thumbImages: asStringArray(drawing['thumbImages'], d.drawing.thumbImages),
    },
    philosophy: {
      eyebrow: asString(philosophy['eyebrow'], d.philosophy.eyebrow),
      title: asString(philosophy['title'], d.philosophy.title),
      emphasis: asString(philosophy['emphasis'], d.philosophy.emphasis),
      body: asString(philosophy['body'], d.philosophy.body),
      closing: asString(philosophy['closing'], d.philosophy.closing),
      caption: asString(philosophy['caption'], d.philosophy.caption),
      principles: normalizePrinciples(philosophy['principles'], d.philosophy.principles),
    },
    services: {
      eyebrow: asString(services['eyebrow'], d.services.eyebrow),
      label: asString(services['label'], d.services.label),
      title: asString(services['title'], d.services.title),
      emphasis: asString(services['emphasis'], d.services.emphasis),
    },
    projects: {
      eyebrow: asString(projects['eyebrow'], d.projects.eyebrow),
      label: asString(projects['label'], d.projects.label),
      title: asString(projects['title'], d.projects.title),
      emphasis: asString(projects['emphasis'], d.projects.emphasis),
    },
    process: {
      eyebrow: asString(process['eyebrow'], d.process.eyebrow),
      label: asString(process['label'], d.process.label),
      title: asString(process['title'], d.process.title),
      emphasis: asString(process['emphasis'], d.process.emphasis),
      steps: normalizeProcessSteps(process['steps'], d.process.steps),
    },
    metrics: normalizeMetrics(source['metrics'], d.metrics),
    caseStudy: {
      eyebrow: asString(caseStudy['eyebrow'], d.caseStudy.eyebrow),
      label: asString(caseStudy['label'], d.caseStudy.label),
      title: asString(caseStudy['title'], d.caseStudy.title),
      titleEmphasis: asString(caseStudy['titleEmphasis'], d.caseStudy.titleEmphasis),
      heading: asString(caseStudy['heading'], d.caseStudy.heading),
      headingEmphasis: asString(caseStudy['headingEmphasis'], d.caseStudy.headingEmphasis),
      body: asString(caseStudy['body'], d.caseStudy.body),
      stats: normalizeCaseStudyStats(caseStudy['stats'], d.caseStudy.stats),
    },
    quote: {
      eyebrow: asString(quote['eyebrow'], d.quote.eyebrow),
      text: asString(quote['text'], d.quote.text),
      emphasis: asString(quote['emphasis'], d.quote.emphasis),
      attribution: asString(quote['attribution'], d.quote.attribution),
    },
    cta: {
      title: asString(cta['title'], d.cta.title),
      emphasis: asString(cta['emphasis'], d.cta.emphasis),
      description: asString(cta['description'], d.cta.description),
      emailPlaceholder: asString(cta['emailPlaceholder'], d.cta.emailPlaceholder),
      messagePlaceholder: asString(cta['messagePlaceholder'], d.cta.messagePlaceholder),
      submitLabel: asString(cta['submitLabel'], d.cta.submitLabel),
      loadingLabel: asString(cta['loadingLabel'], d.cta.loadingLabel),
      successMessage: asString(cta['successMessage'], d.cta.successMessage),
      note: asString(cta['note'], d.cta.note),
    },
    footer: {
      brandName: asString(footer['brandName'], d.footer.brandName),
      address: asString(footer['address'], d.footer.address),
      tagline: asString(footer['tagline'], d.footer.tagline),
      columns: normalizeFooterColumns(footer['columns'], d.footer.columns),
      copyright: asString(footer['copyright'], d.footer.copyright),
    },
  };
}

function normalizeSeoMeta(input: unknown, fallback: ArchSeoMeta): ArchSeoMeta {
  const r = isRecord(input) ? input : {};
  return {
    title: asString(r['title'], fallback.title),
    description: asString(r['description'], fallback.description),
    ogTitle: asString(r['ogTitle'], fallback.ogTitle),
    ogDescription: asString(r['ogDescription'], fallback.ogDescription),
  };
}

function normalizeArchPageSettings(input: unknown): ArchPageSettings {
  const r = isRecord(input) ? input : {};
  const vis = isRecord(r['visibility']) ? r['visibility'] : {};
  const seoRaw = isRecord(r['seo']) ? r['seo'] : {};
  const d = DEFAULT_ARCH_PAGE_SETTINGS;

  const defaultLocaleRaw = r['defaultLocale'];
  const defaultLocale: ArchLocale =
    defaultLocaleRaw === 'en' || defaultLocaleRaw === 'de' || defaultLocaleRaw === 'pl'
      ? defaultLocaleRaw
      : d.defaultLocale;

  const publishedRaw = Array.isArray(r['publishedLocales']) ? r['publishedLocales'] : null;
  const publishedLocales: ArchLocale[] = publishedRaw
    ? (publishedRaw.filter((l) => l === 'en' || l === 'de' || l === 'pl') as ArchLocale[])
    : d.publishedLocales;

  return {
    visibility: {
      drawing: asBoolean(vis['drawing'], d.visibility.drawing),
      philosophy: asBoolean(vis['philosophy'], d.visibility.philosophy),
      services: asBoolean(vis['services'], d.visibility.services),
      projects: asBoolean(vis['projects'], d.visibility.projects),
      process: asBoolean(vis['process'], d.visibility.process),
      metrics: asBoolean(vis['metrics'], d.visibility.metrics),
      caseStudy: asBoolean(vis['caseStudy'], d.visibility.caseStudy),
      quote: asBoolean(vis['quote'], d.visibility.quote),
      cta: asBoolean(vis['cta'], d.visibility.cta),
    },
    seo: {
      en: normalizeSeoMeta(seoRaw['en'], d.seo.en),
      de: normalizeSeoMeta(seoRaw['de'], d.seo.de),
      pl: normalizeSeoMeta(seoRaw['pl'], d.seo.pl),
    },
    defaultLocale,
    publishedLocales: publishedLocales.length > 0 ? publishedLocales : d.publishedLocales,
  };
}

// ─── Localized page data ──────────────────────────────────────────────────────

export type ArchPageData = {
  pageContent: ArchPageContent;
  pageSettings: ArchPageSettings;
};

type PageContentDoc = {
  localizedContent?: unknown;
  pageSettings?: unknown;
};

export function resolveLocalizedContent(
  doc: PageContentDoc | null,
  locale: ArchLocale
): ArchPageData {
  const localeDefault = DEFAULT_ARCH_LOCALIZED_CONTENT[locale];

  if (doc === null || !isRecord(doc.localizedContent)) {
    return {
      pageContent: localeDefault,
      pageSettings: DEFAULT_ARCH_PAGE_SETTINGS,
    };
  }

  const localized = doc.localizedContent as Record<string, unknown>;
  const raw = localized[locale] ?? localeDefault;
  return {
    pageContent: normalizeArchPageContent(raw),
    pageSettings: normalizeArchPageSettings(doc.pageSettings),
  };
}
