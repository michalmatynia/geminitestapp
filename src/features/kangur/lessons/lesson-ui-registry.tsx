'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import type { ComponentType, JSX } from 'react';

import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { KANGUR_LESSON_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { FOCUS_TO_COMPONENT } from './lesson-focus-map';

export type LessonProps = {
  onBack?: () => void;
  onReady?: () => void;
  lessonTemplate?: KangurLessonTemplate | null;
};

const LessonSkeletonLine = ({ className }: { className?: string }): JSX.Element => (
  <div
    aria-hidden='true'
    className={`h-3 rounded-full bg-slate-200/80 ${className ?? ''}`}
  />
);

const LessonSkeletonBlock = ({ className }: { className?: string }): JSX.Element => (
  <div
    aria-hidden='true'
    className={`rounded-[18px] bg-slate-200/80 ${className ?? ''}`}
  />
);

const LessonLoadingFallback = (): JSX.Element => (
  <div
    className={`flex w-full max-w-md flex-col items-center ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}
    role='status'
    aria-live='polite'
    aria-busy='true'
  >
    {Array.from({ length: 3 }).map((_, index) => (
      <KangurGlassPanel
        key={`lesson-loading-card-${index}`}
        className='w-full animate-pulse'
        padding='md'
        surface='playField'
        variant='soft'
      >
        <div className='flex items-start gap-4 sm:items-center'>
          <LessonSkeletonBlock className='h-12 w-12 shrink-0 rounded-2xl' />
          <div className='flex-1 space-y-2'>
            <LessonSkeletonLine className='h-4 w-2/3' />
            <LessonSkeletonLine className='w-full' />
            <LessonSkeletonLine className='w-5/6' />
          </div>
          <div className='hidden flex-col items-end gap-2 sm:flex'>
            <LessonSkeletonLine className='h-5 w-16' />
            <div className='flex gap-1.5'>
              {Array.from({ length: 4 }).map((_, dotIndex) => (
                <LessonSkeletonBlock
                  key={`lesson-loading-dot-${index}-${dotIndex}`}
                  className='h-2.5 w-2.5 rounded-full'
                />
              ))}
            </div>
          </div>
        </div>
      </KangurGlassPanel>
    ))}
    <span className='sr-only'>Ładowanie sekcji lekcji...</span>
  </div>
);

const loadLessonComponent = (
  loader: () => Promise<unknown>
): ComponentType<LessonProps> =>
  dynamic<LessonProps>(
    async () => {
      const module = (await loader()) as { default: ComponentType<LessonProps> };
      const ResolvedLesson = module.default;

      return function KangurLoadedLesson(props: LessonProps): JSX.Element {
        useEffect(() => {
          props.onReady?.();
        }, [props.onReady]);

        return <ResolvedLesson {...props} />;
      };
    },
    {
      ssr: false,
      loading: LessonLoadingFallback,
    }
  );

const AlphabetBasicsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AlphabetBasicsLesson')
);
const AlphabetCopyLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AlphabetCopyLesson')
);
const AlphabetSyllablesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AlphabetSyllablesLesson')
);
const AlphabetWordsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AlphabetWordsLesson')
);
const AlphabetMatchingLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AlphabetMatchingLesson')
);
const AlphabetSequenceLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AlphabetSequenceLesson')
);
const ArtColorsHarmonyLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/ArtColorsHarmonyLesson')
);
const ArtShapesBasicLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/ArtShapesBasicLesson')
);
const MusicDiatonicScaleLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/MusicDiatonicScaleLesson')
);
const ClockLesson = loadLessonComponent(() => import('@/features/kangur/ui/components/ClockLesson'));
const CalendarLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/CalendarLesson')
);
const AddingLesson = loadLessonComponent(() => import('@/features/kangur/ui/components/AddingLesson'));
const SubtractingLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/SubtractingLesson')
);
const MultiplicationLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/MultiplicationLesson')
);
const DivisionLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/DivisionLesson')
);
const GeometryBasicsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/GeometryBasicsLesson')
);
const GeometryShapesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/GeometryShapesLesson')
);
const GeometrySymmetryLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/GeometrySymmetryLesson')
);
const GeometryPerimeterLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/GeometryPerimeterLesson')
);
const GeometryShapeRecognitionLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/GeometryShapeRecognitionLesson')
);
const LogicalThinkingLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/LogicalThinkingLesson')
);
const LogicalPatternsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/LogicalPatternsLesson')
);
const LogicalClassificationLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/LogicalClassificationLesson')
);
const LogicalReasoningLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/LogicalReasoningLesson')
);
const LogicalAnalogiesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/LogicalAnalogiesLesson')
);
const EnglishLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/EnglishLesson')
);
const EnglishPartsOfSpeechLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/EnglishPartsOfSpeechLesson')
);
const EnglishPrepositionsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/EnglishPrepositionsLesson')
);
const EnglishSentenceStructureLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/EnglishSentenceStructureLesson')
);
const EnglishSubjectVerbAgreementLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/EnglishSubjectVerbAgreementLesson')
);
const EnglishArticlesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/EnglishArticlesLesson')
);
const EnglishAdjectivesLesson = loadLessonComponent(
  () => import('../ui/components/EnglishAdjectivesLesson')
);
const EnglishAdverbsLesson = loadLessonComponent(
  () => import('../ui/components/EnglishAdverbsLesson')
);
const EnglishAdverbsFrequencyLesson = loadLessonComponent(
  () => import('../ui/components/EnglishAdverbsFrequencyLesson')
);
const WebDevelopmentReactComponentsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactComponentsLesson')
);
const WebDevelopmentReactDomComponentsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactDomComponentsLesson')
);
const WebDevelopmentReactHooksLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactHooksLesson')
);
const WebDevelopmentReactApisLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactApisLesson')
);
const WebDevelopmentReactDomHooksLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactDomHooksLesson')
);
const WebDevelopmentReactDomApisLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactDomApisLesson')
);
const WebDevelopmentReactDomClientApisLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactDomClientApisLesson')
);
const WebDevelopmentReactDomServerApisLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactDomServerApisLesson')
);
const WebDevelopmentReactDomStaticApisLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactDomStaticApisLesson')
);
const WebDevelopmentReactCompilerConfigLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactCompilerConfigLesson')
);
const WebDevelopmentReactCompilerDirectivesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactCompilerDirectivesLesson')
);
const WebDevelopmentReactCompilerLibrariesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactCompilerLibrariesLesson')
);
const WebDevelopmentReactPerformanceTracksLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactPerformanceTracksLesson')
);
const WebDevelopmentReactLintsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactLintsLesson')
);
const WebDevelopmentReactRulesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactRulesLesson')
);
const WebDevelopmentReactServerComponentsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactServerComponentsLesson')
);
const WebDevelopmentReactServerFunctionsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactServerFunctionsLesson')
);
const WebDevelopmentReactServerDirectivesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactServerDirectivesLesson')
);
const WebDevelopmentReactRouterLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactRouterLesson')
);
const WebDevelopmentReactSetupLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactSetupLesson')
);
const WebDevelopmentReactStateManagementLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/WebDevelopmentReactStateManagementLesson')
);
const AgenticCodingCodex54Lesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54Lesson')
);
const AgenticCodingCodex54FitLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54FitLesson')
);
const AgenticCodingCodex54SurfacesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54SurfacesLesson')
);
const AgenticCodingCodex54OperatingModelLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54OperatingModelLesson')
);
const AgenticCodingCodex54PromptingLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54PromptingLesson')
);
const AgenticCodingCodex54ResponsesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54ResponsesLesson')
);
const AgenticCodingCodex54AgentsMdLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54AgentsMdLesson')
);
const AgenticCodingCodex54ApprovalsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54ApprovalsLesson')
);
const AgenticCodingCodex54SafetyLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54SafetyLesson')
);
const AgenticCodingCodex54ConfigLayersLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54ConfigLayersLesson')
);
const AgenticCodingCodex54RulesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54RulesLesson')
);
const AgenticCodingCodex54WebCitationsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54WebCitationsLesson')
);
const AgenticCodingCodex54ToolingLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54ToolingLesson')
);
const AgenticCodingCodex54ResponseContractLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54ResponseContractLesson')
);
const AgenticCodingCodex54AiDocumentationLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54AiDocumentationLesson')
);
const AgenticCodingCodex54DelegationLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54DelegationLesson')
);
const AgenticCodingCodex54ModelsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54ModelsLesson')
);
const AgenticCodingCodex54CliIdeLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54CliIdeLesson')
);
const AgenticCodingCodex54AppWorkflowsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54AppWorkflowsLesson')
);
const AgenticCodingCodex54SkillsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54SkillsLesson')
);
const AgenticCodingCodex54McpIntegrationsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54McpIntegrationsLesson')
);
const AgenticCodingCodex54AutomationsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54AutomationsLesson')
);
const AgenticCodingCodex54StateScaleLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54StateScaleLesson')
);
const AgenticCodingCodex54ReviewLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54ReviewLesson')
);
const AgenticCodingCodex54LongHorizonLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54LongHorizonLesson')
);
const AgenticCodingCodex54DosDontsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54DosDontsLesson')
);
const AgenticCodingCodex54NonEngineersLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54NonEngineersLesson')
);
const AgenticCodingCodex54PromptPatternsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54PromptPatternsLesson')
);
const AgenticCodingCodex54RolloutLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AgenticCodingCodex54RolloutLesson')
);

export const LESSON_COMPONENTS: Record<KangurLessonComponentId, ComponentType<LessonProps>> = {
  alphabet_basics: AlphabetBasicsLesson,
  alphabet_copy: AlphabetCopyLesson,
  alphabet_syllables: AlphabetSyllablesLesson,
  alphabet_words: AlphabetWordsLesson,
  alphabet_matching: AlphabetMatchingLesson,
  alphabet_sequence: AlphabetSequenceLesson,
  art_colors_harmony: ArtColorsHarmonyLesson,
  art_shapes_basic: ArtShapesBasicLesson,
  music_diatonic_scale: MusicDiatonicScaleLesson,
  geometry_shape_recognition: GeometryShapeRecognitionLesson,
  clock: ClockLesson,
  calendar: CalendarLesson,
  adding: AddingLesson,
  subtracting: SubtractingLesson,
  multiplication: MultiplicationLesson,
  division: DivisionLesson,
  geometry_basics: GeometryBasicsLesson,
  geometry_shapes: GeometryShapesLesson,
  geometry_symmetry: GeometrySymmetryLesson,
  geometry_perimeter: GeometryPerimeterLesson,
  logical_thinking: LogicalThinkingLesson,
  logical_patterns: LogicalPatternsLesson,
  logical_classification: LogicalClassificationLesson,
  logical_reasoning: LogicalReasoningLesson,
  logical_analogies: LogicalAnalogiesLesson,
  english_basics: EnglishLesson,
  english_parts_of_speech: EnglishPartsOfSpeechLesson,
  english_prepositions_time_place: EnglishPrepositionsLesson,
  english_sentence_structure: EnglishSentenceStructureLesson,
  english_subject_verb_agreement: EnglishSubjectVerbAgreementLesson,
  english_articles: EnglishArticlesLesson,
  english_adjectives: EnglishAdjectivesLesson,
  english_adverbs: EnglishAdverbsLesson,
  english_adverbs_frequency: EnglishAdverbsFrequencyLesson,
  webdev_react_components: WebDevelopmentReactComponentsLesson,
  webdev_react_dom_components: WebDevelopmentReactDomComponentsLesson,
  webdev_react_hooks: WebDevelopmentReactHooksLesson,
  webdev_react_apis: WebDevelopmentReactApisLesson,
  webdev_react_dom_hooks: WebDevelopmentReactDomHooksLesson,
  webdev_react_dom_apis: WebDevelopmentReactDomApisLesson,
  webdev_react_dom_client_apis: WebDevelopmentReactDomClientApisLesson,
  webdev_react_dom_server_apis: WebDevelopmentReactDomServerApisLesson,
  webdev_react_dom_static_apis: WebDevelopmentReactDomStaticApisLesson,
  webdev_react_compiler_config: WebDevelopmentReactCompilerConfigLesson,
  webdev_react_compiler_directives: WebDevelopmentReactCompilerDirectivesLesson,
  webdev_react_compiler_libraries: WebDevelopmentReactCompilerLibrariesLesson,
  webdev_react_performance_tracks: WebDevelopmentReactPerformanceTracksLesson,
  webdev_react_lints: WebDevelopmentReactLintsLesson,
  webdev_react_rules: WebDevelopmentReactRulesLesson,
  webdev_react_server_components: WebDevelopmentReactServerComponentsLesson,
  webdev_react_server_functions: WebDevelopmentReactServerFunctionsLesson,
  webdev_react_server_directives: WebDevelopmentReactServerDirectivesLesson,
  webdev_react_router: WebDevelopmentReactRouterLesson,
  webdev_react_setup: WebDevelopmentReactSetupLesson,
  webdev_react_state_management: WebDevelopmentReactStateManagementLesson,
  agentic_coding_codex_5_4: AgenticCodingCodex54Lesson,
  agentic_coding_codex_5_4_fit: AgenticCodingCodex54FitLesson,
  agentic_coding_codex_5_4_surfaces: AgenticCodingCodex54SurfacesLesson,
  agentic_coding_codex_5_4_operating_model: AgenticCodingCodex54OperatingModelLesson,
  agentic_coding_codex_5_4_prompting: AgenticCodingCodex54PromptingLesson,
  agentic_coding_codex_5_4_responses: AgenticCodingCodex54ResponsesLesson,
  agentic_coding_codex_5_4_agents_md: AgenticCodingCodex54AgentsMdLesson,
  agentic_coding_codex_5_4_approvals: AgenticCodingCodex54ApprovalsLesson,
  agentic_coding_codex_5_4_safety: AgenticCodingCodex54SafetyLesson,
  agentic_coding_codex_5_4_config_layers: AgenticCodingCodex54ConfigLayersLesson,
  agentic_coding_codex_5_4_rules: AgenticCodingCodex54RulesLesson,
  agentic_coding_codex_5_4_web_citations: AgenticCodingCodex54WebCitationsLesson,
  agentic_coding_codex_5_4_tooling: AgenticCodingCodex54ToolingLesson,
  agentic_coding_codex_5_4_response_contract: AgenticCodingCodex54ResponseContractLesson,
  agentic_coding_codex_5_4_ai_documentation: AgenticCodingCodex54AiDocumentationLesson,
  agentic_coding_codex_5_4_delegation: AgenticCodingCodex54DelegationLesson,
  agentic_coding_codex_5_4_models: AgenticCodingCodex54ModelsLesson,
  agentic_coding_codex_5_4_cli_ide: AgenticCodingCodex54CliIdeLesson,
  agentic_coding_codex_5_4_app_workflows: AgenticCodingCodex54AppWorkflowsLesson,
  agentic_coding_codex_5_4_skills: AgenticCodingCodex54SkillsLesson,
  agentic_coding_codex_5_4_mcp_integrations: AgenticCodingCodex54McpIntegrationsLesson,
  agentic_coding_codex_5_4_automations: AgenticCodingCodex54AutomationsLesson,
  agentic_coding_codex_5_4_state_scale: AgenticCodingCodex54StateScaleLesson,
  agentic_coding_codex_5_4_review: AgenticCodingCodex54ReviewLesson,
  agentic_coding_codex_5_4_long_horizon: AgenticCodingCodex54LongHorizonLesson,
  agentic_coding_codex_5_4_dos_donts: AgenticCodingCodex54DosDontsLesson,
  agentic_coding_codex_5_4_non_engineers: AgenticCodingCodex54NonEngineersLesson,
  agentic_coding_codex_5_4_prompt_patterns: AgenticCodingCodex54PromptPatternsLesson,
  agentic_coding_codex_5_4_rollout: AgenticCodingCodex54RolloutLesson,
};

export { FOCUS_TO_COMPONENT };
