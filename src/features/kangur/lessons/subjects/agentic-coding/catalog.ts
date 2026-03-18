import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';

export const AGENTIC_CODING_LESSON_COMPONENT_ORDER = [
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
] as const satisfies readonly KangurLessonComponentId[];

type AgenticCodingLessonComponentId = (typeof AGENTIC_CODING_LESSON_COMPONENT_ORDER)[number];

const AGENTIC_CODING_FOUNDATIONS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_FIT_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_fit',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_SURFACES_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_surfaces',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_OPERATING_MODEL_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_operating_model',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_PROMPTING_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_prompting',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_RESPONSES_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_responses',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_AGENTS_MD_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_agents_md',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_APPROVALS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_approvals',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_SAFETY_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_safety',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_CONFIG_LAYERS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_config_layers',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_RULES_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_rules',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_WEB_CITATIONS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_web_citations',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_TOOLING_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_tooling',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_RESPONSE_CONTRACT_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_response_contract',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_AI_DOCUMENTATION_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_ai_documentation',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_DELEGATION_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_delegation',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_MODELS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_models',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_CLI_IDE_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_cli_ide',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_APP_WORKFLOWS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_app_workflows',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_SKILLS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_skills',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_MCP_INTEGRATIONS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_mcp_integrations',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_AUTOMATIONS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_automations',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_STATE_SCALE_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_state_scale',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_REVIEW_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_review',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_LONG_HORIZON_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_long_horizon',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_DOS_DONTS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_dos_donts',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_NON_ENGINEERS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_non_engineers',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_PROMPT_PATTERNS_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_prompt_patterns',
] as const satisfies readonly AgenticCodingLessonComponentId[];

const AGENTIC_CODING_ROLLOUT_COMPONENT_IDS = [
  'agentic_coding_codex_5_4_rollout',
] as const satisfies readonly AgenticCodingLessonComponentId[];

export const AGENTIC_CODING_LESSON_TEMPLATES: Record<
  AgenticCodingLessonComponentId,
  KangurLessonTemplate
> = {
  agentic_coding_codex_5_4: {
    componentId: 'agentic_coding_codex_5_4',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Foundations',
    title: 'Agentic Coding Foundations',
    description: 'Czym jest agentic coding i jak ustawić właściwy mindset.',
    emoji: '🤖',
    color: 'kangur-gradient-accent-indigo',
    activeBg: 'bg-indigo-500',
  },
  agentic_coding_codex_5_4_fit: {
    componentId: 'agentic_coding_codex_5_4_fit',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Fit & Limits',
    title: 'Fit & Limits',
    description: 'Gdzie Codex błyszczy, a gdzie wymaga ostrożności.',
    emoji: '🧭',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
  agentic_coding_codex_5_4_surfaces: {
    componentId: 'agentic_coding_codex_5_4_surfaces',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Surfaces',
    title: 'Codex Surfaces',
    description: 'CLI, IDE, Cloud i API - dobór właściwego środowiska.',
    emoji: '🧩',
    color: 'kangur-gradient-accent-emerald',
    activeBg: 'bg-emerald-500',
  },
  agentic_coding_codex_5_4_operating_model: {
    componentId: 'agentic_coding_codex_5_4_operating_model',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Operating Model',
    title: 'Operating Model',
    description: 'Goal/Context/Constraints/Done + plan, execution i weryfikacja.',
    emoji: '🔁',
    color: 'kangur-gradient-accent-violet',
    activeBg: 'bg-violet-500',
  },
  agentic_coding_codex_5_4_prompting: {
    componentId: 'agentic_coding_codex_5_4_prompting',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Prompting & Context',
    title: 'Prompting & Context',
    description: 'Kontekst, planowanie i krótsze prompty w praktyce.',
    emoji: '🎯',
    color: 'kangur-gradient-accent-rose',
    activeBg: 'bg-rose-500',
  },
  agentic_coding_codex_5_4_responses: {
    componentId: 'agentic_coding_codex_5_4_responses',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Responses & Tools',
    title: 'Responses & Tools',
    description: 'Responses API, tool calling i structured outputs w praktyce.',
    emoji: '📡',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
  agentic_coding_codex_5_4_agents_md: {
    componentId: 'agentic_coding_codex_5_4_agents_md',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'AGENTS.md',
    title: 'AGENTS.md Playbook',
    description: 'Repo rules, komendy i definicja Done w jednym miejscu.',
    emoji: '🗂️',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  agentic_coding_codex_5_4_approvals: {
    componentId: 'agentic_coding_codex_5_4_approvals',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Approvals & Network',
    title: 'Approvals & Network',
    description: 'Sandbox, approvals i kontrola dostępu do sieci.',
    emoji: '🔒',
    color: 'kangur-gradient-accent-slate',
    activeBg: 'bg-slate-500',
  },
  agentic_coding_codex_5_4_safety: {
    componentId: 'agentic_coding_codex_5_4_safety',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Config & Safety',
    title: 'Config & Safety',
    description: 'Uprawnienia, approvals i sandboxing bez ryzyka.',
    emoji: '🛡️',
    color: 'kangur-gradient-accent-slate',
    activeBg: 'bg-slate-500',
  },
  agentic_coding_codex_5_4_config_layers: {
    componentId: 'agentic_coding_codex_5_4_config_layers',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Config Layers',
    title: 'Config Layers & Profiles',
    description: 'Warstwy konfiguracji, profile i zaufanie projektu.',
    emoji: '⚙️',
    color: 'kangur-gradient-accent-slate',
    activeBg: 'bg-slate-500',
  },
  agentic_coding_codex_5_4_rules: {
    componentId: 'agentic_coding_codex_5_4_rules',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Rules & Execpolicy',
    title: 'Rules & Execpolicy',
    description: 'Allowlist komend, prefix rules i testowanie zasad.',
    emoji: '🧷',
    color: 'kangur-gradient-accent-violet',
    activeBg: 'bg-violet-500',
  },
  agentic_coding_codex_5_4_web_citations: {
    componentId: 'agentic_coding_codex_5_4_web_citations',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Web & Citations',
    title: 'Web & Citations',
    description: 'Kiedy szukać w sieci i jak cytować źródła.',
    emoji: '🌐',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
  agentic_coding_codex_5_4_tooling: {
    componentId: 'agentic_coding_codex_5_4_tooling',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Tooling & Search',
    title: 'Tooling & Search',
    description: 'Web search, file search, computer use i tool search.',
    emoji: '🛠️',
    color: 'kangur-gradient-accent-slate',
    activeBg: 'bg-slate-500',
  },
  agentic_coding_codex_5_4_response_contract: {
    componentId: 'agentic_coding_codex_5_4_response_contract',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Response Contract',
    title: 'Response Contract',
    description: 'Format odpowiedzi, listy i zasady cytowania.',
    emoji: '📐',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  agentic_coding_codex_5_4_ai_documentation: {
    componentId: 'agentic_coding_codex_5_4_ai_documentation',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'AI Documentation',
    title: 'AI Documentation',
    description: 'Hierarchia trosk, dowody i rollout w jednym formacie.',
    emoji: '📚',
    color: 'kangur-gradient-accent-emerald',
    activeBg: 'bg-emerald-500',
  },
  agentic_coding_codex_5_4_delegation: {
    componentId: 'agentic_coding_codex_5_4_delegation',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Delegation & Parallelism',
    title: 'Delegation & Parallelism',
    description: 'Sub-agenci, równoległość i kontrola scope.',
    emoji: '🤝',
    color: 'kangur-gradient-accent-violet',
    activeBg: 'bg-violet-500',
  },
  agentic_coding_codex_5_4_models: {
    componentId: 'agentic_coding_codex_5_4_models',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Models & Reasoning',
    title: 'Models & Reasoning',
    description: 'Dobór modeli i poziomów reasoning do typu zadania.',
    emoji: '🧠',
    color: 'kangur-gradient-accent-teal',
    activeBg: 'bg-teal-500',
  },
  agentic_coding_codex_5_4_cli_ide: {
    componentId: 'agentic_coding_codex_5_4_cli_ide',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'CLI & IDE',
    title: 'CLI & IDE Workflows',
    description: 'Skróty, komendy i najlepsze praktyki pracy w terminalu i edytorze.',
    emoji: '⌨️',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
  agentic_coding_codex_5_4_app_workflows: {
    componentId: 'agentic_coding_codex_5_4_app_workflows',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Codex App',
    title: 'Codex App Workflows',
    description: 'Worktrees, automations i Git tools w aplikacji.',
    emoji: '🧵',
    color: 'kangur-gradient-accent-teal',
    activeBg: 'bg-teal-500',
  },
  agentic_coding_codex_5_4_skills: {
    componentId: 'agentic_coding_codex_5_4_skills',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Skills & MCP',
    title: 'Skills, MCP, Automations',
    description: 'Od manualnego flow do Skills i automatyzacji.',
    emoji: '🧰',
    color: 'kangur-gradient-accent-emerald',
    activeBg: 'bg-emerald-500',
  },
  agentic_coding_codex_5_4_mcp_integrations: {
    componentId: 'agentic_coding_codex_5_4_mcp_integrations',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'MCP Integrations',
    title: 'MCP Integrations',
    description: 'Zewnętrzne narzędzia, kontekst i bezpieczne integracje.',
    emoji: '🔗',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
  agentic_coding_codex_5_4_automations: {
    componentId: 'agentic_coding_codex_5_4_automations',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Automations',
    title: 'Automation Playbook',
    description: 'Cadence, worktrees i sandbox dla pracy w tle.',
    emoji: '⏱️',
    color: 'kangur-gradient-accent-indigo',
    activeBg: 'bg-indigo-500',
  },
  agentic_coding_codex_5_4_state_scale: {
    componentId: 'agentic_coding_codex_5_4_state_scale',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'State & Scale',
    title: 'State & Scale',
    description: 'Conversation state, background mode, compaction i prompt caching.',
    emoji: '🗺️',
    color: 'kangur-gradient-accent-indigo',
    activeBg: 'bg-indigo-500',
  },
  agentic_coding_codex_5_4_review: {
    componentId: 'agentic_coding_codex_5_4_review',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Review & Verification',
    title: 'Review & Verification',
    description: 'Testy, diff review i checklisty jakości.',
    emoji: '🔍',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  agentic_coding_codex_5_4_long_horizon: {
    componentId: 'agentic_coding_codex_5_4_long_horizon',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Long-Horizon',
    title: 'Long-Horizon Work',
    description: 'Spec, milestone i kontrola dryfu w długich zadaniach.',
    emoji: '🛰️',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
  agentic_coding_codex_5_4_dos_donts: {
    componentId: 'agentic_coding_codex_5_4_dos_donts',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Do\'s & Don\'ts',
    title: 'Do\'s & Don\'ts',
    description: 'Najważniejsze zasady współpracy z agentem.',
    emoji: '✅',
    color: 'kangur-gradient-accent-violet',
    activeBg: 'bg-violet-500',
  },
  agentic_coding_codex_5_4_non_engineers: {
    componentId: 'agentic_coding_codex_5_4_non_engineers',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Non-Engineers',
    title: 'Non-Engineer Playbook',
    description: 'Jak delegować bez bycia full-time dev.',
    emoji: '👥',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  agentic_coding_codex_5_4_prompt_patterns: {
    componentId: 'agentic_coding_codex_5_4_prompt_patterns',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Prompt Patterns',
    title: 'Prompt Patterns',
    description: 'Szablony promptów dla bugfix, refactor i PR review.',
    emoji: '📝',
    color: 'kangur-gradient-accent-indigo',
    activeBg: 'bg-indigo-500',
  },
  agentic_coding_codex_5_4_rollout: {
    componentId: 'agentic_coding_codex_5_4_rollout',
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    label: 'Team Rollout',
    title: 'Team Rollout',
    description: 'Stopniowe wdrożenie Codex w zespole.',
    emoji: '🚀',
    color: 'kangur-gradient-accent-teal',
    activeBg: 'bg-teal-500',
  },
};

export const AGENTIC_CODING_LESSON_GROUPS = [
  {
    id: 'codex_5_4',
    label: 'Codex 5.4',
    typeLabel: 'Section',
    subsections: [
      {
        id: 'foundations',
        label: 'Foundations',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_FOUNDATIONS_COMPONENT_IDS,
      },
      {
        id: 'fit',
        label: 'Fit & Limits',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_FIT_COMPONENT_IDS,
      },
      {
        id: 'surfaces',
        label: 'Surfaces',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_SURFACES_COMPONENT_IDS,
      },
      {
        id: 'operating-model',
        label: 'Operating Model',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_OPERATING_MODEL_COMPONENT_IDS,
      },
      {
        id: 'prompting-context',
        label: 'Prompting & Context',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_PROMPTING_COMPONENT_IDS,
      },
      {
        id: 'responses-tools',
        label: 'Responses & Tools',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_RESPONSES_COMPONENT_IDS,
      },
      {
        id: 'agents-md',
        label: 'AGENTS.md',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_AGENTS_MD_COMPONENT_IDS,
      },
      {
        id: 'approvals-network',
        label: 'Approvals & Network',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_APPROVALS_COMPONENT_IDS,
      },
      {
        id: 'config-safety',
        label: 'Config & Safety',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_SAFETY_COMPONENT_IDS,
      },
      {
        id: 'config-layers',
        label: 'Config Layers',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_CONFIG_LAYERS_COMPONENT_IDS,
      },
      {
        id: 'rules-execpolicy',
        label: 'Rules & Execpolicy',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_RULES_COMPONENT_IDS,
      },
      {
        id: 'web-citations',
        label: 'Web & Citations',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_WEB_CITATIONS_COMPONENT_IDS,
      },
      {
        id: 'tooling-contract',
        label: 'Tooling & Search',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_TOOLING_COMPONENT_IDS,
      },
      {
        id: 'response-contract',
        label: 'Response Contract',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_RESPONSE_CONTRACT_COMPONENT_IDS,
      },
      {
        id: 'ai-documentation',
        label: 'AI Documentation',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_AI_DOCUMENTATION_COMPONENT_IDS,
      },
      {
        id: 'delegation-parallelism',
        label: 'Delegation & Parallelism',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_DELEGATION_COMPONENT_IDS,
      },
      {
        id: 'models',
        label: 'Models & Reasoning',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_MODELS_COMPONENT_IDS,
      },
      {
        id: 'cli-ide',
        label: 'CLI & IDE',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_CLI_IDE_COMPONENT_IDS,
      },
      {
        id: 'codex-app',
        label: 'Codex App',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_APP_WORKFLOWS_COMPONENT_IDS,
      },
      {
        id: 'skills-mcp',
        label: 'Skills, MCP, Automations',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_SKILLS_COMPONENT_IDS,
      },
      {
        id: 'mcp-integrations',
        label: 'MCP Integrations',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_MCP_INTEGRATIONS_COMPONENT_IDS,
      },
      {
        id: 'automations',
        label: 'Automations',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_AUTOMATIONS_COMPONENT_IDS,
      },
      {
        id: 'state-scale',
        label: 'State & Scale',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_STATE_SCALE_COMPONENT_IDS,
      },
      {
        id: 'review-verification',
        label: 'Review & Verification',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_REVIEW_COMPONENT_IDS,
      },
      {
        id: 'long-horizon',
        label: 'Long-Horizon Work',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_LONG_HORIZON_COMPONENT_IDS,
      },
      {
        id: 'dos-donts',
        label: 'Do\'s & Don\'ts',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_DOS_DONTS_COMPONENT_IDS,
      },
      {
        id: 'non-engineers',
        label: 'Non-Engineer Playbook',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_NON_ENGINEERS_COMPONENT_IDS,
      },
      {
        id: 'prompt-patterns',
        label: 'Prompt Patterns',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_PROMPT_PATTERNS_COMPONENT_IDS,
      },
      {
        id: 'rollout',
        label: 'Team Rollout',
        typeLabel: 'Subsection',
        componentIds: AGENTIC_CODING_ROLLOUT_COMPONENT_IDS,
      },
    ],
  },
] as const;
