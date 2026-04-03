import type {
  KangurAiTutorFocusKind,
  KangurAiTutorInteractionIntent,
  KangurAiTutorPromptMode,
  KangurAiTutorSurface,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type {
  KangurKnowledgeGraphPreviewRequest,
  KangurKnowledgeGraphPreviewResponse,
  KangurKnowledgeGraphStatusSnapshot,
  KangurKnowledgeGraphSemanticReadiness,
  KangurRecentAnalyticsEvent,
} from '@/shared/contracts';
import { kangurKnowledgeGraphPreviewRequestSchema } from '@/shared/contracts';
import {
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO,
  type KangurAiTutorPageCoverageEntry,
} from '@/features/kangur/ai-tutor/page-coverage-manifest';

import type { KnowledgeGraphPreviewDraft, KnowledgeGraphPreviewReplayCandidate, KnowledgeGraphPreviewSelectOption } from './KnowledgeGraphObservabilityContext';

export const DEFAULT_KNOWLEDGE_GRAPH_PREVIEW_MESSAGE = 'Jak się zalogować do Kangura?';

export const KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS: Record<KangurAiTutorSurface, string> = {
  lesson: 'Lesson',
  test: 'Test',
  game: 'Game',
  profile: 'Learner Profile',
  parent_dashboard: 'Parent Dashboard',
  auth: 'Auth',
};

export const KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_LABELS: Record<KangurAiTutorPromptMode, string> = {
  chat: 'Chat',
  hint: 'Hint',
  explain: 'Explain',
  selected_text: 'Selected text',
};

export const KNOWLEDGE_GRAPH_PREVIEW_INTERACTION_INTENT_LABELS: Record<
  KangurAiTutorInteractionIntent,
  string
> = {
  hint: 'Hint',
  explain: 'Explain',
  review: 'Review',
  next_step: 'Next step',
};

export const KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_LABELS: Record<KangurAiTutorFocusKind, string> = {
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

export const KNOWLEDGE_GRAPH_PREVIEW_SURFACE_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze([
    { value: '', label: 'No surface context' },
    ...Object.entries(KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ]);

export const KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze([
    { value: '', label: 'No prompt mode' },
    ...Object.entries(KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ]);

export const KNOWLEDGE_GRAPH_PREVIEW_INTERACTION_INTENT_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze([
    { value: '', label: 'No interaction intent' },
    ...Object.entries(KNOWLEDGE_GRAPH_PREVIEW_INTERACTION_INTENT_LABELS).map(
      ([value, label]) => ({
        value,
        label,
      })
    ),
  ]);

export const KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze([
    { value: '', label: 'No focus kind' },
    ...Object.entries(KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ]);

export const KNOWLEDGE_GRAPH_PREVIEW_ANSWER_REVEALED_OPTIONS: readonly KnowledgeGraphPreviewSelectOption[] =
  Object.freeze([
    { value: '', label: 'Unknown answer state' },
    { value: 'false', label: 'Answer still hidden' },
    { value: 'true', label: 'Answer revealed' },
  ]);

export const KNOWLEDGE_GRAPH_PREVIEW_FOCUS_KIND_BY_SURFACE = new Map<
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

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat().format(value);
};

export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const formatDuration = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat().format(value)} ms`;
};

export const readKnowledgeGraphPreviewField = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const createKnowledgeGraphPreviewDraft = (): KnowledgeGraphPreviewDraft => ({
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

export const resolveKnowledgeGraphPreviewPromptMode = (
  focusKind: KangurAiTutorPageCoverageEntry['focusKind']
): KangurAiTutorPromptMode =>
  focusKind === 'selection' ? 'selected_text' : 'explain';

export const buildKnowledgeGraphPreviewPresetMessage = (
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

export const resolveKnowledgeGraphPreviewContentId = (
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

export const createKnowledgeGraphPreviewDraftFromCoverageEntry = (
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

export const clearKnowledgeGraphPreviewDraftContext = (
  current: KnowledgeGraphPreviewDraft
): KnowledgeGraphPreviewDraft => ({
  ...createKnowledgeGraphPreviewDraft(),
  latestUserMessage: current.latestUserMessage,
});

export const isKnowledgeGraphPreviewFocusKindAllowed = (
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

export const getKnowledgeGraphPreviewFocusKindOptions = (
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

export const buildKnowledgeGraphPreviewRequest = (input: {
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

export const formatKnowledgeGraphReadiness = (
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

export const describeKnowledgeGraphStatus = (
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

export const resolveKnowledgeGraphBadgeStatus = (
  status: KangurKnowledgeGraphStatusSnapshot
): 'ok' | 'warning' | 'critical' | 'insufficient_data' => {
  if (status.mode === 'disabled') {
    return 'insufficient_data';
  }

  if (status.mode === 'error') {
    return 'critical';
  }

  return KNOWLEDGE_GRAPH_BADGE_STATUS_BY_READINESS[status.semanticReadiness] ?? 'insufficient_data';
};

const KNOWLEDGE_GRAPH_BADGE_STATUS_BY_READINESS: Record<
  KangurKnowledgeGraphSemanticReadiness,
  'ok' | 'warning' | 'critical'
> = {
  vector_ready: 'ok',
  metadata_only: 'warning',
  embeddings_without_index: 'warning',
  vector_index_pending: 'warning',
  no_graph: 'critical',
  no_semantic_text: 'critical',
};

export const resolveKnowledgeGraphPreviewBadgeStatus = (
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

const hasKnowledgeGraphPreviewCoverageInput = (input: {
  surface: string;
  focusKind: string;
  focusId: string;
}): boolean => Boolean(input.surface && input.focusKind && input.focusId);

const matchesKnowledgeGraphPreviewCoveragePreset = (
  entry: KangurAiTutorPageCoverageEntry,
  input: {
    surface: string;
    focusKind: string;
    focusId: string;
  }
): boolean => {
  if (entry.surface !== input.surface) return false;
  if (entry.focusKind !== input.focusKind) return false;
  return entry.anchorIdPrefix !== null && input.focusId.startsWith(entry.anchorIdPrefix);
};

export const resolveKnowledgeGraphPreviewCoveragePresetId = (input: {
  surface: string;
  focusKind: string;
  focusId: string;
}): string => {
  if (!hasKnowledgeGraphPreviewCoverageInput(input)) return '';

  const match = KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.find(
    (entry) => matchesKnowledgeGraphPreviewCoveragePreset(entry, input)
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

export const buildKnowledgeGraphPreviewReplayCandidates = (
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
