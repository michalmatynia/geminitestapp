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

export const agenticLessons = {
  agentic_coding_codex_5_4: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54Lesson')),
  agentic_coding_codex_5_4_fit: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54FitLesson')),
  agentic_coding_codex_5_4_surfaces: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54SurfacesLesson')),
  agentic_coding_codex_5_4_operating_model: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54OperatingModelLesson')),
  agentic_coding_codex_5_4_prompting: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54PromptingLesson')),
  agentic_coding_codex_5_4_responses: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54ResponsesLesson')),
  agentic_coding_codex_5_4_agents_md: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54AgentsMdLesson')),
  agentic_coding_codex_5_4_approvals: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54ApprovalsLesson')),
  agentic_coding_codex_5_4_safety: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54SafetyLesson')),
  agentic_coding_codex_5_4_config_layers: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54ConfigLayersLesson')),
  agentic_coding_codex_5_4_rules: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54RulesLesson')),
  agentic_coding_codex_5_4_web_citations: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54WebCitationsLesson')),
  agentic_coding_codex_5_4_tooling: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54ToolingLesson')),
  agentic_coding_codex_5_4_response_contract: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54ResponseContractLesson')),
  agentic_coding_codex_5_4_ai_documentation: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54AiDocumentationLesson')),
  agentic_coding_codex_5_4_delegation: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54DelegationLesson')),
  agentic_coding_codex_5_4_models: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54ModelsLesson')),
  agentic_coding_codex_5_4_cli_ide: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54CliIdeLesson')),
  agentic_coding_codex_5_4_app_workflows: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54AppWorkflowsLesson')),
  agentic_coding_codex_5_4_skills: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54SkillsLesson')),
  agentic_coding_codex_5_4_mcp_integrations: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54McpIntegrationsLesson')),
  agentic_coding_codex_5_4_automations: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54AutomationsLesson')),
  agentic_coding_codex_5_4_state_scale: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54StateScaleLesson')),
  agentic_coding_codex_5_4_review: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54ReviewLesson')),
  agentic_coding_codex_5_4_long_horizon: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54LongHorizonLesson')),
  agentic_coding_codex_5_4_dos_donts: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54DosDontsLesson')),
  agentic_coding_codex_5_4_non_engineers: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54NonEngineersLesson')),
  agentic_coding_codex_5_4_prompt_patterns: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54PromptPatternsLesson')),
  agentic_coding_codex_5_4_rollout: loadLessonComponent(() => import('@/features/kangur/ui/components/AgenticCodingCodex54RolloutLesson')),
};
