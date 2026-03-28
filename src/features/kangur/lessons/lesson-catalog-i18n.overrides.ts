import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';

import { UKRAINIAN_LESSON_COPY_OVERRIDES } from './lesson-catalog-i18n.overrides.uk';

export type LessonCopyOverride = {
  title?: string;
  description?: string;
};

export { UKRAINIAN_LESSON_COPY_OVERRIDES };

export const ENGLISH_LESSON_COPY_OVERRIDES: Partial<
  Record<KangurLessonComponentId, LessonCopyOverride>
> = {
  alphabet_basics: {
    title: 'Trace the letters',
    description: 'Trace letters and practice precise hand movement.',
  },
  alphabet_copy: {
    title: 'Copy the letters',
    description: 'Copy letters under the model and practice smooth handwriting.',
  },
  alphabet_syllables: {
    title: 'Syllables and words',
    description: 'Combine letters into syllables and read your first words.',
  },
  alphabet_words: {
    title: 'First words',
    description: 'Recognize letters at the beginning of simple words.',
  },
  alphabet_matching: {
    title: 'Match the letters',
    description: 'Match uppercase and lowercase letters into pairs.',
  },
  alphabet_sequence: {
    title: 'Letter order',
    description: 'Arrange letters in the correct order.',
  },
  art_colors_harmony: {
    title: 'Harmony of colors',
    description: 'Discover warm and cool colors, then practice choosing colors that look good together.',
  },
  art_shapes_basic: {
    title: 'Basic shapes',
    description: 'Meet circles, squares, triangles, and rectangles, then spot them in everyday objects.',
  },
  music_diatonic_scale: {
    title: 'Diatonic scale',
    description:
      'Learn the seven notes of the diatonic scale, sing them in order, and hear when the melody moves up or down.',
  },
  geometry_shape_recognition: {
    title: 'Geometry',
    description: 'Practice recognizing circles, squares, triangles, rectangles, ovals, and rhombuses.',
  },
  clock: {
    title: 'Clock',
    description: 'Hours, minutes, and full time on an analog clock.',
  },
  calendar: {
    title: 'Calendar',
    description: 'Days, months, dates, and seasons.',
  },
  adding: {
    title: 'Addition',
    description: 'Single-digit, double-digit, and a ball game.',
  },
  subtracting: {
    title: 'Subtraction',
    description: 'Single-digit, double-digit, and remainders.',
  },
  multiplication: {
    title: 'Multiplication',
    description: 'Times tables and multiplication strategies.',
  },
  division: {
    title: 'Division',
    description: 'Basic division and remainders.',
  },
  geometry_basics: {
    title: 'Geometry basics',
    description: 'Points, segments, sides, and angles.',
  },
  geometry_shapes: {
    title: 'Geometric shapes',
    description: 'Learn shapes and draw them in the game.',
  },
  geometry_symmetry: {
    title: 'Symmetry',
    description: 'Lines of symmetry and mirror reflections.',
  },
  geometry_perimeter: {
    title: 'Perimeter',
    description: 'Calculate side lengths step by step.',
  },
  logical_thinking: {
    title: 'Logical thinking',
    description: 'Order, rules, and observation.',
  },
  logical_patterns: {
    title: 'Patterns',
    description: 'Recurring sequences and rhythms.',
  },
  logical_classification: {
    title: 'Classification',
    description: 'Group, sort, and find the odd one out.',
  },
  logical_reasoning: {
    title: 'Reasoning',
    description: 'If... then... think step by step.',
  },
  logical_analogies: {
    title: 'Analogies',
    description: 'Find the same relationship in a new context.',
  },
  english_basics: {
    title: 'English: Basics',
    description: 'Greetings and first sentences.',
  },
  english_parts_of_speech: {
    description: 'Personal and possessive pronouns with maths-themed examples.',
  },
  english_sentence_structure: {
    title: 'English: Sentence structure',
    description: 'Word order, questions, and linking ideas.',
  },
  english_subject_verb_agreement: {
    title: 'English: Subject-verb agreement',
    description: 'Subject-verb agreement in the Present Simple and the most common traps.',
  },
  english_articles: {
    description: 'A, an, the, and the zero article in English.',
  },
  english_adjectives: {
    title: 'English: Adjectives',
    description: 'Describe people, places, and things with adjective order and detail.',
  },
  english_comparatives_superlatives: {
    title: 'English: Comparatives & Superlatives',
    description:
      'Compare two things, choose the top one in a group, and practise tricky forms like better and the best.',
  },
  english_adverbs: {
    title: 'English: Adverbs',
    description: 'Describe how actions happen with adverbs, special forms, and sentence practice.',
  },
  english_adverbs_frequency: {
    title: 'English: Adverbs of Frequency',
    description: 'Always, usually, sometimes, and never in routines and sentence order.',
  },
  english_prepositions_time_place: {
    description: 'Time and place prepositions in practical examples.',
  },
  webdev_react_components: {
    description: 'Learn the basics of components and build interfaces in React 19.2.',
  },
  webdev_react_dom_components: {
    description: 'Learn the basics of React DOM components and working with DOM elements.',
  },
  webdev_react_hooks: {
    description: 'Learn the basics of hooks and build React 19.2 logic.',
  },
  webdev_react_dom_hooks: {
    description: 'Learn React DOM hooks to build better forms and interactions.',
  },
  webdev_react_apis: {
    description: 'Learn the core React APIs and supporting tools.',
  },
  webdev_react_dom_apis: {
    description: 'Learn the core React DOM APIs and how portals work.',
  },
  webdev_react_dom_client_apis: {
    description: 'Learn the React DOM client APIs: createRoot and hydrateRoot.',
  },
  webdev_react_dom_server_apis: {
    description: 'Learn the React DOM APIs for server-side rendering.',
  },
  webdev_react_dom_static_apis: {
    description: 'Learn the React DOM static APIs for generating HTML.',
  },
  webdev_react_compiler_config: {
    description: 'Learn React Compiler configuration and optimization basics.',
  },
  webdev_react_compiler_directives: {
    description: 'Learn compiler directives and how to control them.',
  },
  webdev_react_compiler_libraries: {
    description: 'Learn the libraries and integrations that support the compiler.',
  },
  webdev_react_performance_tracks: {
    description: 'Learn React performance tracks and metrics.',
  },
  webdev_react_lints: {
    description: 'Learn the basic linting rules in React.',
  },
  webdev_react_rules: {
    description: 'Learn the most important React rules and good practices.',
  },
  webdev_react_server_components: {
    description: 'Learn Server Components and the Server/Client split.',
  },
  webdev_react_server_functions: {
    description: 'Learn Server Functions and safe server-side actions.',
  },
  webdev_react_server_directives: {
    description: 'Learn server directives and code boundaries.',
  },
  webdev_react_router: {
    description: 'Learn the basics of routing in React.',
  },
  webdev_react_setup: {
    description: 'Learn the basics of configuring and running React.',
  },
  webdev_react_state_management: {
    description: 'Learn the basics of state management in React.',
  },
  agentic_coding_codex_5_4: {
    description: 'What agentic coding is and how to adopt the right mindset.',
  },
  agentic_coding_codex_5_4_fit: {
    description: 'Where Codex shines and where it requires caution.',
  },
  agentic_coding_codex_5_4_surfaces: {
    description: 'CLI, IDE, Cloud, and API - choosing the right surface.',
  },
  agentic_coding_codex_5_4_operating_model: {
    description: 'Goal/Context/Constraints/Done plus planning, execution, and verification.',
  },
  agentic_coding_codex_5_4_prompting: {
    description: 'Context, planning, and shorter prompts in practice.',
  },
  agentic_coding_codex_5_4_responses: {
    description: 'Responses API, tool calling, and structured outputs in practice.',
  },
  agentic_coding_codex_5_4_agents_md: {
    description: 'Repo rules, commands, and a definition of Done in one place.',
  },
  agentic_coding_codex_5_4_approvals: {
    description: 'Sandboxing, approvals, and network access control.',
  },
  agentic_coding_codex_5_4_safety: {
    description: 'Permissions, approvals, and sandboxing without unnecessary risk.',
  },
  agentic_coding_codex_5_4_config_layers: {
    description: 'Configuration layers, profiles, and project trust.',
  },
  agentic_coding_codex_5_4_rules: {
    description: 'Command allowlists, prefix rules, and policy testing.',
  },
  agentic_coding_codex_5_4_web_citations: {
    description: 'When to search the web and how to cite sources.',
  },
  agentic_coding_codex_5_4_tooling: {
    description: 'Web search, file search, computer use, and tool search.',
  },
  agentic_coding_codex_5_4_response_contract: {
    description: 'Response structure, list formatting, and citation rules.',
  },
  agentic_coding_codex_5_4_ai_documentation: {
    description: 'A single format for hierarchy of concerns, evidence, and rollout.',
  },
  agentic_coding_codex_5_4_delegation: {
    description: 'Sub-agents, parallelism, and scope control.',
  },
  agentic_coding_codex_5_4_models: {
    description: 'Choosing models and reasoning levels for different tasks.',
  },
  agentic_coding_codex_5_4_cli_ide: {
    description: 'Shortcuts, commands, and best practices for working in the terminal and editor.',
  },
  agentic_coding_codex_5_4_app_workflows: {
    description: 'Worktrees, automations, and Git tools inside the app.',
  },
  agentic_coding_codex_5_4_skills: {
    description: 'From manual flows to skills and automation.',
  },
  agentic_coding_codex_5_4_mcp_integrations: {
    description: 'External tools, context, and safe integrations.',
  },
  agentic_coding_codex_5_4_automations: {
    description: 'Cadence, worktrees, and sandboxing for background work.',
  },
  agentic_coding_codex_5_4_state_scale: {
    description: 'Conversation state, background mode, compaction, and prompt caching.',
  },
  agentic_coding_codex_5_4_review: {
    description: 'Tests, diff review, and quality checklists.',
  },
  agentic_coding_codex_5_4_long_horizon: {
    description: 'Specs, milestones, and drift control in long-running tasks.',
  },
  agentic_coding_codex_5_4_dos_donts: {
    description: 'The most important rules for working with an agent.',
  },
  agentic_coding_codex_5_4_non_engineers: {
    description: 'How to delegate without being a full-time developer.',
  },
  agentic_coding_codex_5_4_prompt_patterns: {
    description: 'Prompt templates for bugfixes, refactors, and PR review.',
  },
  agentic_coding_codex_5_4_rollout: {
    description: 'Rolling Codex out gradually across a team.',
  },
};

export const GERMAN_LESSON_COPY_OVERRIDES: Partial<
  Record<KangurLessonComponentId, LessonCopyOverride>
> = {
  alphabet_basics: {
    title: 'Buchstaben nachspuren',
    description: 'Spure Buchstaben nach und uebe praezise Handbewegungen.',
  },
  alphabet_copy: {
    title: 'Buchstaben abschreiben',
    description: 'Schreibe Buchstaben unter der Vorlage ab und uebe fliessendes Schreiben.',
  },
  alphabet_syllables: {
    title: 'Silben und Woerter',
    description: 'Verbinde Buchstaben zu Silben und lies deine ersten Woerter.',
  },
  alphabet_words: {
    title: 'Erste Woerter',
    description: 'Erkenne Buchstaben am Anfang einfacher Woerter.',
  },
  alphabet_matching: {
    title: 'Buchstaben zuordnen',
    description: 'Ordne Gross- und Kleinbuchstaben zu Paaren.',
  },
  alphabet_sequence: {
    title: 'Buchstabenreihenfolge',
    description: 'Ordne Buchstaben in der richtigen Reihenfolge an.',
  },
  art_colors_harmony: {
    title: 'Farbharmonie',
    description: 'Entdecke warme und kuehle Farben und uebe dann, Farben zu waehlen, die gut zusammenpassen.',
  },
  art_shapes_basic: {
    title: 'Grundformen',
    description: 'Lerne Kreise, Quadrate, Dreiecke und Rechtecke kennen und entdecke sie in Alltagsgegenstaenden.',
  },
  music_diatonic_scale: {
    title: 'Diatonische Tonleiter',
    description:
      'Lerne die sieben Toene der diatonischen Tonleiter, singe sie der Reihe nach und hoere, wann die Melodie steigt oder faellt.',
  },
  geometry_shape_recognition: {
    title: 'Geometrie',
    description: 'Uebe, Kreise, Quadrate, Dreiecke, Rechtecke, Ovale und Rauten zu erkennen.',
  },
  clock: {
    title: 'Uhr',
    description: 'Stunden, Minuten und volle Uhrzeit auf einer analogen Uhr.',
  },
  calendar: {
    title: 'Kalender',
    description: 'Tage, Monate, Daten und Jahreszeiten.',
  },
  adding: {
    title: 'Addition',
    description: 'Einstellige, zweistellige Addition und ein Ballspiel.',
  },
  subtracting: {
    title: 'Subtraktion',
    description: 'Einstellige, zweistellige Subtraktion und Reste.',
  },
  multiplication: {
    title: 'Multiplikation',
    description: 'Einmaleins und Strategien zur Multiplikation.',
  },
  division: {
    title: 'Division',
    description: 'Grundlagen der Division und Reste.',
  },
  geometry_basics: {
    title: 'Grundlagen der Geometrie',
    description: 'Punkte, Strecken, Seiten und Winkel.',
  },
  geometry_shapes: {
    title: 'Geometrische Formen',
    description: 'Lerne Formen und zeichne sie im Spiel.',
  },
  geometry_symmetry: {
    title: 'Symmetrie',
    description: 'Symmetrieachsen und Spiegelungen.',
  },
  geometry_perimeter: {
    title: 'Umfang',
    description: 'Berechne Seitenlaengen Schritt fuer Schritt.',
  },
  logical_thinking: {
    title: 'Logisches Denken',
    description: 'Ordnung, Regeln und Beobachtung.',
  },
  logical_patterns: {
    title: 'Muster',
    description: 'Wiederkehrende Folgen und Rhythmen.',
  },
  logical_classification: {
    title: 'Klassifikation',
    description: 'Gruppieren, sortieren und das unpassende Element finden.',
  },
  logical_reasoning: {
    title: 'Schlussfolgern',
    description: 'Wenn... dann... Schritt fuer Schritt denken.',
  },
  logical_analogies: {
    title: 'Analogien',
    description: 'Finde dieselbe Beziehung in einem neuen Kontext.',
  },
  english_basics: {
    title: 'Englisch: Grundlagen',
    description: 'Begruessungen und erste Saetze.',
  },
  english_parts_of_speech: {
    description: 'Personal- und Possessivpronomen mit Mathe-Beispielen.',
  },
  english_sentence_structure: {
    title: 'Englisch: Satzbau',
    description: 'Wortstellung, Fragen und das Verbinden von Ideen.',
  },
  english_subject_verb_agreement: {
    title: 'Englisch: Subjekt-Verb-Kongruenz',
    description: 'Subjekt-Verb-Kongruenz im Present Simple und die haeufigsten Fallen.',
  },
  english_articles: {
    description: 'A, an, the und der Nullartikel im Englischen.',
  },
  english_adjectives: {
    title: 'Englisch: Adjektive',
    description: 'Beschreibe Personen, Orte und Dinge mit Adjektiven und der richtigen Wortstellung.',
  },
  english_adverbs: {
    title: 'Englisch: Adverbien',
    description: 'Beschreibe mit Adverbien, wie Handlungen passieren, und uebe Sonderformen.',
  },
  english_adverbs_frequency: {
    title: 'Englisch: Adverbien der Haeufigkeit',
    description: 'Always, usually, sometimes und never in Routinen und an der richtigen Satzposition.',
  },
  english_prepositions_time_place: {
    description: 'Praepositionen fuer Zeit und Ort in praktischen Beispielen.',
  },
  webdev_react_components: {
    description: 'Lerne die Grundlagen von Komponenten und baue Oberflaechen in React 19.2.',
  },
  webdev_react_dom_components: {
    description: 'Lerne die Grundlagen von React-DOM-Komponenten und der Arbeit mit DOM-Elementen.',
  },
  webdev_react_hooks: {
    description: 'Lerne die Grundlagen von Hooks und baue Logik in React 19.2.',
  },
  webdev_react_dom_hooks: {
    description: 'Lerne React-DOM-Hooks fuer bessere Formulare und Interaktionen.',
  },
  webdev_react_apis: {
    description: 'Lerne die zentralen React-APIs und begleitende Werkzeuge.',
  },
  webdev_react_dom_apis: {
    description: 'Lerne die zentralen React-DOM-APIs und wie Portale funktionieren.',
  },
  webdev_react_dom_client_apis: {
    description: 'Lerne die React-DOM-Client-APIs: createRoot und hydrateRoot.',
  },
  webdev_react_dom_server_apis: {
    description: 'Lerne die React-DOM-APIs fuer serverseitiges Rendern.',
  },
  webdev_react_dom_static_apis: {
    description: 'Lerne die statischen React-DOM-APIs zum Erzeugen von HTML.',
  },
  webdev_react_compiler_config: {
    description: 'Lerne die Konfiguration des React Compilers und Grundlagen der Optimierung.',
  },
  webdev_react_compiler_directives: {
    description: 'Lerne Compiler-Direktiven und wie du sie steuerst.',
  },
  webdev_react_compiler_libraries: {
    description: 'Lerne Bibliotheken und Integrationen kennen, die den Compiler unterstuetzen.',
  },
  webdev_react_performance_tracks: {
    description: 'Lerne Performance-Tracks und Metriken in React.',
  },
  webdev_react_lints: {
    description: 'Lerne die grundlegenden Lint-Regeln in React.',
  },
  webdev_react_rules: {
    description: 'Lerne die wichtigsten React-Regeln und bewaehrte Praktiken.',
  },
  webdev_react_server_components: {
    description: 'Lerne Server Components und die Trennung zwischen Server und Client.',
  },
  webdev_react_server_functions: {
    description: 'Lerne Server Functions und sichere serverseitige Aktionen.',
  },
  webdev_react_server_directives: {
    description: 'Lerne Server-Direktiven und Code-Grenzen.',
  },
  webdev_react_router: {
    description: 'Lerne die Grundlagen von Routing in React.',
  },
  webdev_react_setup: {
    description: 'Lerne die Grundlagen von Konfiguration und Ausfuehrung von React.',
  },
  webdev_react_state_management: {
    description: 'Lerne die Grundlagen des State-Managements in React.',
  },
  agentic_coding_codex_5_4: {
    description: 'Was agentisches Coding ist und wie du die richtige Denkweise entwickelst.',
  },
  agentic_coding_codex_5_4_fit: {
    description: 'Wo Codex glaenzt und wo Vorsicht noetig ist.',
  },
  agentic_coding_codex_5_4_surfaces: {
    description: 'CLI, IDE, Cloud und API - die passende Oberflaeche waehlen.',
  },
  agentic_coding_codex_5_4_operating_model: {
    description: 'Goal/Context/Constraints/Done plus Planung, Ausfuehrung und Verifikation.',
  },
  agentic_coding_codex_5_4_prompting: {
    description: 'Kontext, Planung und kuerzere Prompts in der Praxis.',
  },
  agentic_coding_codex_5_4_responses: {
    description: 'Responses API, Tool-Aufrufe und strukturierte Ausgaben in der Praxis.',
  },
  agentic_coding_codex_5_4_agents_md: {
    description: 'Repo-Regeln, Kommandos und eine Definition of Done an einem Ort.',
  },
  agentic_coding_codex_5_4_approvals: {
    description: 'Sandboxing, Freigaben und Steuerung des Netzwerkzugriffs.',
  },
  agentic_coding_codex_5_4_safety: {
    description: 'Berechtigungen, Freigaben und Sandboxing ohne unnoetiges Risiko.',
  },
  agentic_coding_codex_5_4_config_layers: {
    description: 'Konfigurationsebenen, Profile und Projektvertrauen.',
  },
  agentic_coding_codex_5_4_rules: {
    description: 'Kommando-Allowlist, Prefix-Regeln und Policy-Tests.',
  },
  agentic_coding_codex_5_4_web_citations: {
    description: 'Wann du im Web suchen und wie du Quellen angeben solltest.',
  },
  agentic_coding_codex_5_4_tooling: {
    description: 'Websuche, Dateisuche, Computer Use und Tool Search.',
  },
  agentic_coding_codex_5_4_response_contract: {
    description: 'Antwortstruktur, Listenformatierung und Zitierregeln.',
  },
  agentic_coding_codex_5_4_ai_documentation: {
    description: 'Ein gemeinsames Format fuer Prioritaeten, Evidenz und Rollout.',
  },
  agentic_coding_codex_5_4_delegation: {
    description: 'Sub-Agenten, Parallelitaet und Kontrolle des Scopes.',
  },
  agentic_coding_codex_5_4_models: {
    description: 'Die passenden Modelle und Reasoning-Stufen fuer verschiedene Aufgaben waehlen.',
  },
  agentic_coding_codex_5_4_cli_ide: {
    description: 'Shortcuts, Befehle und Best Practices fuer Terminal und Editor.',
  },
  agentic_coding_codex_5_4_app_workflows: {
    description: 'Worktrees, Automatisierungen und Git-Werkzeuge in der App.',
  },
  agentic_coding_codex_5_4_skills: {
    description: 'Von manuellen Ablaeufen zu Skills und Automatisierung.',
  },
  agentic_coding_codex_5_4_mcp_integrations: {
    description: 'Externe Tools, Kontext und sichere Integrationen.',
  },
  agentic_coding_codex_5_4_automations: {
    description: 'Taktung, Worktrees und Sandboxing fuer Hintergrundarbeit.',
  },
  agentic_coding_codex_5_4_state_scale: {
    description: 'Gespraechszustand, Hintergrundmodus, Kompaktierung und Prompt-Caching.',
  },
  agentic_coding_codex_5_4_review: {
    description: 'Tests, Diff-Review und Qualitaets-Checklisten.',
  },
  agentic_coding_codex_5_4_long_horizon: {
    description: 'Spezifikationen, Meilensteine und Drift-Kontrolle bei langen Aufgaben.',
  },
  agentic_coding_codex_5_4_dos_donts: {
    description: 'Die wichtigsten Regeln fuer die Arbeit mit einem Agenten.',
  },
  agentic_coding_codex_5_4_non_engineers: {
    description: 'Wie du delegierst, ohne Vollzeit-Entwickler zu sein.',
  },
  agentic_coding_codex_5_4_prompt_patterns: {
    description: 'Prompt-Vorlagen fuer Bugfixes, Refactorings und PR-Review.',
  },
  agentic_coding_codex_5_4_rollout: {
    description: 'Codex schrittweise in einem Team ausrollen.',
  },
};

const resolveKangurLessonCatalogLocale = (
  locale: string | null | undefined
): KangurLessonCatalogLocale => {
  const normalizedLocale = normalizeSiteLocale(locale);
  if (
    normalizedLocale === 'pl' ||
    normalizedLocale === 'de' ||
    normalizedLocale === 'uk'
  ) {
    return normalizedLocale;
  }
  return 'en';
};

const getLessonSourceValue = (
  componentId: string,
  field: keyof LessonCopyOverride
): string | null => {
  if (!(componentId in KANGUR_LESSON_LIBRARY)) {
    return null;
  }

  const template = KANGUR_LESSON_LIBRARY[componentId as keyof typeof KANGUR_LESSON_LIBRARY];
  const sourceValue = template?.[field];

  return typeof sourceValue === 'string' ? sourceValue : null;
};

const shouldApplyOverride = (
  componentId: string,
  fallbackValue: string | null | undefined,
  field: keyof LessonCopyOverride
): boolean => {
  const sourceValue = getLessonSourceValue(componentId, field);

  if (typeof sourceValue !== 'string') {
    return false;
  }

  if (typeof fallbackValue !== 'string' || fallbackValue.trim().length === 0) {
    return true;
  }

  return fallbackValue.trim() === sourceValue.trim();
};

const resolveLessonOverride = (
  componentId: string,
  locale: string | null | undefined,
  field: keyof LessonCopyOverride,
  fallbackValue: string | null | undefined
): string => {
  const catalogLocale = resolveKangurLessonCatalogLocale(locale);
  const resolvedFallbackValue =
    typeof fallbackValue === 'string' && fallbackValue.trim().length > 0
      ? fallbackValue
      : getLessonSourceValue(componentId, field) ?? '';

  if (catalogLocale === 'pl') {
    return resolvedFallbackValue;
  }

  if (!shouldApplyOverride(componentId, fallbackValue, field)) {
    return resolvedFallbackValue;
  }

  return (
    (catalogLocale === 'de'
      ? GERMAN_LESSON_COPY_OVERRIDES[componentId as KangurLessonComponentId]?.[field]
      : catalogLocale === 'uk'
        ? UKRAINIAN_LESSON_COPY_OVERRIDES[componentId as KangurLessonComponentId]?.[field]
      : undefined) ??
    ENGLISH_LESSON_COPY_OVERRIDES[componentId as KangurLessonComponentId]?.[field] ??
    resolvedFallbackValue
  );
};
