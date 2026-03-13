'use client';

import {
  ArrowUpRightIcon,
  AudioLinesIcon,
  BotIcon,
  GaugeIcon,
  LogInIcon,
  RefreshCwIcon,
  Repeat2Icon,
  ShieldAlertIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, type JSX, type ReactNode, useCallback, useContext, useState } from 'react';

import {
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO,
  type KangurAiTutorPageCoverageEntry,
} from '@/features/kangur/ai-tutor-page-coverage-manifest';
import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import {
  useKangurKnowledgeGraphStatus,
  useKangurObservabilitySummary,
} from '@/features/kangur/observability/hooks';
import type {
  KangurAnalyticsCount,
  KangurKnowledgeGraphPreviewRequest,
  KangurKnowledgeGraphPreviewResponse,
  KangurRecentAnalyticsEvent,
  KangurKnowledgeGraphSemanticReadiness,
  KangurObservabilityAlert,
  KangurKnowledgeGraphStatusSnapshot,
  KangurObservabilityRange,
  KangurObservabilityStatus,
  KangurObservabilitySummary,
  KangurRouteHealth,
  KangurRouteMetrics,
} from '@/shared/contracts';
import {
  kangurKnowledgeGraphPreviewRequestSchema,
  kangurKnowledgeGraphPreviewResponseSchema,
  kangurKnowledgeGraphSyncResponseSchema,
  kangurObservabilityRangeSchema,
} from '@/shared/contracts';
import type {
  KangurAiTutorFocusKind,
  KangurAiTutorInteractionIntent,
  KangurAiTutorPromptMode,
  KangurAiTutorSurface,
} from '@/shared/contracts/kangur-ai-tutor';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/shared/contracts/kangur-knowledge-graph';
import { api } from '@/shared/lib/api-client';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  FormSection,
  Input,
  LoadingState,
  MetadataItem,
  SegmentedControl,
  StatusBadge,
  Textarea,
} from '@/shared/ui';

const RANGE_OPTIONS: Array<{ value: KangurObservabilityRange; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

const DEFAULT_KNOWLEDGE_GRAPH_PREVIEW_MESSAGE = 'Jak się zalogować do Kangura?';

type KnowledgeGraphPreviewSelectOption = {
  value: string;
  label: string;
  group?: string;
};

const KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS: Record<KangurAiTutorSurface, string> = {
  lesson: 'Lesson',
  test: 'Test',
  game: 'Game',
  profile: 'Learner Profile',
  parent_dashboard: 'Parent Dashboard',
  auth: 'Auth',
};

const KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_LABELS: Record<KangurAiTutorPromptMode, string> = {
  chat: 'Chat',
  hint: 'Hint',
  explain: 'Explain',
  selected_text: 'Selected text',
};

const KNOWLEDGE_GRAPH_PREVIEW_INTERACTION_INTENT_LABELS: Record<
  KangurAiTutorInteractionIntent,
  string
> = {
  hint: 'Hint',
  explain: 'Explain',
  review: 'Review',
  next_step: 'Next step',
};

const KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_LABELS: Record<KangurAiTutorFocusKind, string> = {
  selection: 'Selection',
  hero: 'Hero',
  screen: 'Screen',
  library: 'Library',
  empty_state: 'Empty state',
  navigation: 'Navigation',
  lesson_header: 'Lesson header',
  assignment: 'Assignment',
  document: 'Document',
  home_actions: 'Home actions',
  home_quest: 'Home quest',
  priority_assignments: 'Priority assignments',
  leaderboard: 'Leaderboard',
  progress: 'Progress',
  question: 'Question',
  review: 'Review',
  summary: 'Summary',
  login_action: 'Login action',
  create_account_action: 'Create account action',
  login_identifier_field: 'Login identifier field',
  login_form: 'Login form',
};

const KNOWLEDGE_GRAPH_PREVIEW_SURFACE_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze([
    { value: '', label: 'No surface context' },
    ...Object.entries(KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ]);

const KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze([
    { value: '', label: 'No prompt mode' },
    ...Object.entries(KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ]);

const KNOWLEDGE_GRAPH_PREVIEW_INTERACTION_INTENT_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze([
    { value: '', label: 'No interaction intent' },
    ...Object.entries(KNOWLEDGE_GRAPH_PREVIEW_INTERACTION_INTENT_LABELS).map(
      ([value, label]) => ({
        value,
        label,
      })
    ),
  ]);

const KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze([
    { value: '', label: 'No focus kind' },
    ...Object.entries(KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ]);

const KNOWLEDGE_GRAPH_PREVIEW_COVERAGE_PRESET_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze(
    KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map((entry) => ({
      value: entry.id,
      label: `${entry.screenKey} • ${entry.title}`,
      group: entry.pageKey,
    }))
  );

const KNOWLEDGE_GRAPH_PREVIEW_COVERAGE_ENTRY_BY_ID = new Map(
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map((entry) => [entry.id, entry] as const)
);

const KNOWLEDGE_GRAPH_PREVIEW_ANSWER_REVEALED_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze([
    { value: '', label: 'Unknown answer state' },
    { value: 'false', label: 'Answer still hidden' },
    { value: 'true', label: 'Answer revealed' },
  ]);

const KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_BY_SURFACE = new Map<
  KangurAiTutorSurface,
  Set<KangurAiTutorFocusKind>
>();

for (const entry of KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO) {
  if (!entry.surface || !entry.focusKind) {
    continue;
  }

  const surfaceFocusKinds =
    KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_BY_SURFACE.get(entry.surface) ?? new Set<KangurAiTutorFocusKind>();
  surfaceFocusKinds.add(entry.focusKind);
  KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_BY_SURFACE.set(entry.surface, surfaceFocusKinds);
}

const ROUTE_ENTRIES: Array<{
  key: keyof KangurRouteMetrics;
  label: string;
  description: string;
}> = [
  {
    key: 'authMeGet',
    label: 'Auth /me',
    description: 'Session hydration and learner context bootstrap.',
  },
  {
    key: 'learnerSignInPost',
    label: 'Learner Sign-in',
    description: 'Parent and learner credential handoff.',
  },
  {
    key: 'progressPatch',
    label: 'Progress Sync',
    description: 'Learner progress patches from the client runtime.',
  },
  {
    key: 'scoresPost',
    label: 'Score Create',
    description: 'Completed session and score persistence.',
  },
  {
    key: 'assignmentsPost',
    label: 'Assignment Create',
    description: 'Parent assignment creation and publishing.',
  },
  {
    key: 'learnersPost',
    label: 'Learner Create',
    description: 'Learner provisioning and ownership flows.',
  },
  {
    key: 'ttsPost',
    label: 'TTS Generate',
    description: 'Narration generation and fallback handling.',
  },
];

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat().format(value);
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatDuration = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat().format(value)} ms`;
};

const readKnowledgeGraphPreviewField = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

type KnowledgeGraphPreviewDraft = {
  latestUserMessage: string;
  replayEventId: string;
  sectionPresetId: string;
  surface: string;
  promptMode: string;
  interactionIntent: string;
  focusKind: string;
  focusId: string;
  focusLabel: string;
  contentId: string;
  questionId: string;
  assignmentId: string;
  answerRevealed: string;
  selectedText: string;
  title: string;
  description: string;
};

const createKnowledgeGraphPreviewDraft = (): KnowledgeGraphPreviewDraft => ({
  latestUserMessage: DEFAULT_KNOWLEDGE_GRAPH_PREVIEW_MESSAGE,
  replayEventId: '',
  sectionPresetId: '',
  surface: '',
  promptMode: '',
  interactionIntent: '',
  focusKind: '',
  focusId: '',
  focusLabel: '',
  contentId: '',
  questionId: '',
  assignmentId: '',
  answerRevealed: '',
  selectedText: '',
  title: '',
  description: '',
});

const resolveKnowledgeGraphPreviewPromptMode = (
  focusKind: KangurAiTutorPageCoverageEntry['focusKind']
): KangurAiTutorPromptMode =>
  focusKind === 'selection' ? 'selected_text' : 'explain';

const buildKnowledgeGraphPreviewPresetMessage = (
  entry: KangurAiTutorPageCoverageEntry
): string => {
  switch (entry.focusKind) {
    case 'selection':
      return `Wyjaśnij ten wybór: ${entry.title}`;
    case 'question':
      return `Wyjaśnij to pytanie: ${entry.title}`;
    case 'review':
      return `Wyjaśnij ten wynik: ${entry.title}`;
    case 'summary':
      return `Wyjaśnij to podsumowanie: ${entry.title}`;
    default:
      return `Wyjaśnij tę sekcję: ${entry.title}`;
  }
};

const resolveKnowledgeGraphPreviewContentId = (
  entry: KangurAiTutorPageCoverageEntry
): string => {
  if (entry.contentIdPrefixes.length !== 1) {
    return '';
  }

  const [contentIdPrefix] = entry.contentIdPrefixes;
  if (!contentIdPrefix || contentIdPrefix.endsWith(':')) {
    return '';
  }

  return contentIdPrefix;
};

const createKnowledgeGraphPreviewDraftFromCoverageEntry = (
  entry: KangurAiTutorPageCoverageEntry
): KnowledgeGraphPreviewDraft => ({
  latestUserMessage: buildKnowledgeGraphPreviewPresetMessage(entry),
  replayEventId: '',
  sectionPresetId: entry.id,
  surface: entry.surface ?? '',
  promptMode: resolveKnowledgeGraphPreviewPromptMode(entry.focusKind),
  interactionIntent: 'explain',
  focusKind: entry.focusKind ?? '',
  focusId: entry.anchorIdPrefix ?? '',
  focusLabel: entry.title,
  contentId: resolveKnowledgeGraphPreviewContentId(entry),
  questionId: '',
  assignmentId: '',
  answerRevealed: entry.focusKind === 'review' ? 'true' : '',
  selectedText: '',
  title: entry.title,
  description: '',
});

const clearKnowledgeGraphPreviewDraftContext = (
  current: KnowledgeGraphPreviewDraft
): KnowledgeGraphPreviewDraft => ({
  ...createKnowledgeGraphPreviewDraft(),
  latestUserMessage: current.latestUserMessage,
});

type KnowledgeGraphPreviewReplayCandidate = {
  id: string;
  eventName: string;
  ts: string;
  path: string;
  surface: string;
  promptMode: string;
  focusKind: string;
  focusLabel: string;
  latestUserMessage: string;
  draft: KnowledgeGraphPreviewDraft;
  option: KnowledgeGraphPreviewSelectOption;
};

const readKnowledgeGraphPreviewReplayString = (
  meta: Record<string, unknown> | null,
  key: string
): string => {
  if (!meta) {
    return '';
  }

  const value = meta[key];
  return typeof value === 'string' ? value.trim() : '';
};

const readKnowledgeGraphPreviewReplayBoolean = (
  meta: Record<string, unknown> | null,
  key: string
): boolean | null => {
  if (!meta) {
    return null;
  }

  const value = meta[key];
  return typeof value === 'boolean' ? value : null;
};

const resolveKnowledgeGraphPreviewCoveragePresetId = (input: {
  surface: string;
  focusKind: string;
  focusId: string;
}): string => {
  if (!input.surface || !input.focusKind || !input.focusId) {
    return '';
  }

  const match = KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.find(
    (entry) =>
      entry.surface === input.surface &&
      entry.focusKind === input.focusKind &&
      entry.anchorIdPrefix !== null &&
      input.focusId.startsWith(entry.anchorIdPrefix)
  );

  return match?.id ?? '';
};

const createKnowledgeGraphPreviewDraftFromReplayCandidate = (input: {
  eventId: string;
  latestUserMessage: string;
  surface: string;
  contentId: string;
  title: string;
  description: string;
  promptMode: string;
  interactionIntent: string;
  focusKind: string;
  focusId: string;
  focusLabel: string;
  questionId: string;
  assignmentId: string;
  answerRevealed: string;
  selectedText: string;
}): KnowledgeGraphPreviewDraft => ({
  latestUserMessage: input.latestUserMessage,
  sectionPresetId: resolveKnowledgeGraphPreviewCoveragePresetId({
    surface: input.surface,
    focusKind: input.focusKind,
    focusId: input.focusId,
  }),
  replayEventId: input.eventId,
  surface: input.surface,
  promptMode: input.promptMode,
  interactionIntent: input.interactionIntent,
  focusKind: input.focusKind,
  focusId: input.focusId,
  focusLabel: input.focusLabel,
  contentId: input.contentId,
  questionId: input.questionId,
  assignmentId: input.assignmentId,
  answerRevealed: input.answerRevealed,
  selectedText: input.selectedText,
  title: input.title,
  description: input.description,
});

const buildKnowledgeGraphPreviewReplayCandidates = (
  events: readonly KangurRecentAnalyticsEvent[]
): KnowledgeGraphPreviewReplayCandidate[] =>
  events
    .filter((event) =>
      event.name === 'kangur_ai_tutor_message_sent' ||
      event.name === 'kangur_ai_tutor_message_succeeded' ||
      event.name === 'kangur_ai_tutor_message_failed'
    )
    .map((event) => {
      const meta =
        event.meta && typeof event.meta === 'object' && !Array.isArray(event.meta)
          ? event.meta
          : null;
      const latestUserMessage = readKnowledgeGraphPreviewReplayString(meta, 'latestUserMessage');
      const surface = readKnowledgeGraphPreviewReplayString(meta, 'surface');
      const contentId = readKnowledgeGraphPreviewReplayString(meta, 'contentId');
      const title = readKnowledgeGraphPreviewReplayString(meta, 'title');
      const description = readKnowledgeGraphPreviewReplayString(meta, 'description');
      const promptMode = readKnowledgeGraphPreviewReplayString(meta, 'promptMode');
      const interactionIntent = readKnowledgeGraphPreviewReplayString(meta, 'interactionIntent');
      const focusKind = readKnowledgeGraphPreviewReplayString(meta, 'focusKind');
      const focusId = readKnowledgeGraphPreviewReplayString(meta, 'focusId');
      const focusLabel = readKnowledgeGraphPreviewReplayString(meta, 'focusLabel');
      const questionId = readKnowledgeGraphPreviewReplayString(meta, 'questionId');
      const assignmentId = readKnowledgeGraphPreviewReplayString(meta, 'assignmentId');
      const selectedText = readKnowledgeGraphPreviewReplayString(meta, 'selectedText');
      const answerRevealed = readKnowledgeGraphPreviewReplayBoolean(meta, 'answerRevealed');
      const displaySurface =
        surface && surface in KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS
          ? KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS[surface as KangurAiTutorSurface]
          : 'General';
      const displayPromptMode =
        promptMode && promptMode in KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_LABELS
          ? KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_LABELS[promptMode as KangurAiTutorPromptMode]
          : 'Chat';
      const displayTarget =
        focusLabel || title || selectedText || latestUserMessage.slice(0, 48) || event.path || event.id;
      const eventLabel =
        event.name === 'kangur_ai_tutor_message_sent'
          ? 'Sent'
          : event.name === 'kangur_ai_tutor_message_succeeded'
            ? 'Succeeded'
            : 'Failed';

      return {
        id: event.id,
        eventName: event.name ?? 'kangur_ai_tutor_message_sent',
        ts: event.ts,
        path: event.path,
        surface,
        promptMode,
        focusKind,
        focusLabel,
        latestUserMessage,
        draft: createKnowledgeGraphPreviewDraftFromReplayCandidate({
          eventId: event.id,
          latestUserMessage,
          surface,
          contentId,
          title,
          description,
          promptMode,
          interactionIntent,
          focusKind,
          focusId,
          focusLabel,
          questionId,
          assignmentId,
          answerRevealed:
            answerRevealed === null ? '' : answerRevealed ? 'true' : 'false',
          selectedText,
        }),
        option: {
          value: event.id,
          label: `${eventLabel} • ${displaySurface} • ${displayPromptMode} • ${displayTarget}`,
          group: 'Recent AI Tutor messages',
        },
      };
    })
    .filter((candidate) => candidate.latestUserMessage.length > 0);

const getKnowledgeGraphPreviewFocusKindOptions = (
  surface: string
): readonly KnowledgeGraphPreviewSelectOption[] => {
  const parsedSurface = surface.trim() as KangurAiTutorSurface;
  const availableFocusKinds = KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_BY_SURFACE.get(parsedSurface);

  if (!availableFocusKinds) {
    return KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_OPTIONS;
  }

  return [
    KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_OPTIONS[0]!,
    ...KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_OPTIONS.filter(
      (option) =>
        option.value !== '' && availableFocusKinds.has(option.value as KangurAiTutorFocusKind)
    ),
  ];
};

const isKnowledgeGraphPreviewFocusKindAllowed = (
  surface: string,
  focusKind: string
): boolean => {
  if (!focusKind.trim()) {
    return true;
  }

  const parsedSurface = surface.trim() as KangurAiTutorSurface;
  const availableFocusKinds = KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_BY_SURFACE.get(parsedSurface);
  if (!availableFocusKinds) {
    return true;
  }

  return availableFocusKinds.has(focusKind as KangurAiTutorFocusKind);
};

const buildKnowledgeGraphPreviewRequest = (input: {
  draft: KnowledgeGraphPreviewDraft;
  locale: string;
}): KangurKnowledgeGraphPreviewRequest => {
  const latestUserMessage = input.draft.latestUserMessage.trim();
  const surface = readKnowledgeGraphPreviewField(input.draft.surface);
  const promptMode = readKnowledgeGraphPreviewField(input.draft.promptMode);
  const interactionIntent = readKnowledgeGraphPreviewField(input.draft.interactionIntent);
  const focusKind = readKnowledgeGraphPreviewField(input.draft.focusKind);
  const focusId = readKnowledgeGraphPreviewField(input.draft.focusId);
  const focusLabel = readKnowledgeGraphPreviewField(input.draft.focusLabel);
  const contentId = readKnowledgeGraphPreviewField(input.draft.contentId);
  const questionId = readKnowledgeGraphPreviewField(input.draft.questionId);
  const assignmentId = readKnowledgeGraphPreviewField(input.draft.assignmentId);
  const answerRevealed =
    input.draft.answerRevealed === 'true'
      ? true
      : input.draft.answerRevealed === 'false'
        ? false
        : undefined;
  const selectedText = readKnowledgeGraphPreviewField(input.draft.selectedText);
  const title = readKnowledgeGraphPreviewField(input.draft.title);
  const description = readKnowledgeGraphPreviewField(input.draft.description);
  const hasContextDetails = Boolean(
    promptMode ||
      interactionIntent ||
      focusKind ||
      focusId ||
      focusLabel ||
      contentId ||
      questionId ||
      assignmentId ||
      answerRevealed !== undefined ||
      selectedText ||
      title ||
      description
  );

  if (!surface && hasContextDetails) {
    throw new Error('Choose a surface before adding section-aware preview context.');
  }

  const parsed = kangurKnowledgeGraphPreviewRequestSchema.safeParse({
    latestUserMessage,
    locale: input.locale,
    ...(surface
      ? {
          context: {
            surface,
            ...(promptMode ? { promptMode } : {}),
            ...(interactionIntent ? { interactionIntent } : {}),
            ...(focusKind ? { focusKind } : {}),
            ...(focusId ? { focusId } : {}),
            ...(focusLabel ? { focusLabel } : {}),
            ...(contentId ? { contentId } : {}),
            ...(questionId ? { questionId } : {}),
            ...(assignmentId ? { assignmentId } : {}),
            ...(answerRevealed !== undefined ? { answerRevealed } : {}),
            ...(selectedText ? { selectedText } : {}),
            ...(title ? { title } : {}),
            ...(description ? { description } : {}),
          },
        }
      : {}),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid knowledge graph preview input.');
  }

  return parsed.data;
};

const formatKnowledgeGraphReadiness = (
  readiness: KangurKnowledgeGraphSemanticReadiness
): string => {
  switch (readiness) {
    case 'no_graph':
      return 'No graph';
    case 'no_semantic_text':
      return 'No semantic text';
    case 'metadata_only':
      return 'Metadata only';
    case 'embeddings_without_index':
      return 'Embeddings without index';
    case 'vector_index_pending':
      return 'Vector index pending';
    case 'vector_ready':
      return 'Vector ready';
    default:
      return readiness;
  }
};

const resolveKnowledgeGraphBadgeStatus = (
  status: KangurKnowledgeGraphStatusSnapshot
): 'ok' | 'warning' | 'critical' | 'insufficient_data' => {
  if (status.mode === 'disabled') {
    return 'insufficient_data';
  }

  if (status.mode === 'error') {
    return 'critical';
  }

  switch (status.semanticReadiness) {
    case 'vector_ready':
      return 'ok';
    case 'metadata_only':
    case 'embeddings_without_index':
    case 'vector_index_pending':
      return 'warning';
    case 'no_graph':
    case 'no_semantic_text':
      return 'critical';
    default:
      return 'insufficient_data';
  }
};

const describeKnowledgeGraphStatus = (
  status: Extract<KangurKnowledgeGraphStatusSnapshot, { mode: 'status' }>
): string => {
  switch (status.semanticReadiness) {
    case 'vector_ready':
      return 'Neo4j has semantic text, embeddings, and an online vector index for Kangur Tutor retrieval.';
    case 'vector_index_pending':
      return 'Embeddings are present, but the Neo4j vector index is still building or unavailable.';
    case 'embeddings_without_index':
      return 'Embeddings are stored on Kangur knowledge nodes, but the Neo4j vector index is missing.';
    case 'metadata_only':
      return 'The graph has semantic text but no embeddings yet, so Tutor retrieval is limited to metadata matching.';
    case 'no_semantic_text':
      return 'The graph is present, but semantic text has not been populated on Kangur knowledge nodes.';
    case 'no_graph':
      return 'Neo4j does not currently contain the Kangur knowledge graph snapshot.';
    default:
      return 'Kangur graph status is available.';
  }
};

const resolveKnowledgeGraphPreviewBadgeStatus = (
  status: KangurKnowledgeGraphPreviewResponse['retrieval']['status']
): 'ok' | 'warning' | 'critical' | 'insufficient_data' => {
  switch (status) {
    case 'hit':
      return 'ok';
    case 'miss':
      return 'warning';
    case 'disabled':
    case 'skipped':
      return 'insufficient_data';
    default:
      return 'critical';
  }
};

function KnowledgeGraphPreviewValueBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className='space-y-1'>
      <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'>
        {label}
      </div>
      <div className='rounded-2xl border border-border/60 bg-card/30 px-3 py-2 font-mono text-xs text-gray-200'>
        {value || '—'}
      </div>
    </div>
  );
}

function KnowledgeGraphPreviewSelect({
  id,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly KnowledgeGraphPreviewSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
}): JSX.Element {
  const groupedOptions = new Map<string, KnowledgeGraphPreviewSelectOption[]>();

  options.forEach((option) => {
    const groupKey = option.group ?? '__ungrouped__';
    const groupOptions = groupedOptions.get(groupKey) ?? [];
    groupOptions.push(option);
    groupedOptions.set(groupKey, groupOptions);
  });

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className='h-10 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
    >
      <option value=''>{placeholder}</option>
      {Array.from(groupedOptions.entries()).map(([groupKey, groupOptions]) =>
        groupKey === '__ungrouped__' ? (
          groupOptions
            .filter((option) => option.value !== '')
            .map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
        ) : (
          <optgroup key={groupKey} label={groupKey}>
            {groupOptions
              .filter((option) => option.value !== '')
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </optgroup>
        )
      )}
    </select>
  );
}

function KnowledgeGraphQueryPreviewSection({
  draft,
  result,
  error,
  isRunning,
  replayCandidates,
  onDraftChange,
  onApplyReplayEvent,
  onApplySectionPreset,
  onClearContext,
  onRun,
}: {
  draft: KnowledgeGraphPreviewDraft;
  result: KangurKnowledgeGraphPreviewResponse | null;
  error: string | null;
  isRunning: boolean;
  replayCandidates: readonly KnowledgeGraphPreviewReplayCandidate[];
  onDraftChange: (field: keyof KnowledgeGraphPreviewDraft, value: string) => void;
  onApplyReplayEvent: (eventId: string) => void;
  onApplySectionPreset: (entryId: string) => void;
  onClearContext: () => void;
  onRun: () => void;
}): JSX.Element {
  const previewStatus = result ? resolveKnowledgeGraphPreviewBadgeStatus(result.retrieval.status) : null;
  const topHits =
    result?.retrieval.status === 'hit' ? result.retrieval.hits.slice(0, 4) : [];
  const replayOptions = replayCandidates.map((candidate) => candidate.option);
  const selectedReplayCandidate = draft.replayEventId
    ? (replayCandidates.find((candidate) => candidate.id === draft.replayEventId) ?? null)
    : null;
  const selectedCoverageEntry = draft.sectionPresetId
    ? (KNOWLEDGE_GRAPH_PREVIEW_COVERAGE_ENTRY_BY_ID.get(draft.sectionPresetId) ?? null)
    : null;
  const focusKindOptions = getKnowledgeGraphPreviewFocusKindOptions(draft.surface);

  return (
    <div id='knowledge-graph-query-preview'>
      <FormSection title='Knowledge Graph Query Preview' variant='subtle'>
        <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
          <div className='grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <div className='text-sm font-semibold text-white'>Run an admin graph preview</div>
                <p className='text-xs leading-relaxed text-gray-400'>
                  Leave context blank for a pure message lookup, or pick a coverage-backed section
                  preset to preview the exact tutor surface metadata the app already ships.
                </p>
              </div>

              <div className='space-y-2'>
                <label
                  htmlFor='knowledge-graph-preview-message'
                  className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-400'
                >
                  Preview prompt
                </label>
                <Textarea
                  id='knowledge-graph-preview-message'
                  value={draft.latestUserMessage}
                  onChange={(event) => onDraftChange('latestUserMessage', event.target.value)}
                  rows={3}
                  placeholder='Jak się zalogować do Kangura?'
                />
              </div>

              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                <div className='space-y-2 xl:col-span-3'>
                  <label
                    htmlFor='knowledge-graph-preview-replay-event'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Recent tutor event
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-replay-event'
                    value={draft.replayEventId}
                    options={replayOptions}
                    placeholder='Pick a recent AI Tutor message event'
                    onChange={onApplyReplayEvent}
                  />
                  <p className='text-[11px] leading-relaxed text-gray-500'>
                    Replays the prompt and context recorded by recent learner-facing Tutor
                    telemetry.
                  </p>
                </div>
                <div className='space-y-2 xl:col-span-3'>
                  <label
                    htmlFor='knowledge-graph-preview-section-preset'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Section preset
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-section-preset'
                    value={draft.sectionPresetId}
                    options={KNOWLEDGE_GRAPH_PREVIEW_COVERAGE_PRESET_OPTIONS}
                    placeholder='Pick a coverage-backed UI section'
                    onChange={onApplySectionPreset}
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-surface'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Surface
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-surface'
                    value={draft.surface}
                    options={KNOWLEDGE_GRAPH_PREVIEW_SURFACE_OPTIONS}
                    placeholder='No surface context'
                    onChange={(value) => onDraftChange('surface', value)}
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-prompt-mode'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Prompt mode
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-prompt-mode'
                    value={draft.promptMode}
                    options={KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_OPTIONS}
                    placeholder='No prompt mode'
                    onChange={(value) => onDraftChange('promptMode', value)}
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-interaction-intent'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Interaction intent
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-interaction-intent'
                    value={draft.interactionIntent}
                    options={KNOWLEDGE_GRAPH_PREVIEW_INTERACTION_INTENT_OPTIONS}
                    placeholder='No interaction intent'
                    onChange={(value) => onDraftChange('interactionIntent', value)}
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-focus-kind'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Focus kind
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-focus-kind'
                    value={draft.focusKind}
                    options={focusKindOptions}
                    placeholder='No focus kind'
                    onChange={(value) => onDraftChange('focusKind', value)}
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-content-id'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Content id
                  </label>
                  <Input
                    id='knowledge-graph-preview-content-id'
                    value={draft.contentId}
                    onChange={(event) => onDraftChange('contentId', event.target.value)}
                    placeholder='game:home or lesson-1'
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-focus-id'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Focus id
                  </label>
                  <Input
                    id='knowledge-graph-preview-focus-id'
                    value={draft.focusId}
                    onChange={(event) => onDraftChange('focusId', event.target.value)}
                    placeholder='kangur-game-result-leaderboard'
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-focus-label'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Focus label
                  </label>
                  <Input
                    id='knowledge-graph-preview-focus-label'
                    value={draft.focusLabel}
                    onChange={(event) => onDraftChange('focusLabel', event.target.value)}
                    placeholder='Ranking wyników'
                  />
                </div>
                <div className='space-y-2 xl:col-span-2'>
                  <label
                    htmlFor='knowledge-graph-preview-title'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Title
                  </label>
                  <Input
                    id='knowledge-graph-preview-title'
                    value={draft.title}
                    onChange={(event) => onDraftChange('title', event.target.value)}
                    placeholder='Podsumowanie gry'
                  />
                </div>
              </div>

            {selectedReplayCandidate ? (
              <Card variant='subtle' padding='sm' className='border-border/60 bg-card/30'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
                      Replay source
                    </div>
                    <div className='text-sm font-semibold text-white'>
                      {selectedReplayCandidate.latestUserMessage}
                    </div>
                    <p className='text-xs leading-relaxed text-gray-400'>
                      {selectedReplayCandidate.path || 'Kangur AI Tutor event'}
                    </p>
                  </div>
                  <StatusBadge status='info' label={formatDateTime(selectedReplayCandidate.ts)} />
                </div>

                <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                  <MetadataItem
                    label='Event'
                    value={selectedReplayCandidate.eventName}
                    variant='minimal'
                  />
                  <MetadataItem
                    label='Surface'
                    value={
                      selectedReplayCandidate.surface
                        ? KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS[
                            selectedReplayCandidate.surface as KangurAiTutorSurface
                          ] ?? selectedReplayCandidate.surface
                        : '—'
                    }
                    variant='minimal'
                  />
                  <MetadataItem
                    label='Prompt mode'
                    value={
                      selectedReplayCandidate.promptMode
                        ? KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_LABELS[
                            selectedReplayCandidate.promptMode as KangurAiTutorPromptMode
                          ] ?? selectedReplayCandidate.promptMode
                        : '—'
                    }
                    variant='minimal'
                  />
                  <MetadataItem
                    label='Focus'
                    value={selectedReplayCandidate.focusLabel || selectedReplayCandidate.focusKind || '—'}
                    variant='minimal'
                  />
                </div>
              </Card>
            ) : replayCandidates.length === 0 ? (
              <Alert variant='info'>
                No recent `kangur_ai_tutor_message_*` events with replayable prompt data were found
                in the selected observability window.
              </Alert>
            ) : null}

            {selectedCoverageEntry ? (
              <Card variant='subtle' padding='sm' className='border-border/60 bg-card/30'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
                      Coverage preset
                    </div>
                    <div className='text-sm font-semibold text-white'>
                      {selectedCoverageEntry.title}
                    </div>
                    <p className='text-xs leading-relaxed text-gray-400'>
                      {selectedCoverageEntry.notes}
                    </p>
                  </div>
                  <StatusBadge
                    status='info'
                    label={
                      selectedCoverageEntry.surface
                        ? KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS[selectedCoverageEntry.surface]
                        : 'Shared'
                    }
                  />
                </div>

                <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                  <MetadataItem
                    label='Screen'
                    value={selectedCoverageEntry.screenKey}
                    variant='minimal'
                  />
                  <MetadataItem
                    label='Widget'
                    value={selectedCoverageEntry.widget}
                    variant='minimal'
                  />
                  <MetadataItem
                    label='Anchor prefix'
                    value={selectedCoverageEntry.anchorIdPrefix ?? '—'}
                    variant='minimal'
                    mono
                  />
                  <MetadataItem
                    label='Content ids'
                    value={selectedCoverageEntry.contentIdPrefixes.join(', ') || '—'}
                    variant='minimal'
                    mono
                  />
                </div>
              </Card>
            ) : null}

            <div className='grid gap-3 lg:grid-cols-2'>
              <div className='space-y-2'>
                <label
                  htmlFor='knowledge-graph-preview-question-id'
                  className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                >
                  Question id
                </label>
                <Input
                  id='knowledge-graph-preview-question-id'
                  value={draft.questionId}
                  onChange={(event) => onDraftChange('questionId', event.target.value)}
                  placeholder='question-1'
                />
              </div>
              <div className='space-y-2'>
                <label
                  htmlFor='knowledge-graph-preview-assignment-id'
                  className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                >
                  Assignment id
                </label>
                <Input
                  id='knowledge-graph-preview-assignment-id'
                  value={draft.assignmentId}
                  onChange={(event) => onDraftChange('assignmentId', event.target.value)}
                  placeholder='assignment-42'
                />
              </div>
            </div>

            <div className='grid gap-3 lg:grid-cols-2'>
              <div className='space-y-2'>
                <label
                  htmlFor='knowledge-graph-preview-answer-revealed'
                  className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                >
                  Answer state
                </label>
                <KnowledgeGraphPreviewSelect
                  id='knowledge-graph-preview-answer-revealed'
                  value={draft.answerRevealed}
                  options={KNOWLEDGE_GRAPH_PREVIEW_ANSWER_REVEALED_OPTIONS}
                  placeholder='Unknown answer state'
                  onChange={(value) => onDraftChange('answerRevealed', value)}
                />
              </div>
            </div>

            <div className='grid gap-3 lg:grid-cols-2'>
              <div className='space-y-2'>
                <label
                  htmlFor='knowledge-graph-preview-selected-text'
                  className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                >
                  Selected text
                </label>
                <Textarea
                  id='knowledge-graph-preview-selected-text'
                  value={draft.selectedText}
                  onChange={(event) => onDraftChange('selectedText', event.target.value)}
                  rows={2}
                  placeholder='Ranking wyników'
                />
              </div>
              <div className='space-y-2'>
                <label
                  htmlFor='knowledge-graph-preview-description'
                  className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                >
                  Description
                </label>
                <Textarea
                  id='knowledge-graph-preview-description'
                  value={draft.description}
                  onChange={(event) => onDraftChange('description', event.target.value)}
                  rows={2}
                  placeholder='Krótki opis sekcji lub widoku.'
                />
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <Button variant='outline' onClick={onRun} disabled={isRunning}>
                {isRunning ? 'Running graph preview...' : 'Run graph preview'}
              </Button>
              <Button variant='ghost' onClick={onClearContext} disabled={isRunning}>
                Clear context
              </Button>
              <div className='text-[11px] leading-relaxed text-gray-500'>
                Accepted context fields use the same schema as tutor chat requests. Section presets
                fill prompt mode, surface, focus metadata, and exact content ids when the coverage
                manifest has one.
              </div>
            </div>
          </div>

          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-3'>
              <div className='text-sm font-semibold text-white'>Latest preview result</div>
              {previewStatus ? <StatusBadge status={previewStatus} /> : null}
            </div>

            {error ? <Alert variant='warning'>{error}</Alert> : null}

            {!result ? (
              <EmptyState
                title='No graph preview yet'
                description='Run a preview query to inspect the raw seed, normalized lookup text, tokens, and top graph hits.'
                variant='compact'
              />
            ) : (
              <div className='space-y-4'>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <MetadataItem label='Status' value={result.retrieval.status} variant='card' />
                  <MetadataItem label='Mode' value={result.summary.queryMode ?? '—'} variant='card' />
                  <MetadataItem label='Recall' value={result.summary.recallStrategy ?? '—'} variant='card' />
                  <MetadataItem label='Tokens' value={formatNumber(result.summary.tokenCount)} variant='card' />
                  <MetadataItem label='Nodes' value={formatNumber(result.summary.nodeCount)} variant='card' />
                  <MetadataItem label='Sources' value={formatNumber(result.summary.sourceCount)} variant='card' />
                </div>

                <KnowledgeGraphPreviewValueBlock
                  label='Raw query seed'
                  value={result.retrieval.querySeed}
                />
                <KnowledgeGraphPreviewValueBlock
                  label='Normalized query seed'
                  value={result.summary.normalizedQuerySeed}
                />
                <KnowledgeGraphPreviewValueBlock
                  label='Tokens'
                  value={result.retrieval.tokens.join(', ')}
                />

                {result.retrieval.status === 'hit' ? (
                  <>
                    <MetadataItem
                      label='Website Target Node'
                      value={result.summary.websiteHelpTargetNodeId ?? '—'}
                      variant='card'
                      mono
                    />
                    {topHits.length > 0 ? (
                      <div className='space-y-2'>
                        <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'>
                          Top hits
                        </div>
                        <div className='space-y-2'>
                          {topHits.map((hit) => (
                            <Card
                              key={hit.id}
                              variant='subtle'
                              padding='sm'
                              className='border-border/60 bg-card/30'
                            >
                              <div className='flex items-start justify-between gap-3'>
                                <div className='min-w-0 space-y-1'>
                                  <div className='text-sm font-semibold text-white'>
                                    {hit.canonicalTitle}
                                  </div>
                                  <div className='text-xs text-gray-400'>
                                    {[hit.kind, hit.canonicalSourceCollection, hit.hydrationSource]
                                      .filter(Boolean)
                                      .join(' • ')}
                                  </div>
                                  {(hit.route || hit.anchorId) && (
                                    <div className='font-mono text-[11px] text-gray-500'>
                                      {[hit.route, hit.anchorId].filter(Boolean).join(' • ')}
                                    </div>
                                  )}
                                </div>
                                <StatusBadge status='info' label={formatNumber(hit.semanticScore)} />
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            )}
            </div>
          </div>
        </Card>
      </FormSection>
    </div>
  );
}

const buildSystemLogsHref = (input: {
  query?: string;
  source?: string;
  from?: string;
  to?: string;
}): string => {
  const params = new URLSearchParams();
  if (input.query) params.set('query', input.query);
  if (input.source) params.set('source', input.source);
  if (input.from) params.set('from', input.from);
  if (input.to) params.set('to', input.to);
  const query = params.toString();
  return query ? `/admin/system/logs?${query}` : '/admin/system/logs';
};

const resolveObservabilityAlertVariant = (
  status: KangurObservabilityStatus
): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'ok':
      return 'success';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'error';
    case 'insufficient_data':
    default:
      return 'info';
  }
};

const formatKnowledgeGraphFreshnessValue = (
  alert: KangurObservabilityAlert | undefined
): string => {
  if (!alert) {
    return '—';
  }

  if (alert.status === 'ok') {
    return 'Current';
  }

  if (typeof alert.value === 'number' && Number.isFinite(alert.value)) {
    return `${alert.value.toFixed(1)} h lag`;
  }

  return alert.status === 'insufficient_data' ? 'Awaiting data' : 'Unknown';
};

const ObservabilitySummaryContext = createContext<{
  range: KangurObservabilityRange;
  summary: KangurObservabilitySummary;
} | null>(null);

const useObservabilitySummaryContext = () => {
  const value = useContext(ObservabilitySummaryContext);
  if (!value) {
    throw new Error('Observability summary context is unavailable.');
  }
  return value;
};

function MetricCard({
  title,
  value,
  hint,
  icon,
  alert,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  alert?: KangurObservabilityAlert | undefined;
}): JSX.Element {
  const alertStatus = alert?.status;

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-2'>
          <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400'>
            {icon}
            <span>{title}</span>
          </div>
          <div className='text-2xl font-semibold text-white'>{value}</div>
        </div>
        {alertStatus ? <StatusBadge status={alertStatus} /> : null}
      </div>
      <p className='mt-3 text-xs leading-relaxed text-gray-400'>{hint}</p>
    </Card>
  );
}

function RouteMetricCard({
  label,
  description,
  route,
}: {
  label: string;
  description: string;
  route: KangurRouteHealth;
}): JSX.Element {
  const metrics = route.metrics;
  const latency = route.latency;
  const errorCount = metrics?.levels.error ?? 0;
  const totalCount = metrics?.total ?? 0;
  const topPath = metrics?.topPaths[0]?.path ?? '—';
  const p95DurationMs = latency?.p95DurationMs ?? null;
  const slowThresholdMs = latency?.slowThresholdMs ?? null;
  const status =
    metrics === null && latency === null
      ? 'insufficient_data'
      : errorCount > 0
        ? 'warning'
        : p95DurationMs !== null && slowThresholdMs !== null && p95DurationMs >= slowThresholdMs * 2
          ? 'critical'
          : p95DurationMs !== null && slowThresholdMs !== null && p95DurationMs >= slowThresholdMs
            ? 'warning'
            : totalCount > 0 || (latency?.sampleSize ?? 0) > 0
              ? 'ok'
              : 'insufficient_data';

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-sm font-semibold text-white'>{label}</div>
          <p className='mt-1 text-xs leading-relaxed text-gray-400'>{description}</p>
        </div>
        <div className='flex items-center gap-2'>
          <StatusBadge status={status} />
          <Button asChild variant='ghost' size='sm'>
            <Link href={route.investigation.href}>
              Logs
              <ArrowUpRightIcon className='size-3.5' />
            </Link>
          </Button>
        </div>
      </div>

      <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        <MetadataItem label='Requests' value={formatNumber(totalCount)} variant='card' />
        <MetadataItem label='Errors' value={formatNumber(errorCount)} variant='card' />
        <MetadataItem label='Avg' value={formatDuration(latency?.avgDurationMs)} variant='card' />
        <MetadataItem label='p95' value={formatDuration(p95DurationMs)} variant='card' />
        <MetadataItem
          label='Slow Requests'
          value={
            latency
              ? `${formatNumber(latency.slowRequestCount)} (${formatPercent(
                latency.slowRequestRatePercent
              )})`
              : '—'
          }
          variant='card'
        />
      </div>

      <div className='mt-3 grid gap-3 sm:grid-cols-2'>
        <MetadataItem label='Top Path' value={topPath} variant='minimal' mono />
        <MetadataItem
          label='Slow Threshold'
          value={formatDuration(slowThresholdMs)}
          variant='minimal'
        />
      </div>
    </Card>
  );
}

function AlertsGrid(): JSX.Element {
  const {
    summary: { alerts },
  } = useObservabilitySummaryContext();

  return (
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          variant='subtle'
          padding='md'
          className='border-border/60 bg-card/40'
        >
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-sm font-semibold text-white'>{alert.title}</div>
              <div className='text-xs text-gray-400'>{alert.summary}</div>
            </div>
            <StatusBadge status={alert.status} />
          </div>

          <div className='mt-4 grid gap-2 text-xs text-gray-300'>
            <MetadataItem
              label='Current'
              value={
                alert.unit === '%'
                  ? formatPercent(alert.value)
                  : alert.unit === 'count'
                    ? formatNumber(alert.value)
                    : alert.value === null
                      ? '—'
                      : `${formatNumber(alert.value)} ${alert.unit}`
              }
              variant='minimal'
            />
            <MetadataItem
              label='Warning'
              value={
                alert.warningThreshold === null
                  ? '—'
                  : alert.unit === '%'
                    ? formatPercent(alert.warningThreshold)
                    : formatNumber(alert.warningThreshold)
              }
              variant='minimal'
            />
            <MetadataItem
              label='Critical'
              value={
                alert.criticalThreshold === null
                  ? '—'
                  : alert.unit === '%'
                    ? formatPercent(alert.criticalThreshold)
                    : formatNumber(alert.criticalThreshold)
              }
              variant='minimal'
            />
          </div>
          {alert.investigation ? (
            <Button asChild variant='ghost' size='sm' className='mt-4 w-full justify-between'>
              <Link href={alert.investigation.href}>
                {alert.investigation.label}
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function AnalyticsCountList({
  title,
  items,
  emptyTitle,
}: {
  title: string;
  items: KangurAnalyticsCount[];
  emptyTitle: string;
}): JSX.Element {
  const sectionTitle = title;
  const emptyStateTitle = emptyTitle;

  return (
    <FormSection title={sectionTitle} variant='subtle'>
      {items.length === 0 ? (
        <EmptyState title={emptyStateTitle} variant='compact' />
      ) : (
        <div className='space-y-2'>
          {items.map((item) => (
            <Card
              key={item.name}
              variant='subtle'
              padding='sm'
              className='flex items-center justify-between gap-3 border-border/60 bg-card/40'
            >
              <span className='min-w-0 truncate text-sm text-white'>{item.name}</span>
              <StatusBadge status='info' label={formatNumber(item.count)} />
            </Card>
          ))}
        </div>
      )}
    </FormSection>
  );
}

function ImportantClientEventsSection(): JSX.Element {
  const {
    summary: {
      analytics: { importantEvents },
    },
  } = useObservabilitySummaryContext();

  return (
    <AnalyticsCountList
      title='Important Client Events'
      items={importantEvents}
      emptyTitle='No important Kangur client events'
    />
  );
}

function TopEventNamesSection(): JSX.Element {
  const {
    summary: {
      analytics: { topEventNames },
    },
  } = useObservabilitySummaryContext();

  return (
    <AnalyticsCountList
      title='Top Event Names'
      items={topEventNames}
      emptyTitle='No Kangur event names recorded'
    />
  );
}

function TopPathsSection(): JSX.Element {
  const {
    summary: {
      analytics: { topPaths },
    },
  } = useObservabilitySummaryContext();

  return (
    <FormSection title='Top Paths' variant='subtle'>
      {topPaths.length === 0 ? (
        <EmptyState title='No top paths yet' variant='compact' />
      ) : (
        <div className='space-y-2'>
          {topPaths.map((item) => (
            <Card
              key={item.path}
              variant='subtle'
              padding='sm'
              className='flex items-center justify-between gap-3 border-border/60 bg-card/40'
            >
              <span className='min-w-0 truncate text-sm text-white'>{item.path}</span>
              <StatusBadge status='info' label={formatNumber(item.count)} />
            </Card>
          ))}
        </div>
      )}
    </FormSection>
  );
}

function RecentAnalyticsEvents({
  replayCandidates,
  activeReplayEventId,
  onReplayEvent,
}: {
  replayCandidates: readonly KnowledgeGraphPreviewReplayCandidate[];
  activeReplayEventId: string;
  onReplayEvent: (eventId: string) => void;
}): JSX.Element {
  const {
    summary: {
      analytics: { recent: events },
    },
  } = useObservabilitySummaryContext();
  const replayCandidateById = new Map(
    replayCandidates.map((candidate) => [candidate.id, candidate] as const)
  );

  return (
    <div id='recent-analytics-events'>
      <FormSection title='Recent Analytics Events' variant='subtle'>
        {events.length === 0 ? (
          <EmptyState
            title='No recent analytics events'
            description='Client telemetry has not recorded a recent Kangur event in this window.'
            variant='compact'
          />
        ) : (
          <div className='space-y-2'>
            {events.map((event) => {
              const replayCandidate = replayCandidateById.get(event.id) ?? null;
              const isLoadedInPreview = replayCandidate?.id === activeReplayEventId;

              return (
                <Card
                  key={event.id}
                  variant='subtle'
                  padding='sm'
                  className='border-border/60 bg-card/40'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-semibold text-white'>
                        {event.name ?? event.type}
                      </div>
                      <div className='mt-1 truncate text-xs text-gray-400'>{event.path || '—'}</div>
                    </div>
                    <StatusBadge status={event.type === 'pageview' ? 'info' : 'active'} />
                  </div>
                  <div className='mt-3 grid gap-2 sm:grid-cols-3'>
                    <MetadataItem label='At' value={formatDateTime(event.ts)} variant='minimal' />
                    <MetadataItem
                      label='Visitor'
                      value={event.visitorId || '—'}
                      variant='minimal'
                      mono
                    />
                    <MetadataItem
                      label='Session'
                      value={event.sessionId || '—'}
                      variant='minimal'
                      mono
                    />
                  </div>
                  {replayCandidate ? (
                    <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3'>
                      <div className='min-w-0 flex-1 space-y-1'>
                        <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'>
                          Replayable tutor prompt
                        </div>
                        <p className='truncate text-xs text-gray-300'>
                          {replayCandidate.latestUserMessage}
                        </p>
                      </div>
                      <Button
                        variant={isLoadedInPreview ? 'outline' : 'ghost'}
                        size='sm'
                        onClick={() => onReplayEvent(replayCandidate.id)}
                      >
                        {isLoadedInPreview ? 'Loaded in graph preview' : 'Replay in graph preview'}
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );
}

function RecentServerLogs(): JSX.Element {
  const {
    summary: {
      serverLogs: { recent: logs },
    },
  } = useObservabilitySummaryContext();

  return (
    <FormSection title='Recent Server Logs' variant='subtle'>
      {logs.length === 0 ? (
        <EmptyState
          title='No recent server logs'
          description='No Kangur server-side log entries were captured in this window.'
          variant='compact'
        />
      ) : (
        <div className='space-y-2'>
          {logs.map((log) => (
            <Card
              key={log.id}
              variant='subtle'
              padding='sm'
              className='border-border/60 bg-card/40'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-semibold text-white'>{log.message}</div>
                  <div className='mt-1 truncate text-xs text-gray-400'>
                    {[log.source, log.path].filter(Boolean).join(' • ') || 'Kangur server event'}
                  </div>
                </div>
                <StatusBadge status={log.level} />
              </div>
              <div className='mt-3 grid gap-2 sm:grid-cols-3'>
                <MetadataItem label='At' value={formatDateTime(log.createdAt)} variant='minimal' />
                <MetadataItem label='Request' value={log.requestId || '—'} variant='minimal' mono />
                <MetadataItem label='Trace' value={log.traceId || '—'} variant='minimal' mono />
              </div>
            </Card>
          ))}
        </div>
      )}
    </FormSection>
  );
}

function AiTutorBridgeMetrics(): JSX.Element {
  const { summary } = useObservabilitySummaryContext();
  const aiTutor = summary.analytics.aiTutor;
  const directAnswerCount = aiTutor.pageContentAnswerCount + aiTutor.nativeGuideAnswerCount;
  const directAnswerRate = formatPercent(aiTutor.directAnswerRatePercent);
  const brainFallbackRate = formatPercent(aiTutor.brainFallbackRatePercent);
  const bridgeCompletionRate = formatPercent(aiTutor.bridgeCompletionRatePercent);
  const graphCoverageRate = formatPercent(aiTutor.knowledgeGraphCoverageRatePercent);
  const vectorAssistRate = formatPercent(aiTutor.knowledgeGraphVectorAssistRatePercent);
  const recallMix = [
    `Metadata ${formatNumber(aiTutor.knowledgeGraphMetadataOnlyRecallCount)}`,
    `Hybrid ${formatNumber(aiTutor.knowledgeGraphHybridRecallCount)}`,
    `Vector-only ${formatNumber(aiTutor.knowledgeGraphVectorOnlyRecallCount)}`,
  ].join(' / ');

  return (
    <div id='ai-tutor-bridge'>
      <FormSection title='AI Tutor Bridge Snapshot' variant='subtle'>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          <MetricCard
            title='Tutor Replies'
            value={formatNumber(aiTutor.messageSucceededCount)}
            hint='Successful learner-facing AI Tutor replies in the selected window.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Page-Content Answers'
            value={formatNumber(aiTutor.pageContentAnswerCount)}
            hint='Replies resolved directly from Mongo-backed section page content.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Native Guide Answers'
            value={formatNumber(aiTutor.nativeGuideAnswerCount)}
            hint='Replies resolved from linked native guides without Brain fallback.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Brain Fallback Replies'
            value={formatNumber(aiTutor.brainAnswerCount)}
            hint='Replies that still required Brain generation after deterministic sources were checked.'
            icon={<ShieldAlertIcon className='size-3.5' />}
          />
          <MetricCard
            title='Direct Answer Rate'
            value={directAnswerRate}
            hint={`Page-content and native-guide replies as a share of ${formatNumber(aiTutor.messageSucceededCount)} Tutor replies.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Brain Fallback Rate'
            value={brainFallbackRate}
            hint={`Brain fallbacks as a share of ${formatNumber(aiTutor.messageSucceededCount)} Tutor replies. Direct answers: ${formatNumber(directAnswerCount)}.`}
            icon={<ShieldAlertIcon className='size-3.5' />}
          />
          <MetricCard
            title='Bridge Suggestions'
            value={formatNumber(aiTutor.bridgeSuggestionCount)}
            hint='Replies that suggested a lesson-to-game or game-to-lesson bridge.'
            icon={<Repeat2Icon className='size-3.5' />}
          />
          <MetricCard
            title='Lekcja -> Grajmy'
            value={formatNumber(aiTutor.lessonToGameBridgeSuggestionCount)}
            hint='Bridge suggestions moving the learner from lesson review into practice.'
            icon={<ArrowUpRightIcon className='size-3.5' />}
          />
          <MetricCard
            title='Grajmy -> Lekcja'
            value={formatNumber(aiTutor.gameToLessonBridgeSuggestionCount)}
            hint='Bridge suggestions moving the learner from practice back into a lesson.'
            icon={<ArrowUpRightIcon className='size-3.5 rotate-180' />}
          />
          <MetricCard
            title='Bridge CTA Clicks'
            value={formatNumber(aiTutor.bridgeQuickActionClickCount)}
            hint='Bridge quick actions accepted directly from the tutor widget.'
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Bridge Completions'
            value={formatNumber(aiTutor.bridgeFollowUpCompletionCount)}
            hint={`Opened: ${formatNumber(aiTutor.bridgeFollowUpClickCount)} bridge follow-ups. Completed: ${formatNumber(aiTutor.bridgeFollowUpCompletionCount)}.`}
            icon={<Repeat2Icon className='size-3.5' />}
          />
          <MetricCard
            title='Bridge Completion Rate'
            value={bridgeCompletionRate}
            hint={`Completed follow-ups as a share of ${formatNumber(aiTutor.bridgeSuggestionCount)} bridge suggestions.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Neo4j-backed Replies'
            value={formatNumber(aiTutor.knowledgeGraphAppliedCount)}
            hint='Replies that returned knowledge-graph retrieval diagnostics from the server.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Graph Coverage'
            value={graphCoverageRate}
            hint={`Graph-backed share across ${formatNumber(aiTutor.messageSucceededCount)} Tutor replies.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Semantic Graph Replies'
            value={formatNumber(aiTutor.knowledgeGraphSemanticCount)}
            hint={`Website-help graph replies: ${formatNumber(aiTutor.knowledgeGraphWebsiteHelpCount)}.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Recall Mix'
            value={recallMix}
            hint={`Vector recall attempts: ${formatNumber(aiTutor.knowledgeGraphVectorRecallAttemptedCount)}.`}
            icon={<RefreshCwIcon className='size-3.5' />}
          />
          <MetricCard
            title='Vector Assist Rate'
            value={vectorAssistRate}
            hint={`Hybrid and vector-only recall as a share of ${formatNumber(aiTutor.knowledgeGraphSemanticCount)} semantic graph replies.`}
            icon={<RefreshCwIcon className='size-3.5' />}
          />
        </div>
      </FormSection>
    </div>
  );
}

function KnowledgeGraphStatusSection({
  knowledgeGraphStatus,
  freshnessAlert,
  isRefreshing,
  isSyncing,
  syncFeedback,
  error,
  onRefresh,
  onSync,
}: {
  knowledgeGraphStatus: KangurKnowledgeGraphStatusSnapshot;
  freshnessAlert?: KangurObservabilityAlert | undefined;
  isRefreshing: boolean;
  isSyncing: boolean;
  syncFeedback:
    | {
        tone: 'success' | 'error';
        message: string;
      }
    | null;
  error: Error | null;
  onRefresh: () => void;
  onSync: () => void;
}): JSX.Element {
  return (
    <div id='knowledge-graph-status'>
      <FormSection title='Knowledge Graph Status' variant='subtle'>
        {error ? (
          <Alert variant='warning' className='mb-4'>
            {error.message}
          </Alert>
        ) : null}
        {knowledgeGraphStatus.mode === 'disabled' ? (
          <EmptyState
            title='Neo4j graph status disabled'
            description={knowledgeGraphStatus.message}
            variant='compact'
            action={
              <Button variant='outline' size='sm' onClick={onRefresh} disabled={isRefreshing}>
                Refresh graph status
              </Button>
            }
          />
        ) : knowledgeGraphStatus.mode === 'error' ? (
          <div className='space-y-3'>
            <Alert variant='warning'>
              Failed to load live graph status for `{knowledgeGraphStatus.graphKey}`.{' '}
              {knowledgeGraphStatus.message}
            </Alert>
            <div>
              <Button variant='outline' size='sm' onClick={onRefresh} disabled={isRefreshing}>
                Refresh graph status
              </Button>
            </div>
          </div>
        ) : (
          <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-3'>
                  <div className='text-sm font-semibold text-white'>Neo4j semantic retrieval graph</div>
                  <StatusBadge status={resolveKnowledgeGraphBadgeStatus(knowledgeGraphStatus)} />
                </div>
                <p className='max-w-3xl text-xs leading-relaxed text-gray-400'>
                  {describeKnowledgeGraphStatus(knowledgeGraphStatus)}
                </p>
              </div>
              <div className='flex flex-col gap-3'>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='self-start'
                    onClick={onSync}
                    disabled={isSyncing || isRefreshing}
                  >
                    {isSyncing ? 'Syncing graph...' : 'Sync graph now'}
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='self-start'
                    onClick={onRefresh}
                    disabled={isRefreshing || isSyncing}
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh graph status'}
                  </Button>
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                <MetadataItem label='Graph Key' value={knowledgeGraphStatus.graphKey} variant='card' mono />
                <MetadataItem label='Synced' value={formatDateTime(knowledgeGraphStatus.syncedAt)} variant='card' />
                <MetadataItem label='Locale' value={knowledgeGraphStatus.locale ?? '—'} variant='card' />
                <MetadataItem label='Readiness' value={formatKnowledgeGraphReadiness(knowledgeGraphStatus.semanticReadiness)} variant='card' />
                </div>
              </div>
            </div>

            {freshnessAlert ? (
              <Alert
                variant={resolveObservabilityAlertVariant(freshnessAlert.status)}
                title='Freshness against canonical tutor content'
                className='mt-4'
              >
                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <StatusBadge status={freshnessAlert.status} />
                      <span className='text-xs font-semibold uppercase tracking-wider text-gray-200'>
                        {formatKnowledgeGraphFreshnessValue(freshnessAlert)}
                      </span>
                    </div>
                    <p className='text-xs leading-relaxed'>{freshnessAlert.summary}</p>
                  </div>
                  {freshnessAlert.investigation ? (
                    <Button asChild variant='ghost' size='sm' className='self-start'>
                      <Link href={freshnessAlert.investigation.href}>
                        {freshnessAlert.investigation.label}
                        <ArrowUpRightIcon className='size-3.5' />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </Alert>
            ) : null}

            {syncFeedback ? (
              <Alert
                variant={syncFeedback.tone}
                title={syncFeedback.tone === 'success' ? 'Graph sync completed' : 'Graph sync failed'}
                className='mt-4'
              >
                {syncFeedback.message}
              </Alert>
            ) : null}

            <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <MetadataItem
                label='Freshness'
                value={formatKnowledgeGraphFreshnessValue(freshnessAlert)}
                variant='card'
              />
              <MetadataItem
                label='Semantic Coverage'
                value={formatPercent(knowledgeGraphStatus.semanticCoverageRatePercent)}
                variant='card'
              />
              <MetadataItem
                label='Embedding Coverage'
                value={formatPercent(knowledgeGraphStatus.embeddingCoverageRatePercent)}
                variant='card'
              />
              <MetadataItem
                label='Vector Index'
                value={
                  knowledgeGraphStatus.vectorIndexPresent
                    ? [knowledgeGraphStatus.vectorIndexState, knowledgeGraphStatus.vectorIndexType]
                        .filter(Boolean)
                        .join(' • ') || 'Present'
                    : 'Missing'
                }
                variant='card'
              />
              <MetadataItem
                label='Embedding Model'
                value={knowledgeGraphStatus.embeddingModels.join(', ') || '—'}
                variant='card'
              />
              <MetadataItem
                label='Live Graph'
                value={`${formatNumber(knowledgeGraphStatus.liveNodeCount)} nodes / ${formatNumber(knowledgeGraphStatus.liveEdgeCount)} edges`}
                variant='card'
              />
              <MetadataItem
                label='Synced Snapshot'
                value={`${formatNumber(knowledgeGraphStatus.syncedNodeCount)} nodes / ${formatNumber(knowledgeGraphStatus.syncedEdgeCount)} edges`}
                variant='card'
              />
              <MetadataItem
                label='Canonical Integrity'
                value={
                  knowledgeGraphStatus.invalidCanonicalNodeCount === 0
                    ? 'All canonical nodes valid'
                    : `${formatNumber(knowledgeGraphStatus.invalidCanonicalNodeCount)} invalid`
                }
                variant='card'
              />
              <MetadataItem
                label='Embedding Dimensions'
                value={formatNumber(knowledgeGraphStatus.vectorIndexDimensions ?? knowledgeGraphStatus.embeddingDimensions)}
                variant='card'
              />
            </div>
          </Card>
        )}
      </FormSection>
    </div>
  );
}

function PerformanceBaselineCard(): JSX.Element {
  const {
    summary: { performanceBaseline: baseline },
  } = useObservabilitySummaryContext();

  return (
    <div id='performance-baseline'>
      <FormSection title='Performance Baseline' variant='subtle'>
        {!baseline ? (
          <EmptyState
            title='No baseline available'
            description='The latest Kangur performance artifact has not been generated yet.'
            variant='compact'
          />
        ) : (
          <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <div className='text-sm font-semibold text-white'>Latest baseline artifact</div>
                <div className='mt-1 text-xs text-gray-400'>
                  Generated {formatDateTime(baseline.generatedAt)}
                </div>
              </div>
              <StatusBadge
                status={
                  baseline.unitStatus === 'pass' && baseline.e2eStatus === 'pass'
                    ? 'ok'
                    : baseline.infraFailures && baseline.infraFailures > 0
                      ? 'warning'
                      : baseline.failedRuns && baseline.failedRuns > 0
                        ? 'critical'
                        : 'warning'
                }
              />
            </div>

            <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <MetadataItem label='Unit' value={baseline.unitStatus ?? '—'} variant='card' />
              <MetadataItem label='Unit Time' value={formatDuration(baseline.unitDurationMs)} variant='card' />
              <MetadataItem label='E2E' value={baseline.e2eStatus ?? '—'} variant='card' />
              <MetadataItem label='E2E Time' value={formatDuration(baseline.e2eDurationMs)} variant='card' />
              <MetadataItem label='Infra Failures' value={formatNumber(baseline.infraFailures)} variant='card' />
              <MetadataItem label='Failed Runs' value={formatNumber(baseline.failedRuns)} variant='card' />
              <MetadataItem
                label='Bundle Bytes'
                value={formatNumber(baseline.bundleRiskTotalBytes)}
                variant='card'
              />
              <MetadataItem
                label='Bundle Lines'
                value={formatNumber(baseline.bundleRiskTotalLines)}
                variant='card'
              />
            </div>
          </Card>
        )}
      </FormSection>
    </div>
  );
}

function SummaryContent({
  knowledgeGraphStatus,
  knowledgeGraphStatusIsRefreshing,
  knowledgeGraphIsSyncing,
  knowledgeGraphSyncFeedback,
  knowledgeGraphStatusError,
  knowledgeGraphPreviewDraft,
  knowledgeGraphPreviewResult,
  knowledgeGraphPreviewError,
  knowledgeGraphPreviewIsRunning,
  knowledgeGraphPreviewReplayCandidates,
  updateKnowledgeGraphPreviewDraft,
  applyKnowledgeGraphPreviewReplayEvent,
  replayAnalyticsEventInKnowledgeGraphPreview,
  applyKnowledgeGraphPreviewPreset,
  clearKnowledgeGraphPreviewContext,
  runKnowledgeGraphPreview,
  refreshKnowledgeGraphStatus,
  syncKnowledgeGraph,
}: {
  knowledgeGraphStatus: KangurKnowledgeGraphStatusSnapshot;
  knowledgeGraphStatusIsRefreshing: boolean;
  knowledgeGraphIsSyncing: boolean;
  knowledgeGraphSyncFeedback:
    | {
        tone: 'success' | 'error';
        message: string;
      }
    | null;
  knowledgeGraphStatusError: Error | null;
  knowledgeGraphPreviewDraft: KnowledgeGraphPreviewDraft;
  knowledgeGraphPreviewResult: KangurKnowledgeGraphPreviewResponse | null;
  knowledgeGraphPreviewError: string | null;
  knowledgeGraphPreviewIsRunning: boolean;
  knowledgeGraphPreviewReplayCandidates: readonly KnowledgeGraphPreviewReplayCandidate[];
  updateKnowledgeGraphPreviewDraft: (field: keyof KnowledgeGraphPreviewDraft, value: string) => void;
  applyKnowledgeGraphPreviewReplayEvent: (eventId: string) => void;
  replayAnalyticsEventInKnowledgeGraphPreview: (eventId: string) => void;
  applyKnowledgeGraphPreviewPreset: (entryId: string) => void;
  clearKnowledgeGraphPreviewContext: () => void;
  runKnowledgeGraphPreview: () => void;
  refreshKnowledgeGraphStatus: () => void;
  syncKnowledgeGraph: () => void;
}): JSX.Element {
  const { range, summary } = useObservabilitySummaryContext();
  const alertById = new Map(summary.alerts.map((alert) => [alert.id, alert]));
  const allKangurLogsHref = buildSystemLogsHref({
    query: 'kangur.',
    from: summary.window.from,
    to: summary.window.to,
  });
  const ttsFallbackLogsHref = buildSystemLogsHref({
    source: 'kangur.tts.fallback',
    from: summary.window.from,
    to: summary.window.to,
  });
  const ttsGenerationFailureLogsHref = buildSystemLogsHref({
    source: 'kangur.tts.generationFailed',
    from: summary.window.from,
    to: summary.window.to,
  });

  return (
    <div className='space-y-6'>
      <FormSection title='Operational Snapshot' variant='subtle'>
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='space-y-3'>
              <div className='flex flex-wrap items-center gap-3'>
                <StatusBadge status={summary.overallStatus} />
                <span className='text-sm text-gray-300'>
                  Window {formatDateTime(summary.window.from)} to {formatDateTime(summary.window.to)}
                </span>
              </div>
              <p className='max-w-3xl text-sm leading-relaxed text-gray-400'>
                Consolidated Kangur-specific health for auth, progress sync, score persistence,
                assignments, learner provisioning, TTS behavior, and the latest performance
                baseline.
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <MetadataItem label='Generated' value={formatDateTime(summary.generatedAt)} variant='card' />
              <MetadataItem label='Range' value={range} variant='card' />
              <MetadataItem
                label='Analytics Events'
                value={formatNumber(summary.analytics.totals.events)}
                variant='card'
              />
              <MetadataItem
                label='Server Logs'
                value={formatNumber(summary.serverLogs.metrics?.total ?? 0)}
                variant='card'
              />
            </div>
          </div>
        </Card>
      </FormSection>

      <FormSection title='Key Metrics' variant='subtle'>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
          <MetricCard
            title='Server Error Rate'
            value={formatPercent(summary.keyMetrics.serverErrorRatePercent)}
            hint='Share of Kangur server log entries captured as errors in the selected window.'
            icon={<ShieldAlertIcon className='size-3.5' />}
            alert={alertById.get('kangur-server-error-rate')}
          />
          <MetricCard
            title='Learner Sign-in Failure'
            value={formatPercent(summary.keyMetrics.learnerSignInFailureRatePercent)}
            hint={`Across ${formatNumber(summary.keyMetrics.learnerSignInAttempts)} learner sign-in attempts.`}
            icon={<LogInIcon className='size-3.5' />}
            alert={alertById.get('kangur-learner-signin-failure-rate')}
          />
          <MetricCard
            title='Progress Sync Failures'
            value={formatNumber(summary.keyMetrics.progressSyncFailures)}
            hint='Client progress sync failures observed through Kangur runtime telemetry.'
            icon={<RefreshCwIcon className='size-3.5' />}
            alert={alertById.get('kangur-progress-sync-failures')}
          />
          <MetricCard
            title='TTS Generation Failures'
            value={formatNumber(summary.keyMetrics.ttsGenerationFailures)}
            hint='Server narrator generation failures before browser fallback or client narrator recovery.'
            icon={<AudioLinesIcon className='size-3.5' />}
            alert={alertById.get('kangur-tts-generation-failures')}
          />
          <MetricCard
            title='TTS Fallback Rate'
            value={formatPercent(summary.keyMetrics.ttsFallbackRatePercent)}
            hint={`Across ${formatNumber(summary.keyMetrics.ttsRequests)} Kangur TTS requests.`}
            icon={<AudioLinesIcon className='size-3.5' />}
            alert={alertById.get('kangur-tts-fallback-rate')}
          />
        </div>
      </FormSection>

      <AiTutorBridgeMetrics />
      <KnowledgeGraphStatusSection
        knowledgeGraphStatus={knowledgeGraphStatus}
        freshnessAlert={alertById.get('kangur-knowledge-graph-freshness')}
        isRefreshing={knowledgeGraphStatusIsRefreshing}
        isSyncing={knowledgeGraphIsSyncing}
        syncFeedback={knowledgeGraphSyncFeedback}
        error={knowledgeGraphStatusError}
        onRefresh={refreshKnowledgeGraphStatus}
        onSync={syncKnowledgeGraph}
      />
      <KnowledgeGraphQueryPreviewSection
        draft={knowledgeGraphPreviewDraft}
        result={knowledgeGraphPreviewResult}
        error={knowledgeGraphPreviewError}
        isRunning={knowledgeGraphPreviewIsRunning}
        replayCandidates={knowledgeGraphPreviewReplayCandidates}
        onDraftChange={updateKnowledgeGraphPreviewDraft}
        onApplyReplayEvent={applyKnowledgeGraphPreviewReplayEvent}
        onApplySectionPreset={applyKnowledgeGraphPreviewPreset}
        onClearContext={clearKnowledgeGraphPreviewContext}
        onRun={runKnowledgeGraphPreview}
      />

      <FormSection title='Alerts' variant='subtle'>
        <div data-doc-id='admin_observability_alerts'>
          <AlertsGrid />
        </div>
      </FormSection>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
        <FormSection title='Route Health' variant='subtle'>
          <div className='grid gap-4 md:grid-cols-2'>
            {ROUTE_ENTRIES.map((entry) => (
              <RouteMetricCard
                key={entry.key}
                label={entry.label}
                description={entry.description}
                route={summary.routes[entry.key]}
              />
            ))}
          </div>
        </FormSection>

        <PerformanceBaselineCard />
      </div>

      <div className='grid gap-6 xl:grid-cols-3'>
        <ImportantClientEventsSection />
        <TopEventNamesSection />
        <TopPathsSection />
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <RecentAnalyticsEvents
          replayCandidates={knowledgeGraphPreviewReplayCandidates}
          activeReplayEventId={knowledgeGraphPreviewDraft.replayEventId}
          onReplayEvent={replayAnalyticsEventInKnowledgeGraphPreview}
        />
        <RecentServerLogs />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]'>
        <FormSection title='Degraded Dependencies' variant='subtle'>
          {!summary.errors || Object.keys(summary.errors).length === 0 ? (
            <EmptyState
              title='No degraded dependencies'
              description='All summary contributors responded without a partial-failure marker.'
              variant='compact'
            />
          ) : (
            <div className='space-y-2'>
              {Object.entries(summary.errors).map(([key, message]) => (
                <Card
                  key={key}
                  variant='warning'
                  padding='sm'
                  className='border-amber-500/30 bg-amber-500/10'
                >
                  <div className='text-sm font-semibold text-white'>{key}</div>
                  <div className='mt-1 text-xs text-amber-100/80'>{message}</div>
                </Card>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection title='Quick Links' variant='subtle'>
          <div className='space-y-3' data-doc-id='admin_observability_quick_links'>
            <Button asChild variant='outline' className='w-full justify-between'>
              <Link href={allKangurLogsHref}>
                All Kangur Logs
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between'>
              <Link href={ttsGenerationFailureLogsHref}>
                TTS Generation Failure Logs
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between'>
              <Link href={ttsFallbackLogsHref}>
                TTS Fallback Logs
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between'>
              <Link href='/admin/analytics'>
                Global Analytics
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between'>
              <a
                href='/api/kangur/knowledge-graph/status'
                target='_blank'
                rel='noopener noreferrer'
              >
                Knowledge Graph Status JSON
                <ArrowUpRightIcon className='size-3.5' />
              </a>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between'>
              <a
                href={`/api/kangur/observability/summary?range=${range}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                Raw Summary JSON
                <ArrowUpRightIcon className='size-3.5' />
              </a>
            </Button>
          </div>
        </FormSection>
      </div>
    </div>
  );
}

export function AdminKangurObservabilityPage(): JSX.Element {
  const { enabled: adminDocsEnabled } = useKangurDocsTooltips('admin');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsedRange = kangurObservabilityRangeSchema.safeParse(searchParams.get('range'));
  const range: KangurObservabilityRange = parsedRange.success ? parsedRange.data : '24h';
  const summaryQuery = useKangurObservabilitySummary(range);
  const summary = summaryQuery.data;
  const knowledgeGraphStatusQuery = useKangurKnowledgeGraphStatus(
    summary?.knowledgeGraphStatus.graphKey ?? KANGUR_KNOWLEDGE_GRAPH_KEY
  );
  const knowledgeGraphStatus = knowledgeGraphStatusQuery.data ?? summary?.knowledgeGraphStatus;
  const [isKnowledgeGraphSyncing, setIsKnowledgeGraphSyncing] = useState(false);
  const [knowledgeGraphSyncFeedback, setKnowledgeGraphSyncFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [knowledgeGraphPreviewDraft, setKnowledgeGraphPreviewDraft] = useState<KnowledgeGraphPreviewDraft>(
    createKnowledgeGraphPreviewDraft
  );
  const [knowledgeGraphPreviewResult, setKnowledgeGraphPreviewResult] =
    useState<KangurKnowledgeGraphPreviewResponse | null>(null);
  const [knowledgeGraphPreviewError, setKnowledgeGraphPreviewError] = useState<string | null>(null);
  const [isKnowledgeGraphPreviewRunning, setIsKnowledgeGraphPreviewRunning] = useState(false);
  const headerLogsHref = buildSystemLogsHref({
    query: 'kangur.',
    from: summary?.window.from,
    to: summary?.window.to,
  });
  const summaryKnowledgeGraphStatus = summary?.knowledgeGraphStatus;
  const summaryKnowledgeGraphLocale =
    summaryKnowledgeGraphStatus?.mode === 'status' ? summaryKnowledgeGraphStatus.locale : null;
  const knowledgeGraphPreviewReplayCandidates = buildKnowledgeGraphPreviewReplayCandidates(
    summary?.analytics.recent ?? []
  );
  const updateKnowledgeGraphPreviewDraft = useCallback(
    (field: keyof KnowledgeGraphPreviewDraft, value: string): void => {
      setKnowledgeGraphPreviewDraft((current) => {
        const nextDraft = {
          ...current,
          [field]: value,
        };

        if (field !== 'replayEventId' && current.replayEventId) {
          nextDraft.replayEventId = '';
        }

        if (
          field === 'surface' &&
          !isKnowledgeGraphPreviewFocusKindAllowed(value, nextDraft.focusKind)
        ) {
          nextDraft.focusKind = '';
        }

        return nextDraft;
      });
    },
    []
  );
  const runKnowledgeGraphPreviewForDraft = useCallback(
    async (draft: KnowledgeGraphPreviewDraft): Promise<void> => {
      setIsKnowledgeGraphPreviewRunning(true);
      setKnowledgeGraphPreviewError(null);

      try {
        const payload = buildKnowledgeGraphPreviewRequest({
          draft,
          locale:
            (knowledgeGraphStatus?.mode === 'status' ? knowledgeGraphStatus.locale : null) ??
            summaryKnowledgeGraphLocale ??
            'pl',
        });
        const response = await api.post(
          '/api/kangur/ai-tutor/knowledge-graph/preview',
          payload,
          { timeout: 120000 }
        );
        const parsed = kangurKnowledgeGraphPreviewResponseSchema.safeParse(response);

        if (!parsed.success) {
          throw new Error('Invalid knowledge graph preview response');
        }

        setKnowledgeGraphPreviewResult(parsed.data);
      } catch (error) {
        setKnowledgeGraphPreviewResult(null);
        setKnowledgeGraphPreviewError(
          error instanceof Error ? error.message : 'Failed to run the knowledge graph preview.'
        );
      } finally {
        setIsKnowledgeGraphPreviewRunning(false);
      }
    },
    [knowledgeGraphStatus, summaryKnowledgeGraphLocale]
  );
  const applyKnowledgeGraphPreviewReplayEvent = useCallback(
    (eventId: string): void => {
      if (!eventId) {
        setKnowledgeGraphPreviewDraft((current) => ({
          ...current,
          replayEventId: '',
        }));
        return;
      }

      const candidate = knowledgeGraphPreviewReplayCandidates.find(
        (replayCandidate) => replayCandidate.id === eventId
      );
      if (!candidate) {
        setKnowledgeGraphPreviewDraft((current) => ({
          ...current,
          replayEventId: '',
        }));
        return;
      }

      setKnowledgeGraphPreviewDraft(candidate.draft);
      void runKnowledgeGraphPreviewForDraft(candidate.draft);
    },
    [knowledgeGraphPreviewReplayCandidates, runKnowledgeGraphPreviewForDraft]
  );
  const replayAnalyticsEventInKnowledgeGraphPreview = useCallback(
    (eventId: string): void => {
      document
        .getElementById('knowledge-graph-query-preview')
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      applyKnowledgeGraphPreviewReplayEvent(eventId);
    },
    [applyKnowledgeGraphPreviewReplayEvent]
  );
  const applyKnowledgeGraphPreviewPreset = useCallback((entryId: string): void => {
    const entry = KNOWLEDGE_GRAPH_PREVIEW_COVERAGE_ENTRY_BY_ID.get(entryId);
    if (!entry) {
      return;
    }

    setKnowledgeGraphPreviewDraft(createKnowledgeGraphPreviewDraftFromCoverageEntry(entry));
  }, []);
  const clearKnowledgeGraphPreviewContext = useCallback((): void => {
    setKnowledgeGraphPreviewDraft((current) => clearKnowledgeGraphPreviewDraftContext(current));
  }, []);
  const refreshKnowledgeGraphStatus = useCallback((): void => {
    void knowledgeGraphStatusQuery.refetch();
  }, [knowledgeGraphStatusQuery]);
  const syncKnowledgeGraph = useCallback(async (): Promise<void> => {
    if (knowledgeGraphStatus?.mode !== 'status') {
      return;
    }

    setIsKnowledgeGraphSyncing(true);
    setKnowledgeGraphSyncFeedback(null);

    try {
      const withEmbeddings =
        knowledgeGraphStatus.embeddingNodeCount > 0 || knowledgeGraphStatus.vectorIndexPresent;
      const response = await api.post(
        '/api/kangur/knowledge-graph/sync',
        {
          locale: knowledgeGraphStatus.locale ?? summaryKnowledgeGraphLocale ?? 'pl',
          withEmbeddings,
        },
        { timeout: 120000 }
      );
      const parsed = kangurKnowledgeGraphSyncResponseSchema.safeParse(response);

      if (!parsed.success) {
        throw new Error('Invalid Kangur knowledge graph sync response');
      }

      setKnowledgeGraphSyncFeedback({
        tone: 'success',
        message: `Synced ${formatNumber(parsed.data.sync.nodeCount)} nodes and ${formatNumber(parsed.data.sync.edgeCount)} edges${parsed.data.sync.withEmbeddings ? ' with embeddings preserved.' : '.'}`,
      });
      void summaryQuery.refetch();
      void knowledgeGraphStatusQuery.refetch();
    } catch (error) {
      setKnowledgeGraphSyncFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to sync the Kangur knowledge graph.',
      });
    } finally {
      setIsKnowledgeGraphSyncing(false);
    }
  }, [knowledgeGraphStatus, knowledgeGraphStatusQuery, summaryKnowledgeGraphLocale, summaryQuery]);
  const runKnowledgeGraphPreview = useCallback(async (): Promise<void> => {
    await runKnowledgeGraphPreviewForDraft(knowledgeGraphPreviewDraft);
  }, [knowledgeGraphPreviewDraft, runKnowledgeGraphPreviewForDraft]);
  const handleRangeChange = useCallback(
    (nextRange: KangurObservabilityRange): void => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('range', nextRange);
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <KangurAdminContentShell
      title='Kangur Observability'
      description='Monitor Kangur-specific alerts, route health, client telemetry, and recent server activity.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Observability' },
      ]}
      refresh={{
        onRefresh: (): void => {
          void summaryQuery.refetch();
          void knowledgeGraphStatusQuery.refetch();
        },
        isRefreshing: summaryQuery.isFetching || knowledgeGraphStatusQuery.isFetching,
      }}
      headerActions={
        <div className='flex flex-wrap items-center gap-3'>
          <div
            className='flex items-center gap-2 text-xs text-gray-400'
            data-doc-id='admin_observability_range'
          >
            <GaugeIcon className='size-3.5' />
            <span>Range</span>
          </div>
          <SegmentedControl
            options={RANGE_OPTIONS}
            value={range}
            onChange={handleRangeChange}
            size='sm'
            ariaLabel='Observability time range'
          />
          <Button asChild variant='outline' size='sm'>
            <Link href={headerLogsHref} data-doc-id='admin_observability_quick_links'>
              Logs
            </Link>
          </Button>
        </div>
      }
    >
      <div id='kangur-admin-observability-page' className='space-y-6'>
        <KangurDocsTooltipEnhancer
          enabled={adminDocsEnabled}
          rootId='kangur-admin-observability-page'
        />
        {summaryQuery.error ? <Alert variant='error'>{summaryQuery.error.message}</Alert> : null}

        {summaryQuery.isLoading && !summary ? (
          <LoadingState message='Loading Kangur observability...' className='min-h-[320px]' />
        ) : !summary || !knowledgeGraphStatus ? (
          <EmptyState
            title='No observability summary available'
            description='The Kangur summary endpoint did not return data for this window.'
            variant='compact'
            action={
              <Button variant='outline' onClick={() => void summaryQuery.refetch()}>
                Refresh
              </Button>
            }
          />
        ) : (
          <ObservabilitySummaryContext.Provider value={{ range, summary }}>
            <SummaryContent
              knowledgeGraphStatus={knowledgeGraphStatus}
              knowledgeGraphStatusIsRefreshing={knowledgeGraphStatusQuery.isFetching}
              knowledgeGraphIsSyncing={isKnowledgeGraphSyncing}
              knowledgeGraphSyncFeedback={knowledgeGraphSyncFeedback}
              knowledgeGraphStatusError={knowledgeGraphStatusQuery.error}
              knowledgeGraphPreviewDraft={knowledgeGraphPreviewDraft}
              knowledgeGraphPreviewResult={knowledgeGraphPreviewResult}
              knowledgeGraphPreviewError={knowledgeGraphPreviewError}
              knowledgeGraphPreviewIsRunning={isKnowledgeGraphPreviewRunning}
              knowledgeGraphPreviewReplayCandidates={knowledgeGraphPreviewReplayCandidates}
              updateKnowledgeGraphPreviewDraft={updateKnowledgeGraphPreviewDraft}
              applyKnowledgeGraphPreviewReplayEvent={applyKnowledgeGraphPreviewReplayEvent}
              replayAnalyticsEventInKnowledgeGraphPreview={
                replayAnalyticsEventInKnowledgeGraphPreview
              }
              applyKnowledgeGraphPreviewPreset={applyKnowledgeGraphPreviewPreset}
              clearKnowledgeGraphPreviewContext={clearKnowledgeGraphPreviewContext}
              runKnowledgeGraphPreview={(): void => {
                void runKnowledgeGraphPreview();
              }}
              refreshKnowledgeGraphStatus={refreshKnowledgeGraphStatus}
              syncKnowledgeGraph={(): void => {
                void syncKnowledgeGraph();
              }}
            />
          </ObservabilitySummaryContext.Provider>
        )}
      </div>
    </KangurAdminContentShell>
  );
}
