import { type ComponentType } from 'react';
import type { LessonProps } from '../lesson-ui-registry';
import dynamic from 'next/dynamic';

const loadLessonComponent = (loader: () => Promise<unknown>): ComponentType<LessonProps> =>
  dynamic<LessonProps>(
    async () => {
      const module = (await loader()) as { default: ComponentType<LessonProps> };
      return module.default;
    },
    { ssr: false }
  );

export const webdevLessons = {
  webdev_react_components: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactComponentsLesson')),
  webdev_react_dom_components: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactDomComponentsLesson')),
  webdev_react_hooks: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactHooksLesson')),
  webdev_react_apis: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactApisLesson')),
  webdev_react_dom_hooks: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactDomHooksLesson')),
  webdev_react_dom_apis: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactDomApisLesson')),
  webdev_react_dom_client_apis: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactDomClientApisLesson')),
  webdev_react_dom_server_apis: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactDomServerApisLesson')),
  webdev_react_dom_static_apis: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactDomStaticApisLesson')),
  webdev_react_compiler_config: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactCompilerConfigLesson')),
  webdev_react_compiler_directives: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactCompilerDirectivesLesson')),
  webdev_react_compiler_libraries: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactCompilerLibrariesLesson')),
  webdev_react_performance_tracks: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactPerformanceTracksLesson')),
  webdev_react_lints: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactLintsLesson')),
  webdev_react_rules: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactRulesLesson')),
  webdev_react_server_components: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactServerComponentsLesson')),
  webdev_react_server_functions: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactServerFunctionsLesson')),
  webdev_react_server_directives: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactServerDirectivesLesson')),
  webdev_react_router: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactRouterLesson')),
  webdev_react_setup: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactSetupLesson')),
  webdev_react_state_management: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentReactStateManagementLesson')),

  // JavaScript lessons
  webdev_js_basics: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentJavaScriptBasicsLesson')),
  webdev_js_syntax: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentJavaScriptSyntaxLesson')),
  webdev_js_dom: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentJavaScriptDomLesson')),
  webdev_js_es6: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentJavaScriptEs6Lesson')),
  webdev_js_async: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentJavaScriptAsyncLesson')),
  webdev_js_tooling: loadLessonComponent(() => import('@/features/kangur/ui/components/WebDevelopmentJavaScriptToolingLesson')),
};
