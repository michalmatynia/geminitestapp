'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import type { ComponentType, JSX } from 'react';

import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';

export type LessonProps = {
  onBack?: () => void;
  onReady?: () => void;
};

const LessonLoadingFallback = (): JSX.Element => (
  <div className='glass-panel w-full rounded-3xl border border-indigo-200/70 p-6 text-center text-sm text-indigo-500 shadow-lg'>
    Ladowanie lekcji...
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
const GeometryShapeRecognitionLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/GeometryShapeRecognitionLesson')
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

export const LESSON_COMPONENTS: Record<KangurLessonComponentId, ComponentType<LessonProps>> = {
  alphabet_basics: AlphabetBasicsLesson,
  alphabet_copy: AlphabetCopyLesson,
  alphabet_syllables: AlphabetSyllablesLesson,
  alphabet_words: AlphabetWordsLesson,
  alphabet_matching: AlphabetMatchingLesson,
  alphabet_sequence: AlphabetSequenceLesson,
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
};

export const FOCUS_TO_COMPONENT: Record<string, KangurLessonComponentId> = {
  alphabet: 'alphabet_basics',
  alfabet: 'alphabet_basics',
  letters: 'alphabet_basics',
  literki: 'alphabet_basics',
  abc: 'alphabet_basics',
  letter_tracing: 'alphabet_basics',
  'letter-tracing': 'alphabet_basics',
  tracing: 'alphabet_basics',
  trace: 'alphabet_basics',
  rysowanie: 'alphabet_basics',
  alphabet_basics: 'alphabet_basics',
  alphabet_copy: 'alphabet_copy',
  copy: 'alphabet_copy',
  przepisz: 'alphabet_copy',
  syllables: 'alphabet_syllables',
  sylaby: 'alphabet_syllables',
  sylaba: 'alphabet_syllables',
  words: 'alphabet_words',
  slowa: 'alphabet_words',
  slowo: 'alphabet_words',
  czytanie: 'alphabet_words',
  reading: 'alphabet_words',
  pierwsze_slowa: 'alphabet_words',
  'pierwsze-slowa': 'alphabet_words',
  alphabet_syllables: 'alphabet_syllables',
  alphabet_words: 'alphabet_words',
  matching: 'alphabet_matching',
  dopasuj: 'alphabet_matching',
  pary: 'alphabet_matching',
  uppercase: 'alphabet_matching',
  lowercase: 'alphabet_matching',
  alphabet_matching: 'alphabet_matching',
  sequence: 'alphabet_sequence',
  kolejnosc: 'alphabet_sequence',
  order: 'alphabet_sequence',
  alfabet_order: 'alphabet_sequence',
  alphabet_sequence: 'alphabet_sequence',
  shape_recognition: 'geometry_shape_recognition',
  'shape-recognition': 'geometry_shape_recognition',
  'shape recognition': 'geometry_shape_recognition',
  recognize_shapes: 'geometry_shape_recognition',
  'recognize-shapes': 'geometry_shape_recognition',
  geometry_shape_recognition: 'geometry_shape_recognition',
  adding: 'adding',
  addition: 'adding',
  subtracting: 'subtracting',
  subtraction: 'subtracting',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
  calendar: 'calendar',
  geometry: 'geometry_shapes',
  geometry_basics: 'geometry_basics',
  geometry_shapes: 'geometry_shapes',
  geometry_symmetry: 'geometry_symmetry',
  geometry_perimeter: 'geometry_perimeter',
  logical_thinking: 'logical_thinking',
  thinking: 'logical_thinking',
  logical_patterns: 'logical_patterns',
  patterns: 'logical_patterns',
  logical_classification: 'logical_classification',
  classification: 'logical_classification',
  logical_reasoning: 'logical_reasoning',
  reasoning: 'logical_reasoning',
  logical_analogies: 'logical_analogies',
  analogies: 'logical_analogies',
  logic: 'logical_thinking',
  english: 'english_basics',
  english_basics: 'english_basics',
  english_parts_of_speech: 'english_parts_of_speech',
  english_prepositions_time_place: 'english_prepositions_time_place',
  english_sentence_structure: 'english_sentence_structure',
  english_subject_verb_agreement: 'english_subject_verb_agreement',
  english_articles: 'english_articles',
  angielski: 'english_basics',
  pronouns: 'english_parts_of_speech',
  pronoun: 'english_parts_of_speech',
  possessive: 'english_parts_of_speech',
  possessives: 'english_parts_of_speech',
  possessive_pronouns: 'english_parts_of_speech',
  'possessive-pronouns': 'english_parts_of_speech',
  zaimki: 'english_parts_of_speech',
  zaimki_dzierzawcze: 'english_parts_of_speech',
  'zaimki-dzierzawcze': 'english_parts_of_speech',
  parts_of_speech: 'english_parts_of_speech',
  'parts-of-speech': 'english_parts_of_speech',
  pos: 'english_parts_of_speech',
  sentence_structure: 'english_sentence_structure',
  'sentence-structure': 'english_sentence_structure',
  sentence: 'english_sentence_structure',
  structure: 'english_sentence_structure',
  word_order: 'english_sentence_structure',
  'word-order': 'english_sentence_structure',
  wordorder: 'english_sentence_structure',
  svo: 'english_sentence_structure',
  szyk: 'english_sentence_structure',
  szyk_zdania: 'english_sentence_structure',
  'szyk-zdania': 'english_sentence_structure',
  struktura_zdania: 'english_sentence_structure',
  'struktura-zdania': 'english_sentence_structure',
  sentence_order: 'english_sentence_structure',
  agreement: 'english_subject_verb_agreement',
  subject_verb: 'english_subject_verb_agreement',
  'subject-verb': 'english_subject_verb_agreement',
  subject_verb_agreement: 'english_subject_verb_agreement',
  'subject-verb-agreement': 'english_subject_verb_agreement',
  subjectverb: 'english_subject_verb_agreement',
  sva: 'english_subject_verb_agreement',
  zgodnosc: 'english_subject_verb_agreement',
  zgodnosc_podmiotu: 'english_subject_verb_agreement',
  zgodnosc_podmiotu_z_orzeczeniem: 'english_subject_verb_agreement',
  zgodnosc_podmiotu_i_czasownika: 'english_subject_verb_agreement',
  zgodnosc_podmiotu_i_orzeczenia: 'english_subject_verb_agreement',
  podmiot_orzeczenie: 'english_subject_verb_agreement',
  articles: 'english_articles',
  article: 'english_articles',
  a_an_the: 'english_articles',
  'a-an-the': 'english_articles',
  the: 'english_articles',
  przedimki: 'english_articles',
  przedimki_angielski: 'english_articles',
  'przedimki-angielski': 'english_articles',
  prepositions: 'english_prepositions_time_place',
  preposition: 'english_prepositions_time_place',
  prepositions_of_time: 'english_prepositions_time_place',
  prepositions_of_place: 'english_prepositions_time_place',
  time_prepositions: 'english_prepositions_time_place',
  place_prepositions: 'english_prepositions_time_place',
  at_on_in: 'english_prepositions_time_place',
  'at-on-in': 'english_prepositions_time_place',
  przyimki: 'english_prepositions_time_place',
  przyimki_czasu: 'english_prepositions_time_place',
  przyimki_miejsca: 'english_prepositions_time_place',
  'przyimki-czasu': 'english_prepositions_time_place',
  'przyimki-miejsca': 'english_prepositions_time_place',
  react: 'webdev_react_components',
  react_components: 'webdev_react_components',
  'react-components': 'webdev_react_components',
  components: 'webdev_react_components',
  react_dom_components: 'webdev_react_dom_components',
  'react-dom-components': 'webdev_react_dom_components',
  dom_components: 'webdev_react_dom_components',
  'dom-components': 'webdev_react_dom_components',
  components_react_dom: 'webdev_react_dom_components',
  'components-react-dom': 'webdev_react_dom_components',
  webdev_react_dom_components: 'webdev_react_dom_components',
  hooks: 'webdev_react_hooks',
  hooki: 'webdev_react_hooks',
  hook: 'webdev_react_hooks',
  react_hooks: 'webdev_react_hooks',
  'react-hooks': 'webdev_react_hooks',
  hooks_basics: 'webdev_react_hooks',
  'hooks-basics': 'webdev_react_hooks',
  webdev_react_hooks: 'webdev_react_hooks',
  apis: 'webdev_react_apis',
  api: 'webdev_react_apis',
  react_apis: 'webdev_react_apis',
  'react-apis': 'webdev_react_apis',
  apis_basics: 'webdev_react_apis',
  'apis-basics': 'webdev_react_apis',
  webdev_react_apis: 'webdev_react_apis',
  react_dom_apis: 'webdev_react_dom_apis',
  'react-dom-apis': 'webdev_react_dom_apis',
  dom_apis: 'webdev_react_dom_apis',
  'dom-apis': 'webdev_react_dom_apis',
  apis_react_dom: 'webdev_react_dom_apis',
  'apis-react-dom': 'webdev_react_dom_apis',
  webdev_react_dom_apis: 'webdev_react_dom_apis',
  client_apis_react_dom: 'webdev_react_dom_client_apis',
  'client-apis-react-dom': 'webdev_react_dom_client_apis',
  react_dom_client_apis: 'webdev_react_dom_client_apis',
  'react-dom-client-apis': 'webdev_react_dom_client_apis',
  webdev_react_dom_client_apis: 'webdev_react_dom_client_apis',
  server_apis_react_dom: 'webdev_react_dom_server_apis',
  'server-apis-react-dom': 'webdev_react_dom_server_apis',
  react_dom_server_apis: 'webdev_react_dom_server_apis',
  'react-dom-server-apis': 'webdev_react_dom_server_apis',
  webdev_react_dom_server_apis: 'webdev_react_dom_server_apis',
  static_apis_react_dom: 'webdev_react_dom_static_apis',
  'static-apis-react-dom': 'webdev_react_dom_static_apis',
  react_dom_static_apis: 'webdev_react_dom_static_apis',
  'react-dom-static-apis': 'webdev_react_dom_static_apis',
  webdev_react_dom_static_apis: 'webdev_react_dom_static_apis',
  react_compiler: 'webdev_react_compiler_config',
  compiler_config: 'webdev_react_compiler_config',
  compiler_configuration: 'webdev_react_compiler_config',
  react_compiler_configuration: 'webdev_react_compiler_config',
  'react-compiler-configuration': 'webdev_react_compiler_config',
  webdev_react_compiler_config: 'webdev_react_compiler_config',
  react_compiler_directives: 'webdev_react_compiler_directives',
  'react-compiler-directives': 'webdev_react_compiler_directives',
  compiler_directives: 'webdev_react_compiler_directives',
  webdev_react_compiler_directives: 'webdev_react_compiler_directives',
  react_compiler_libraries: 'webdev_react_compiler_libraries',
  'react-compiler-libraries': 'webdev_react_compiler_libraries',
  compiler_libraries: 'webdev_react_compiler_libraries',
  webdev_react_compiler_libraries: 'webdev_react_compiler_libraries',
  performance_tracks: 'webdev_react_performance_tracks',
  'performance-tracks': 'webdev_react_performance_tracks',
  react_performance_tracks: 'webdev_react_performance_tracks',
  'react-performance-tracks': 'webdev_react_performance_tracks',
  webdev_react_performance_tracks: 'webdev_react_performance_tracks',
  lints: 'webdev_react_lints',
  lint: 'webdev_react_lints',
  linting: 'webdev_react_lints',
  webdev_react_lints: 'webdev_react_lints',
  rules_of_react: 'webdev_react_rules',
  'rules-of-react': 'webdev_react_rules',
  react_rules: 'webdev_react_rules',
  'react-rules': 'webdev_react_rules',
  webdev_react_rules: 'webdev_react_rules',
  server_components: 'webdev_react_server_components',
  'server-components': 'webdev_react_server_components',
  react_server_components: 'webdev_react_server_components',
  'react-server-components': 'webdev_react_server_components',
  webdev_react_server_components: 'webdev_react_server_components',
  server_functions: 'webdev_react_server_functions',
  'server-functions': 'webdev_react_server_functions',
  react_server_functions: 'webdev_react_server_functions',
  'react-server-functions': 'webdev_react_server_functions',
  webdev_react_server_functions: 'webdev_react_server_functions',
  server_directives: 'webdev_react_server_directives',
  'server-directives': 'webdev_react_server_directives',
  react_server_directives: 'webdev_react_server_directives',
  'react-server-directives': 'webdev_react_server_directives',
  webdev_react_server_directives: 'webdev_react_server_directives',
  react_router: 'webdev_react_router',
  'react-router': 'webdev_react_router',
  router: 'webdev_react_router',
  webdev_react_router: 'webdev_react_router',
  setup: 'webdev_react_setup',
  react_setup: 'webdev_react_setup',
  'react-setup': 'webdev_react_setup',
  webdev_react_setup: 'webdev_react_setup',
  managing_state: 'webdev_react_state_management',
  'managing-state': 'webdev_react_state_management',
  react_state: 'webdev_react_state_management',
  'react-state': 'webdev_react_state_management',
  webdev_react_state_management: 'webdev_react_state_management',
  react_dom: 'webdev_react_dom_hooks',
  'react-dom': 'webdev_react_dom_hooks',
  dom_hooks: 'webdev_react_dom_hooks',
  'dom-hooks': 'webdev_react_dom_hooks',
  react_dom_hooks: 'webdev_react_dom_hooks',
  'react-dom-hooks': 'webdev_react_dom_hooks',
  hooks_react_dom: 'webdev_react_dom_hooks',
  'hooks-react-dom': 'webdev_react_dom_hooks',
  webdev_react_dom_hooks: 'webdev_react_dom_hooks',
  webdev: 'webdev_react_components',
  web_development: 'webdev_react_components',
};
