import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';

const SORT_GAP = 1000;

// ---------------------------------------------------------------------------
// Alphabet sections (six_year_old)
// ---------------------------------------------------------------------------

const ALPHABET_SECTIONS: KangurLessonSection[] = [
  {
    id: 'alphabet_rysuj_litery',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Rysuj Litery',
    typeLabel: 'Gra',
    emoji: '✍️',
    sortOrder: 1 * SORT_GAP,
    enabled: true,
    componentIds: ['alphabet_basics', 'alphabet_copy'],
    subsections: [],
  },
  {
    id: 'alphabet_syllables',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Sylaby i słowa',
    typeLabel: 'Lekcja',
    emoji: '🔤',
    sortOrder: 2 * SORT_GAP,
    enabled: true,
    componentIds: ['alphabet_syllables'],
    subsections: [],
  },
  {
    id: 'alphabet_first_words',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Pierwsze słowa',
    typeLabel: 'Gra',
    emoji: '📖',
    sortOrder: 3 * SORT_GAP,
    enabled: true,
    componentIds: ['alphabet_words'],
    subsections: [],
  },
  {
    id: 'alphabet_matching',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Dopasuj litery',
    typeLabel: 'Gra',
    emoji: '🔗',
    sortOrder: 4 * SORT_GAP,
    enabled: true,
    componentIds: ['alphabet_matching'],
    subsections: [],
  },
  {
    id: 'alphabet_sequence',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Kolejność liter',
    typeLabel: 'Gra',
    emoji: '🔢',
    sortOrder: 5 * SORT_GAP,
    enabled: true,
    componentIds: ['alphabet_sequence'],
    subsections: [],
  },
];

// ---------------------------------------------------------------------------
// Art sections (six_year_old)
// ---------------------------------------------------------------------------

const ART_SECTIONS: KangurLessonSection[] = [
  {
    id: 'art_colors',
    subject: 'art',
    ageGroup: 'six_year_old',
    label: 'Colors',
    typeLabel: 'Section',
    emoji: '🎨',
    sortOrder: 1 * SORT_GAP,
    enabled: true,
    componentIds: [],
    subsections: [
      {
        id: 'art_colors_harmony',
        label: 'Harmony of colors',
        typeLabel: 'Subsection',
        sortOrder: 1 * SORT_GAP,
        enabled: true,
        componentIds: ['art_colors_harmony'],
      },
    ],
  },
  {
    id: 'art_shapes',
    subject: 'art',
    ageGroup: 'six_year_old',
    label: 'Shapes',
    typeLabel: 'Section',
    emoji: '🧩',
    sortOrder: 2 * SORT_GAP,
    enabled: true,
    componentIds: [],
    subsections: [
      {
        id: 'art_shapes_basic',
        label: 'Basic shapes',
        typeLabel: 'Subsection',
        sortOrder: 1 * SORT_GAP,
        enabled: true,
        componentIds: ['art_shapes_basic'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Music sections (six_year_old)
// ---------------------------------------------------------------------------

const MUSIC_SECTIONS: KangurLessonSection[] = [
  {
    id: 'music_scale',
    subject: 'music',
    ageGroup: 'six_year_old',
    label: 'Skala',
    typeLabel: 'Section',
    emoji: '🎵',
    sortOrder: 1 * SORT_GAP,
    enabled: true,
    componentIds: [],
    subsections: [
      {
        id: 'music_diatonic_scale',
        label: 'Skala diatoniczna',
        typeLabel: 'Subsection',
        sortOrder: 1 * SORT_GAP,
        enabled: true,
        componentIds: ['music_diatonic_scale'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Geometry sections (six_year_old)
// ---------------------------------------------------------------------------

const GEOMETRY_SECTIONS: KangurLessonSection[] = [
  {
    id: 'geometry_shapes',
    subject: 'geometry',
    ageGroup: 'six_year_old',
    label: 'Figury geometryczne',
    typeLabel: 'Section',
    emoji: '🔷',
    sortOrder: 1 * SORT_GAP,
    enabled: true,
    componentIds: ['geometry_shape_recognition'],
    subsections: [],
  },
];

// ---------------------------------------------------------------------------
// Maths sections (ten_year_old)
// ---------------------------------------------------------------------------

const MATHS_SECTIONS: KangurLessonSection[] = [
  {
    id: 'maths_time',
    subject: 'maths',
    ageGroup: 'ten_year_old',
    label: 'Czas',
    typeLabel: 'Section',
    emoji: '🕐',
    sortOrder: 1 * SORT_GAP,
    enabled: true,
    componentIds: ['clock', 'calendar'],
    subsections: [],
  },
  {
    id: 'maths_arithmetic',
    subject: 'maths',
    ageGroup: 'ten_year_old',
    label: 'Arytmetyka',
    typeLabel: 'Section',
    emoji: '➕',
    sortOrder: 2 * SORT_GAP,
    enabled: true,
    componentIds: ['adding', 'subtracting', 'multiplication', 'division'],
    subsections: [],
  },
  {
    id: 'maths_geometry',
    subject: 'maths',
    ageGroup: 'ten_year_old',
    label: 'Geometria',
    typeLabel: 'Section',
    emoji: '📐',
    sortOrder: 3 * SORT_GAP,
    enabled: true,
    componentIds: ['geometry_basics', 'geometry_shapes', 'geometry_symmetry', 'geometry_perimeter'],
    subsections: [],
  },
  {
    id: 'maths_logic',
    subject: 'maths',
    ageGroup: 'ten_year_old',
    label: 'Logiczne myślenie',
    typeLabel: 'Section',
    emoji: '🧠',
    sortOrder: 4 * SORT_GAP,
    enabled: true,
    componentIds: [
      'logical_thinking',
      'logical_patterns',
      'logical_classification',
      'logical_reasoning',
      'logical_analogies',
    ],
    subsections: [],
  },
];

// ---------------------------------------------------------------------------
// English sections (ten_year_old)
// ---------------------------------------------------------------------------

const ENGLISH_SECTIONS: KangurLessonSection[] = [
  {
    id: 'english_basics_section',
    subject: 'english',
    ageGroup: 'ten_year_old',
    label: 'Podstawy',
    typeLabel: 'Section',
    emoji: '👋',
    sortOrder: 1 * SORT_GAP,
    enabled: true,
    componentIds: ['english_basics'],
    subsections: [],
  },
  {
    id: 'english_grammar',
    subject: 'english',
    ageGroup: 'ten_year_old',
    label: 'Gramatyka',
    typeLabel: 'Section',
    emoji: '📝',
    sortOrder: 2 * SORT_GAP,
    enabled: true,
    componentIds: [],
    subsections: [
      {
        id: 'english_grammar_pronouns',
        label: 'Pronouns',
        typeLabel: 'Subsection',
        sortOrder: 1 * SORT_GAP,
        enabled: true,
        componentIds: ['english_parts_of_speech'],
      },
      {
        id: 'english_grammar_sentence_structure',
        label: 'Sentence structure',
        typeLabel: 'Subsection',
        sortOrder: 2 * SORT_GAP,
        enabled: true,
        componentIds: ['english_sentence_structure'],
      },
      {
        id: 'english_grammar_subject_verb_agreement',
        label: 'Subject-verb agreement',
        typeLabel: 'Subsection',
        sortOrder: 3 * SORT_GAP,
        enabled: true,
        componentIds: ['english_subject_verb_agreement'],
      },
      {
        id: 'english_grammar_articles',
        label: 'Articles',
        typeLabel: 'Subsection',
        sortOrder: 4 * SORT_GAP,
        enabled: true,
        componentIds: ['english_articles'],
      },
      {
        id: 'english_grammar_adjectives',
        label: 'Adjectives',
        typeLabel: 'Subsection',
        sortOrder: 5 * SORT_GAP,
        enabled: true,
        componentIds: ['english_adjectives'],
      },
      {
        id: 'english_grammar_comparatives_superlatives',
        label: 'Comparatives & Superlatives',
        typeLabel: 'Subsection',
        sortOrder: 6 * SORT_GAP,
        enabled: true,
        componentIds: ['english_comparatives_superlatives'],
      },
      {
        id: 'english_grammar_adverbs',
        label: 'Adverbs',
        typeLabel: 'Subsection',
        sortOrder: 7 * SORT_GAP,
        enabled: true,
        componentIds: ['english_adverbs'],
      },
      {
        id: 'english_grammar_adverbs_frequency',
        label: 'Adverbs of Frequency',
        typeLabel: 'Subsection',
        sortOrder: 8 * SORT_GAP,
        enabled: true,
        componentIds: ['english_adverbs_frequency'],
      },
      {
        id: 'english_grammar_prepositions',
        label: 'Prepositions',
        typeLabel: 'Subsection',
        sortOrder: 9 * SORT_GAP,
        enabled: true,
        componentIds: ['english_prepositions_time_place'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Web Development sections (grown_ups)
// ---------------------------------------------------------------------------

const WEB_DEVELOPMENT_SECTIONS: KangurLessonSection[] = [
  {
    id: 'webdev_react',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'React 19.2',
    typeLabel: 'Section',
    emoji: '⚛️',
    sortOrder: 1 * SORT_GAP,
    enabled: true,
    componentIds: [],
    subsections: [
      {
        id: 'webdev_component',
        label: 'Components',
        typeLabel: 'Subsection',
        sortOrder: 1 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_components'],
      },
      {
        id: 'webdev_components_react_dom',
        label: 'Components: React Dom',
        typeLabel: 'Subsection',
        sortOrder: 2 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_dom_components'],
      },
      {
        id: 'webdev_hooks',
        label: 'Hooks',
        typeLabel: 'Subsection',
        sortOrder: 3 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_hooks'],
      },
      {
        id: 'webdev_hooks_react_dom',
        label: 'Hooks: React Dom',
        typeLabel: 'Subsection',
        sortOrder: 4 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_dom_hooks'],
      },
      {
        id: 'webdev_apis',
        label: 'APIs',
        typeLabel: 'Subsection',
        sortOrder: 5 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_apis'],
      },
      {
        id: 'webdev_apis_react_dom',
        label: 'APIs: React Dom',
        typeLabel: 'Subsection',
        sortOrder: 6 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_dom_apis'],
      },
      {
        id: 'webdev_client_apis_react_dom',
        label: 'Client APIs: React Dom',
        typeLabel: 'Subsection',
        sortOrder: 7 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_dom_client_apis'],
      },
      {
        id: 'webdev_server_apis_react_dom',
        label: 'Server APIs: React Dom',
        typeLabel: 'Subsection',
        sortOrder: 8 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_dom_server_apis'],
      },
      {
        id: 'webdev_static_apis_react_dom',
        label: 'Static APIs: React Dom',
        typeLabel: 'Subsection',
        sortOrder: 9 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_dom_static_apis'],
      },
      {
        id: 'webdev_react_compiler_configuration',
        label: 'React Compiler Configuration',
        typeLabel: 'Subsection',
        sortOrder: 10 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_compiler_config'],
      },
      {
        id: 'webdev_react_compiler_directives',
        label: 'React Compiler Directives',
        typeLabel: 'Subsection',
        sortOrder: 11 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_compiler_directives'],
      },
      {
        id: 'webdev_react_compiler_libraries',
        label: 'React Compiler Libraries',
        typeLabel: 'Subsection',
        sortOrder: 12 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_compiler_libraries'],
      },
      {
        id: 'webdev_performance_tracks',
        label: 'Performance Tracks',
        typeLabel: 'Subsection',
        sortOrder: 13 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_performance_tracks'],
      },
      {
        id: 'webdev_lints',
        label: 'Lints',
        typeLabel: 'Subsection',
        sortOrder: 14 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_lints'],
      },
      {
        id: 'webdev_rules_of_react',
        label: 'Rules Of React',
        typeLabel: 'Subsection',
        sortOrder: 15 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_rules'],
      },
      {
        id: 'webdev_server_components',
        label: 'Server Components',
        typeLabel: 'Subsection',
        sortOrder: 16 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_server_components'],
      },
      {
        id: 'webdev_server_functions',
        label: 'Server Functions',
        typeLabel: 'Subsection',
        sortOrder: 17 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_server_functions'],
      },
      {
        id: 'webdev_server_directives',
        label: 'Server Directives',
        typeLabel: 'Subsection',
        sortOrder: 18 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_server_directives'],
      },
      {
        id: 'webdev_react_router',
        label: 'React Router',
        typeLabel: 'Subsection',
        sortOrder: 19 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_router'],
      },
      {
        id: 'webdev_setup',
        label: 'Setup',
        typeLabel: 'Subsection',
        sortOrder: 20 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_setup'],
      },
      {
        id: 'webdev_managing_state',
        label: 'Managing State',
        typeLabel: 'Subsection',
        sortOrder: 21 * SORT_GAP,
        enabled: true,
        componentIds: ['webdev_react_state_management'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Agentic Coding sections (grown_ups)
// ---------------------------------------------------------------------------

const AGENTIC_CODING_SECTIONS: KangurLessonSection[] = [
  {
    id: 'agentic_codex_5_4',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Codex 5.4',
    typeLabel: 'Section',
    emoji: '🤖',
    sortOrder: 1 * SORT_GAP,
    enabled: true,
    componentIds: [],
    subsections: [
      {
        id: 'agentic_foundations',
        label: 'Foundations',
        typeLabel: 'Subsection',
        sortOrder: 1 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4'],
      },
      {
        id: 'agentic_fit',
        label: 'Fit & Limits',
        typeLabel: 'Subsection',
        sortOrder: 2 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_fit'],
      },
      {
        id: 'agentic_surfaces',
        label: 'Surfaces',
        typeLabel: 'Subsection',
        sortOrder: 3 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_surfaces'],
      },
      {
        id: 'agentic_operating_model',
        label: 'Operating Model',
        typeLabel: 'Subsection',
        sortOrder: 4 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_operating_model'],
      },
      {
        id: 'agentic_prompting_context',
        label: 'Prompting & Context',
        typeLabel: 'Subsection',
        sortOrder: 5 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_prompting'],
      },
      {
        id: 'agentic_responses_tools',
        label: 'Responses & Tools',
        typeLabel: 'Subsection',
        sortOrder: 6 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_responses'],
      },
      {
        id: 'agentic_agents_md',
        label: 'AGENTS.md',
        typeLabel: 'Subsection',
        sortOrder: 7 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_agents_md'],
      },
      {
        id: 'agentic_approvals_network',
        label: 'Approvals & Network',
        typeLabel: 'Subsection',
        sortOrder: 8 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_approvals'],
      },
      {
        id: 'agentic_config_safety',
        label: 'Config & Safety',
        typeLabel: 'Subsection',
        sortOrder: 9 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_safety'],
      },
      {
        id: 'agentic_config_layers',
        label: 'Config Layers',
        typeLabel: 'Subsection',
        sortOrder: 10 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_config_layers'],
      },
      {
        id: 'agentic_rules_execpolicy',
        label: 'Rules & Execpolicy',
        typeLabel: 'Subsection',
        sortOrder: 11 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_rules'],
      },
      {
        id: 'agentic_web_citations',
        label: 'Web & Citations',
        typeLabel: 'Subsection',
        sortOrder: 12 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_web_citations'],
      },
      {
        id: 'agentic_tooling_contract',
        label: 'Tooling & Search',
        typeLabel: 'Subsection',
        sortOrder: 13 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_tooling'],
      },
      {
        id: 'agentic_response_contract',
        label: 'Response Contract',
        typeLabel: 'Subsection',
        sortOrder: 14 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_response_contract'],
      },
      {
        id: 'agentic_ai_documentation',
        label: 'AI Documentation',
        typeLabel: 'Subsection',
        sortOrder: 15 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_ai_documentation'],
      },
      {
        id: 'agentic_delegation_parallelism',
        label: 'Delegation & Parallelism',
        typeLabel: 'Subsection',
        sortOrder: 16 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_delegation'],
      },
      {
        id: 'agentic_models',
        label: 'Models & Reasoning',
        typeLabel: 'Subsection',
        sortOrder: 17 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_models'],
      },
      {
        id: 'agentic_cli_ide',
        label: 'CLI & IDE',
        typeLabel: 'Subsection',
        sortOrder: 18 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_cli_ide'],
      },
      {
        id: 'agentic_codex_app',
        label: 'Codex App',
        typeLabel: 'Subsection',
        sortOrder: 19 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_app_workflows'],
      },
      {
        id: 'agentic_skills_mcp',
        label: 'Skills, MCP, Automations',
        typeLabel: 'Subsection',
        sortOrder: 20 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_skills'],
      },
      {
        id: 'agentic_mcp_integrations',
        label: 'MCP Integrations',
        typeLabel: 'Subsection',
        sortOrder: 21 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_mcp_integrations'],
      },
      {
        id: 'agentic_automations',
        label: 'Automations',
        typeLabel: 'Subsection',
        sortOrder: 22 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_automations'],
      },
      {
        id: 'agentic_state_scale',
        label: 'State & Scale',
        typeLabel: 'Subsection',
        sortOrder: 23 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_state_scale'],
      },
      {
        id: 'agentic_review_verification',
        label: 'Review & Verification',
        typeLabel: 'Subsection',
        sortOrder: 24 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_review'],
      },
      {
        id: 'agentic_long_horizon',
        label: 'Long-Horizon Work',
        typeLabel: 'Subsection',
        sortOrder: 25 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_long_horizon'],
      },
      {
        id: 'agentic_dos_donts',
        label: 'Do\'s & Don\'ts',
        typeLabel: 'Subsection',
        sortOrder: 26 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_dos_donts'],
      },
      {
        id: 'agentic_non_engineers',
        label: 'Non-Engineer Playbook',
        typeLabel: 'Subsection',
        sortOrder: 27 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_non_engineers'],
      },
      {
        id: 'agentic_prompt_patterns',
        label: 'Prompt Patterns',
        typeLabel: 'Subsection',
        sortOrder: 28 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_prompt_patterns'],
      },
      {
        id: 'agentic_rollout',
        label: 'Team Rollout',
        typeLabel: 'Subsection',
        sortOrder: 29 * SORT_GAP,
        enabled: true,
        componentIds: ['agentic_coding_codex_5_4_rollout'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all default lesson sections. Used as seed data when the
 * `kangur_lesson_sections` collection is empty.
 */
export const createDefaultKangurSections = (): KangurLessonSection[] => [
  ...ALPHABET_SECTIONS,
  ...ART_SECTIONS,
  ...MUSIC_SECTIONS,
  ...GEOMETRY_SECTIONS,
  ...MATHS_SECTIONS,
  ...ENGLISH_SECTIONS,
  ...WEB_DEVELOPMENT_SECTIONS,
  ...AGENTIC_CODING_SECTIONS,
];

/**
 * Build a lookup from componentId → { sectionId, subsectionId } for
 * populating back-references on KangurLesson records.
 */
export const buildSectionLookup = (
  sections: KangurLessonSection[]
): Map<string, { sectionId: string; subsectionId?: string | undefined }> => {
  const lookup = new Map<string, { sectionId: string; subsectionId?: string | undefined }>();

  for (const section of sections) {
    for (const componentId of section.componentIds) {
      lookup.set(componentId, { sectionId: section.id });
    }
    for (const sub of section.subsections) {
      for (const componentId of sub.componentIds) {
        lookup.set(componentId, { sectionId: section.id, subsectionId: sub.id });
      }
    }
  }

  return lookup;
};
