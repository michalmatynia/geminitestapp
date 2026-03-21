import { z } from 'zod';

export const kangurLessonComponentIdSchema = z.enum([
  'alphabet_basics',
  'alphabet_copy',
  'alphabet_syllables',
  'alphabet_words',
  'alphabet_matching',
  'alphabet_sequence',
  'geometry_shape_recognition',
  'clock',
  'calendar',
  'adding',
  'subtracting',
  'multiplication',
  'division',
  'geometry_basics',
  'geometry_shapes',
  'geometry_symmetry',
  'geometry_perimeter',
  'logical_thinking',
  'logical_patterns',
  'logical_classification',
  'logical_reasoning',
  'logical_analogies',
  'english_basics',
  'english_parts_of_speech',
  'english_sentence_structure',
  'english_subject_verb_agreement',
  'english_articles',
  'english_prepositions_time_place',
  'webdev_react_components',
  'webdev_react_hooks',
  'webdev_react_apis',
  'webdev_react_dom_hooks',
  'webdev_react_dom_components',
  'webdev_react_dom_apis',
  'webdev_react_dom_client_apis',
  'webdev_react_dom_server_apis',
  'webdev_react_dom_static_apis',
  'webdev_react_compiler_config',
  'webdev_react_compiler_directives',
  'webdev_react_compiler_libraries',
  'webdev_react_performance_tracks',
  'webdev_react_lints',
  'webdev_react_rules',
  'webdev_react_server_components',
  'webdev_react_server_functions',
  'webdev_react_server_directives',
  'webdev_react_router',
  'webdev_react_setup',
  'webdev_react_state_management',
  'agentic_coding_codex_5_4',
  'agentic_coding_codex_5_4_fit',
  'agentic_coding_codex_5_4_surfaces',
  'agentic_coding_codex_5_4_operating_model',
  'agentic_coding_codex_5_4_prompting',
  'agentic_coding_codex_5_4_responses',
  'agentic_coding_codex_5_4_agents_md',
  'agentic_coding_codex_5_4_approvals',
  'agentic_coding_codex_5_4_safety',
  'agentic_coding_codex_5_4_config_layers',
  'agentic_coding_codex_5_4_rules',
  'agentic_coding_codex_5_4_web_citations',
  'agentic_coding_codex_5_4_tooling',
  'agentic_coding_codex_5_4_response_contract',
  'agentic_coding_codex_5_4_ai_documentation',
  'agentic_coding_codex_5_4_delegation',
  'agentic_coding_codex_5_4_models',
  'agentic_coding_codex_5_4_cli_ide',
  'agentic_coding_codex_5_4_app_workflows',
  'agentic_coding_codex_5_4_skills',
  'agentic_coding_codex_5_4_mcp_integrations',
  'agentic_coding_codex_5_4_automations',
  'agentic_coding_codex_5_4_state_scale',
  'agentic_coding_codex_5_4_review',
  'agentic_coding_codex_5_4_long_horizon',
  'agentic_coding_codex_5_4_dos_donts',
  'agentic_coding_codex_5_4_non_engineers',
  'agentic_coding_codex_5_4_prompt_patterns',
  'agentic_coding_codex_5_4_rollout',
]);
export type KangurLessonComponentId = z.infer<typeof kangurLessonComponentIdSchema>;

export const kangurLessonContentModeSchema = z.enum(['component', 'document']);
export type KangurLessonContentMode = z.infer<typeof kangurLessonContentModeSchema>;

export const kangurLessonSubjectSchema = z.enum([
  'alphabet',
  'geometry',
  'maths',
  'english',
  'web_development',
  'agentic_coding',
]);
export type KangurLessonSubject = z.infer<typeof kangurLessonSubjectSchema>;

export const kangurLessonAgeGroupSchema = z.enum(['six_year_old', 'ten_year_old', 'grown_ups']);
export type KangurLessonAgeGroup = z.infer<typeof kangurLessonAgeGroupSchema>;

export const kangurLessonCollectionFilterSchema = z.object({
  subject: kangurLessonSubjectSchema.optional(),
  ageGroup: kangurLessonAgeGroupSchema.optional(),
  enabledOnly: z.boolean().optional(),
});
export type KangurLessonCollectionFilterDto = z.infer<typeof kangurLessonCollectionFilterSchema>;

export const kangurSubjectFocusSchema = z.object({
  subject: kangurLessonSubjectSchema,
});
export type KangurSubjectFocus = z.infer<typeof kangurSubjectFocusSchema>;

export const KANGUR_TTS_DEFAULT_LOCALE = 'pl-PL';
export const KANGUR_TTS_DEFAULT_VOICE = 'coral';

export const KANGUR_LESSON_ACTIVITY_IDS = [
  'adding-ball',
  'adding-synthesis',
  'subtracting-game',
  'multiplication-array',
  'multiplication-quiz',
  'division-game',
  'geometry-drawing',
  'calendar-interactive',
  'clock-training',
] as const;
export const kangurLessonActivityIdSchema = z.enum(KANGUR_LESSON_ACTIVITY_IDS);
export type KangurLessonActivityId = z.infer<typeof kangurLessonActivityIdSchema>;

export const KANGUR_LESSON_ACTIVITY_TYPES = [
  'practice-drag-drop',
  'practice-rhythm',
  'practice-multiple-choice',
  'practice-tap-select',
  'practice-calendar-interactive',
  'training-drawing',
  'training-clock',
] as const;
export const kangurLessonActivityTypeSchema = z.enum(KANGUR_LESSON_ACTIVITY_TYPES);
export type KangurLessonActivityType = z.infer<typeof kangurLessonActivityTypeSchema>;

export const kangurLessonNarrationVoiceSchema = z.enum([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
]);
export type KangurLessonNarrationVoice = z.infer<typeof kangurLessonNarrationVoiceSchema>;
