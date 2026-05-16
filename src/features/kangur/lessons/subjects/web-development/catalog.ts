import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';

export const WEB_DEVELOPMENT_LESSON_COMPONENT_ORDER = [
  'webdev_react_components',
  'webdev_react_dom_components',
  'webdev_react_hooks',
  'webdev_react_dom_hooks',
  'webdev_react_apis',
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
  'webdev_js_basics',
  'webdev_js_syntax',
  'webdev_js_dom',
  'webdev_js_es6',
  'webdev_js_async',
  'webdev_js_tooling',
] as const satisfies readonly KangurLessonComponentId[];

type WebDevelopmentLessonComponentId = (typeof WEB_DEVELOPMENT_LESSON_COMPONENT_ORDER)[number];

const WEB_DEVELOPMENT_COMPONENTS_COMPONENT_IDS = [
  'webdev_react_components',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_DOM_COMPONENTS_COMPONENT_IDS = [
  'webdev_react_dom_components',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_HOOKS_COMPONENT_IDS = [
  'webdev_react_hooks',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_DOM_HOOKS_COMPONENT_IDS = [
  'webdev_react_dom_hooks',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_APIS_COMPONENT_IDS = [
  'webdev_react_apis',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_DOM_APIS_COMPONENT_IDS = [
  'webdev_react_dom_apis',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_DOM_CLIENT_APIS_COMPONENT_IDS = [
  'webdev_react_dom_client_apis',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_DOM_SERVER_APIS_COMPONENT_IDS = [
  'webdev_react_dom_server_apis',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_DOM_STATIC_APIS_COMPONENT_IDS = [
  'webdev_react_dom_static_apis',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_COMPILER_CONFIG_COMPONENT_IDS = [
  'webdev_react_compiler_config',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_COMPILER_DIRECTIVES_COMPONENT_IDS = [
  'webdev_react_compiler_directives',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_COMPILER_LIBRARIES_COMPONENT_IDS = [
  'webdev_react_compiler_libraries',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_PERFORMANCE_TRACKS_COMPONENT_IDS = [
  'webdev_react_performance_tracks',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_LINTS_COMPONENT_IDS = [
  'webdev_react_lints',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_RULES_COMPONENT_IDS = [
  'webdev_react_rules',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_SERVER_COMPONENTS_COMPONENT_IDS = [
  'webdev_react_server_components',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_SERVER_FUNCTIONS_COMPONENT_IDS = [
  'webdev_react_server_functions',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_SERVER_DIRECTIVES_COMPONENT_IDS = [
  'webdev_react_server_directives',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_ROUTER_COMPONENT_IDS = [
  'webdev_react_router',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_SETUP_COMPONENT_IDS = [
  'webdev_react_setup',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_STATE_MANAGEMENT_COMPONENT_IDS = [
  'webdev_react_state_management',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_JS_BASICS_COMPONENT_IDS = [
  'webdev_js_basics',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_JS_SYNTAX_COMPONENT_IDS = [
  'webdev_js_syntax',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_JS_DOM_COMPONENT_IDS = [
  'webdev_js_dom',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_JS_ES6_COMPONENT_IDS = [
  'webdev_js_es6',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_JS_ASYNC_COMPONENT_IDS = [
  'webdev_js_async',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

const WEB_DEVELOPMENT_JS_TOOLING_COMPONENT_IDS = [
  'webdev_js_tooling',
] as const satisfies readonly WebDevelopmentLessonComponentId[];

export const WEB_DEVELOPMENT_LESSON_TEMPLATES: Record<
  WebDevelopmentLessonComponentId,
  KangurLessonTemplate
> = {
  webdev_react_components: {
    componentId: 'webdev_react_components',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Component Basics',
    title: 'Component Basics',
    description: 'Poznaj podstawy komponentów i buduj interfejsy w React 19.2.',
    emoji: '⚛️',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
  webdev_react_dom_components: {
    componentId: 'webdev_react_dom_components',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Components: React Dom Basics',
    title: 'Components: React Dom Basics',
    description: 'Poznaj podstawy komponentów React DOM i pracy z elementami DOM.',
    emoji: '🧩',
    color: 'kangur-gradient-accent-emerald',
    activeBg: 'bg-emerald-500',
  },
  webdev_react_hooks: {
    componentId: 'webdev_react_hooks',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Hooks Basics',
    title: 'Hooks Basics',
    description: 'Poznaj podstawy hooków i buduj logikę React 19.2.',
    emoji: '🪝',
    color: 'kangur-gradient-accent-indigo',
    activeBg: 'bg-indigo-500',
  },
  webdev_react_dom_hooks: {
    componentId: 'webdev_react_dom_hooks',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Hooks: React Dom Basics',
    title: 'Hooks: React Dom Basics',
    description: 'Poznaj hooki z React DOM, by budować lepsze formularze i interakcje.',
    emoji: '🧲',
    color: 'kangur-gradient-accent-violet',
    activeBg: 'bg-violet-500',
  },
  webdev_react_apis: {
    componentId: 'webdev_react_apis',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'APIs Basics',
    title: 'APIs Basics',
    description: 'Poznaj podstawowe API Reacta i narzędzia wspierające.',
    emoji: '🔌',
    color: 'kangur-gradient-accent-teal',
    activeBg: 'bg-teal-500',
  },
  webdev_react_dom_apis: {
    componentId: 'webdev_react_dom_apis',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'APIs: React Dom Basics',
    title: 'APIs: React Dom Basics',
    description: 'Poznaj podstawowe API React DOM i pracę z portalami.',
    emoji: '🧰',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  webdev_react_dom_client_apis: {
    componentId: 'webdev_react_dom_client_apis',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Client APIs: React Dom Basics',
    title: 'Client APIs: React Dom Basics',
    description: 'Poznaj client API React DOM: createRoot i hydrateRoot.',
    emoji: '📡',
    color: 'kangur-gradient-accent-slate',
    activeBg: 'bg-slate-500',
  },
  webdev_react_dom_server_apis: {
    componentId: 'webdev_react_dom_server_apis',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Server APIs: React Dom Basics',
    title: 'Server APIs: React Dom Basics',
    description: 'Poznaj API React DOM do renderowania po stronie serwera.',
    emoji: '🛰️',
    color: 'kangur-gradient-accent-rose',
    activeBg: 'bg-rose-500',
  },
  webdev_react_dom_static_apis: {
    componentId: 'webdev_react_dom_static_apis',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Static APIs: React Dom Basics',
    title: 'Static APIs: React Dom Basics',
    description: 'Poznaj static API React DOM do generowania HTML.',
    emoji: '🧊',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
  webdev_react_compiler_config: {
    componentId: 'webdev_react_compiler_config',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'React Compiler Configuration Basics',
    title: 'React Compiler Configuration Basics',
    description: 'Poznaj konfigurację React Compiler i podstawy optymalizacji.',
    emoji: '🛠️',
    color: 'kangur-gradient-accent-violet',
    activeBg: 'bg-violet-500',
  },
  webdev_react_compiler_directives: {
    componentId: 'webdev_react_compiler_directives',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'React Compiler Directives Basics',
    title: 'React Compiler Directives Basics',
    description: 'Poznaj dyrektywy kompilatora i jak nimi sterować.',
    emoji: '📌',
    color: 'kangur-gradient-accent-emerald',
    activeBg: 'bg-emerald-500',
  },
  webdev_react_compiler_libraries: {
    componentId: 'webdev_react_compiler_libraries',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'React Compiler Libraries Basics',
    title: 'React Compiler Libraries Basics',
    description: 'Poznaj biblioteki i integracje wspierające kompilator.',
    emoji: '📚',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  webdev_react_performance_tracks: {
    componentId: 'webdev_react_performance_tracks',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Performance Tracks Basics',
    title: 'Performance Tracks Basics',
    description: 'Poznaj ścieżki wydajności i metryki w React.',
    emoji: '📈',
    color: 'kangur-gradient-accent-teal',
    activeBg: 'bg-teal-500',
  },
  webdev_react_lints: {
    componentId: 'webdev_react_lints',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Lint Basics',
    title: 'Lint Basics',
    description: 'Poznaj podstawowe zasady lintingu w React.',
    emoji: '🧹',
    color: 'kangur-gradient-accent-rose',
    activeBg: 'bg-rose-500',
  },
  webdev_react_rules: {
    componentId: 'webdev_react_rules',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Rules Of React Basics',
    title: 'Rules Of React Basics',
    description: 'Poznaj najważniejsze zasady Reacta i dobre praktyki.',
    emoji: '📜',
    color: 'kangur-gradient-accent-indigo',
    activeBg: 'bg-indigo-500',
  },
  webdev_react_server_components: {
    componentId: 'webdev_react_server_components',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Server Component Basics',
    title: 'Server Component Basics',
    description: 'Poznaj Server Components i podział na Server/Client.',
    emoji: '🖥️',
    color: 'kangur-gradient-accent-emerald',
    activeBg: 'bg-emerald-500',
  },
  webdev_react_server_functions: {
    componentId: 'webdev_react_server_functions',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Server Functions Basics',
    title: 'Server Functions Basics',
    description: 'Poznaj Server Functions i bezpieczne akcje po stronie serwera.',
    emoji: '🧪',
    color: 'kangur-gradient-accent-violet',
    activeBg: 'bg-violet-500',
  },
  webdev_react_server_directives: {
    componentId: 'webdev_react_server_directives',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Server Directives Basics',
    title: 'Server Directives Basics',
    description: 'Poznaj dyrektywy serwerowe i granice kodu.',
    emoji: '🧭',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
  webdev_react_router: {
    componentId: 'webdev_react_router',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'React Router Basics',
    title: 'React Router Basics',
    description: 'Poznaj podstawy routingu w React.',
    emoji: '🧭',
    color: 'kangur-gradient-accent-teal',
    activeBg: 'bg-teal-500',
  },
  webdev_react_setup: {
    componentId: 'webdev_react_setup',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Setup Basics',
    title: 'Setup Basics',
    description: 'Poznaj podstawy konfiguracji i uruchomienia React.',
    emoji: '📦',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  webdev_react_state_management: {
    componentId: 'webdev_react_state_management',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Managing State Basics',
    title: 'Managing State Basics',
    description: 'Poznaj podstawy zarządzania stanem w React.',
    emoji: '🗃️',
    color: 'kangur-gradient-accent-indigo',
    activeBg: 'bg-indigo-500',
  },
  webdev_js_basics: {
    componentId: 'webdev_js_basics',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'JavaScript First Steps',
    title: 'JavaScript First Steps',
    description:
      'Learn JavaScript values, variables, operators, strings, arrays, conditionals, and loops using the MDN JavaScript learning path.',
    emoji: '📜',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  webdev_js_syntax: {
    componentId: 'webdev_js_syntax',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Syntax, Types & Data',
    title: 'Syntax, Types & Data',
    description:
      'Study JavaScript grammar, primitive and object types, strict equality, type checks, arrays, maps, sets, and strict mode.',
    emoji: '🔎',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
  webdev_js_dom: {
    componentId: 'webdev_js_dom',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Browser APIs & DOM',
    title: 'Browser APIs & DOM',
    description:
      'Use JavaScript in the browser with DOM selection, events, forms, fetch, storage, and common client-side Web APIs.',
    emoji: '🖱️',
    color: 'kangur-gradient-accent-emerald',
    activeBg: 'bg-emerald-500',
  },
  webdev_js_es6: {
    componentId: 'webdev_js_es6',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Functions, Objects & Modules',
    title: 'Functions, Objects & Modules',
    description:
      'Practice first-class functions, closures, objects, prototypes, classes, iterators, and JavaScript modules.',
    emoji: '🧩',
    color: 'kangur-gradient-accent-indigo',
    activeBg: 'bg-indigo-500',
  },
  webdev_js_async: {
    componentId: 'webdev_js_async',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Asynchronous JavaScript',
    title: 'Asynchronous JavaScript',
    description:
      'Learn callbacks, promises, async/await, try/catch, fetch flows, and non-blocking work in JavaScript.',
    emoji: '⏱️',
    color: 'kangur-gradient-accent-teal',
    activeBg: 'bg-teal-500',
  },
  webdev_js_tooling: {
    componentId: 'webdev_js_tooling',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'Reference & Debugging',
    title: 'Reference & Debugging',
    description:
      'Use MDN reference pages for built-ins, operators, statements, functions, classes, errors, regular expressions, and browser compatibility.',
    emoji: '🛠️',
    color: 'kangur-gradient-accent-rose',
    activeBg: 'bg-rose-500',
  },
};

export const WEB_DEVELOPMENT_LESSON_GROUPS = [
  {
    id: 'react',
    label: 'React 19.2',
    typeLabel: 'Section',
    subsections: [
      {
        id: 'component',
        label: 'Components',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_COMPONENTS_COMPONENT_IDS,
      },
      {
        id: 'components-react-dom',
        label: 'Components: React Dom',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_DOM_COMPONENTS_COMPONENT_IDS,
      },
      {
        id: 'hooks',
        label: 'Hooks',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_HOOKS_COMPONENT_IDS,
      },
      {
        id: 'hooks-react-dom',
        label: 'Hooks: React Dom',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_DOM_HOOKS_COMPONENT_IDS,
      },
      {
        id: 'apis',
        label: 'APIs',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_APIS_COMPONENT_IDS,
      },
      {
        id: 'apis-react-dom',
        label: 'APIs: React Dom',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_DOM_APIS_COMPONENT_IDS,
      },
      {
        id: 'client-apis-react-dom',
        label: 'Client APIs: React Dom',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_DOM_CLIENT_APIS_COMPONENT_IDS,
      },
      {
        id: 'server-apis-react-dom',
        label: 'Server APIs: React Dom',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_DOM_SERVER_APIS_COMPONENT_IDS,
      },
      {
        id: 'static-apis-react-dom',
        label: 'Static APIs: React Dom',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_DOM_STATIC_APIS_COMPONENT_IDS,
      },
      {
        id: 'react-compiler-configuration',
        label: 'React Compiler Configuration',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_COMPILER_CONFIG_COMPONENT_IDS,
      },
      {
        id: 'react-compiler-directives',
        label: 'React Compiler Directives',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_COMPILER_DIRECTIVES_COMPONENT_IDS,
      },
      {
        id: 'react-compiler-libraries',
        label: 'React Compiler Libraries',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_COMPILER_LIBRARIES_COMPONENT_IDS,
      },
      {
        id: 'performance-tracks',
        label: 'Performance Tracks',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_PERFORMANCE_TRACKS_COMPONENT_IDS,
      },
      {
        id: 'lints',
        label: 'Lints',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_LINTS_COMPONENT_IDS,
      },
      {
        id: 'rules-of-react',
        label: 'Rules Of React',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_RULES_COMPONENT_IDS,
      },
      {
        id: 'server-components',
        label: 'Server Components',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_SERVER_COMPONENTS_COMPONENT_IDS,
      },
      {
        id: 'server-functions',
        label: 'Server Functions',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_SERVER_FUNCTIONS_COMPONENT_IDS,
      },
      {
        id: 'server-directives',
        label: 'Server Directives',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_SERVER_DIRECTIVES_COMPONENT_IDS,
      },
      {
        id: 'react-router',
        label: 'React Router',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_ROUTER_COMPONENT_IDS,
      },
      {
        id: 'setup',
        label: 'Setup',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_SETUP_COMPONENT_IDS,
      },
      {
        id: 'managing-state',
        label: 'Managing State',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_STATE_MANAGEMENT_COMPONENT_IDS,
      },
    ],
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    typeLabel: 'Section',
    subsections: [
      {
        id: 'javascript-first-steps',
        label: 'First Steps',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_JS_BASICS_COMPONENT_IDS,
      },
      {
        id: 'javascript-syntax-types',
        label: 'Syntax, Types & Data',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_JS_SYNTAX_COMPONENT_IDS,
      },
      {
        id: 'javascript-browser-apis',
        label: 'Browser APIs & DOM',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_JS_DOM_COMPONENT_IDS,
      },
      {
        id: 'javascript-functions-objects-modules',
        label: 'Functions, Objects & Modules',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_JS_ES6_COMPONENT_IDS,
      },
      {
        id: 'javascript-async',
        label: 'Asynchronous JavaScript',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_JS_ASYNC_COMPONENT_IDS,
      },
      {
        id: 'javascript-reference-debugging',
        label: 'Reference & Debugging',
        typeLabel: 'Subsection',
        componentIds: WEB_DEVELOPMENT_JS_TOOLING_COMPONENT_IDS,
      },
    ],
  },
] as const;
