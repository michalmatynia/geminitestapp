'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { IdLabelOptionDto } from '@/shared/contracts/base';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord, KangurUser } from '@kangur/platform';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { resolveKangurScoreSubject, type KangurLessonSubject } from '@/shared/contracts/kangur';

const kangurPlatform = getKangurPlatform();

export type KangurLeaderboardUserFilter = 'all' | 'registered' | 'anonymous';
export type KangurLeaderboardUserFilterIcon = 'ghost' | 'user' | null;

type KangurLeaderboardOperationLabel = {
  emoji: string;
  label: string;
};

type KangurLeaderboardOperationOption = IdLabelOptionDto & { emoji: string };

export type KangurLeaderboardFilterItem = {
  displayLabel: string;
  id: string;
  label: string;
  selected: boolean;
  select: () => void;
};

export type KangurLeaderboardUserFilterItem = KangurLeaderboardFilterItem & {
  icon: KangurLeaderboardUserFilterIcon;
};

export type KangurLeaderboardItem = {
  accountLabel: string;
  currentUserBadgeLabel: string;
  id: string;
  isCurrentUser: boolean;
  isMedal: boolean;
  isRegistered: boolean;
  metaLabel: string;
  operationEmoji: string;
  operationLabel: string;
  operationSummary: string;
  playerName: string;
  rank: number;
  rankLabel: string;
  scoreLabel: string;
  timeLabel: string;
  xpLabel: string | null;
};

type UseKangurLeaderboardStateOptions = {
  enabled?: boolean;
  limit?: number;
};

type UseKangurLeaderboardStateResult = {
  currentUser: KangurUser | null;
  emptyStateLabel: string;
  error: string | null;
  items: KangurLeaderboardItem[];
  loading: boolean;
  operationFilter: string;
  operationFilters: KangurLeaderboardFilterItem[];
  scores: KangurScoreRecord[];
  userFilter: KangurLeaderboardUserFilter;
  userFilters: KangurLeaderboardUserFilterItem[];
  visibleScores: KangurScoreRecord[];
};

const MEDALS = ['🥇', '🥈', '🥉'] as const;

const MATH_OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  addition: { label: 'Dodawanie', emoji: '➕' },
  subtraction: { label: 'Odejmowanie', emoji: '➖' },
  multiplication: { label: 'Mnożenie', emoji: '✖️' },
  division: { label: 'Dzielenie', emoji: '➗' },
  decimals: { label: 'Ułamki', emoji: '🔢' },
  powers: { label: 'Potęgi', emoji: '⚡' },
  roots: { label: 'Pierwiastki', emoji: '√' },
  clock: { label: 'Zegar', emoji: '🕐' },
  calendar: { label: 'Kalendarz', emoji: '📅' },
  geometry: { label: 'Geometria', emoji: '🔷' },
  mixed: { label: 'Mieszane', emoji: '🎲' },
};

const ENGLISH_OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  english_basics: { label: 'Podstawy', emoji: '🗣️' },
  english_parts_of_speech: { label: 'Części mowy', emoji: '🔤' },
  english_sentence_structure: { label: 'Szyk zdania', emoji: '🧩' },
  english_subject_verb_agreement: { label: 'Zgoda podmiotu', emoji: '🤝' },
  english_articles: { label: 'Przedimki', emoji: '📰' },
  english_prepositions_time_place: { label: 'Przyimki czasu i miejsca', emoji: '🧭' },
};

const ALPHABET_OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  alphabet_basics: { label: 'Alfabet', emoji: '🔤' },
  alphabet_copy: { label: 'Przepisz litery', emoji: '📝' },
  alphabet_syllables: { label: 'Sylaby', emoji: '🗣️' },
};

const GEOMETRY_OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  geometry_shape_recognition: { label: 'Geometria', emoji: '🔷' },
};

const AGENTIC_CODING_OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  agentic_coding_codex_5_4: { label: 'Foundations', emoji: '🤖' },
  agentic_coding_codex_5_4_fit: { label: 'Fit & Limits', emoji: '🧭' },
  agentic_coding_codex_5_4_surfaces: { label: 'Surfaces', emoji: '🧩' },
  agentic_coding_codex_5_4_operating_model: { label: 'Operating Model', emoji: '🔁' },
  agentic_coding_codex_5_4_prompting: { label: 'Prompting & Context', emoji: '🎯' },
  agentic_coding_codex_5_4_responses: { label: 'Responses & Tools', emoji: '📡' },
  agentic_coding_codex_5_4_agents_md: { label: 'AGENTS.md', emoji: '🗂️' },
  agentic_coding_codex_5_4_approvals: { label: 'Approvals & Network', emoji: '🔒' },
  agentic_coding_codex_5_4_safety: { label: 'Config & Safety', emoji: '🛡️' },
  agentic_coding_codex_5_4_web_citations: { label: 'Web & Citations', emoji: '🌐' },
  agentic_coding_codex_5_4_tooling: { label: 'Tooling & Search', emoji: '🛠️' },
  agentic_coding_codex_5_4_response_contract: { label: 'Response Contract', emoji: '📐' },
  agentic_coding_codex_5_4_ai_documentation: { label: 'AI Documentation', emoji: '📚' },
  agentic_coding_codex_5_4_delegation: { label: 'Delegation', emoji: '🤝' },
  agentic_coding_codex_5_4_models: { label: 'Models & Reasoning', emoji: '🧠' },
  agentic_coding_codex_5_4_cli_ide: { label: 'CLI & IDE', emoji: '⌨️' },
  agentic_coding_codex_5_4_app_workflows: { label: 'Codex App', emoji: '🧵' },
  agentic_coding_codex_5_4_skills: { label: 'Skills & MCP', emoji: '🧰' },
  agentic_coding_codex_5_4_mcp_integrations: { label: 'MCP Integrations', emoji: '🔗' },
  agentic_coding_codex_5_4_automations: { label: 'Automations', emoji: '⏱️' },
  agentic_coding_codex_5_4_state_scale: { label: 'State & Scale', emoji: '🗺️' },
  agentic_coding_codex_5_4_review: { label: 'Review & Verification', emoji: '🔍' },
  agentic_coding_codex_5_4_long_horizon: { label: 'Long-Horizon', emoji: '🛰️' },
  agentic_coding_codex_5_4_dos_donts: { label: 'Do\'s & Don\'ts', emoji: '✅' },
  agentic_coding_codex_5_4_non_engineers: { label: 'Non-Engineers', emoji: '👥' },
  agentic_coding_codex_5_4_prompt_patterns: { label: 'Prompt Patterns', emoji: '📝' },
  agentic_coding_codex_5_4_rollout: { label: 'Team Rollout', emoji: '🚀' },
};

const OPERATION_LABELS_BY_SUBJECT: Record<
  KangurLessonSubject,
  Record<string, KangurLeaderboardOperationLabel>
> = {
  maths: MATH_OPERATION_LABELS,
  english: ENGLISH_OPERATION_LABELS,
  alphabet: ALPHABET_OPERATION_LABELS,
  geometry: GEOMETRY_OPERATION_LABELS,
  web_development: {
    all: { label: 'Wszystkie', emoji: '🏆' },
    webdev_react_components: { label: 'React', emoji: '⚛️' },
    webdev_react_dom_components: { label: 'React DOM Components', emoji: '🧩' },
    webdev_react_hooks: { label: 'React Hooks', emoji: '🪝' },
    webdev_react_apis: { label: 'React APIs', emoji: '🔌' },
    webdev_react_dom_hooks: { label: 'React DOM Hooks', emoji: '🧲' },
    webdev_react_dom_apis: { label: 'React DOM APIs', emoji: '🧰' },
    webdev_react_dom_client_apis: { label: 'React DOM Client APIs', emoji: '📡' },
    webdev_react_dom_server_apis: { label: 'React DOM Server APIs', emoji: '🛰️' },
    webdev_react_dom_static_apis: { label: 'React DOM Static APIs', emoji: '🧊' },
    webdev_react_compiler_config: { label: 'React Compiler Config', emoji: '🛠️' },
    webdev_react_compiler_directives: { label: 'React Compiler Directives', emoji: '📌' },
    webdev_react_compiler_libraries: { label: 'React Compiler Libraries', emoji: '📚' },
    webdev_react_performance_tracks: { label: 'Performance Tracks', emoji: '📈' },
    webdev_react_lints: { label: 'Lints', emoji: '🧹' },
    webdev_react_rules: { label: 'Rules Of React', emoji: '📜' },
    webdev_react_server_components: { label: 'Server Components', emoji: '🖥️' },
    webdev_react_server_functions: { label: 'Server Functions', emoji: '🧪' },
    webdev_react_server_directives: { label: 'Server Directives', emoji: '🧭' },
    webdev_react_router: { label: 'React Router', emoji: '🧭' },
    webdev_react_setup: { label: 'Setup', emoji: '📦' },
    webdev_react_state_management: { label: 'Managing State', emoji: '🗃️' },
  },
  agentic_coding: AGENTIC_CODING_OPERATION_LABELS,
};

const ALL_OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  ...MATH_OPERATION_LABELS,
  ...ENGLISH_OPERATION_LABELS,
  ...ALPHABET_OPERATION_LABELS,
  ...GEOMETRY_OPERATION_LABELS,
  ...AGENTIC_CODING_OPERATION_LABELS,
};

const TRANSLATED_OPERATION_IDS = new Set([
  'all',
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'calendar',
  'geometry',
  'mixed',
  'english_basics',
  'english_parts_of_speech',
  'english_sentence_structure',
  'english_subject_verb_agreement',
  'english_articles',
  'english_prepositions_time_place',
  'alphabet_basics',
  'alphabet_copy',
  'alphabet_syllables',
  'geometry_shape_recognition',
]);

const translateOperationInfo = (
  operation: string,
  info: KangurLeaderboardOperationLabel,
  translate: (key: string) => string
): KangurLeaderboardOperationLabel => ({
  emoji: info.emoji,
  label: TRANSLATED_OPERATION_IDS.has(operation)
    ? translate(`operations.${operation}`)
    : info.label,
});

const buildOperationOptions = (
  subject: KangurLessonSubject,
  translate: (key: string) => string
): KangurLeaderboardOperationOption[] =>
  Object.entries(OPERATION_LABELS_BY_SUBJECT[subject]).map(([id, info]) => ({
    id,
    ...translateOperationInfo(id, info, translate),
  }));

const buildUserOptions = (
  translate: (key: string) => string
): Array<IdLabelOptionDto<KangurLeaderboardUserFilter> & { icon: KangurLeaderboardUserFilterIcon }> => [
  { id: 'all', label: translate('userFilters.all'), icon: null },
  { id: 'registered', label: translate('userFilters.registered'), icon: 'user' },
  { id: 'anonymous', label: translate('userFilters.anonymous'), icon: 'ghost' },
];

const getOperationInfo = (
  operation: string,
  translate: (key: string) => string
): KangurLeaderboardOperationLabel =>
  translateOperationInfo(
    operation,
    ALL_OPERATION_LABELS[operation] ?? { emoji: '❓', label: operation },
    translate
  );

const normalizeXpEarned = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;

export const useKangurLeaderboardState = (
  options: UseKangurLeaderboardStateOptions = {}
): UseKangurLeaderboardStateResult => {
  const translations = useTranslations('KangurGameWidgets.leaderboard');
  const enabled = options.enabled ?? true;
  const limit = typeof options.limit === 'number' && options.limit > 0 ? Math.round(options.limit) : 10;
  const auth = useOptionalKangurAuth();
  const currentUser = auth?.user ?? null;
  const [scores, setScores] = useState<KangurScoreRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [operationFilter, setOperationFilter] = useState('all');
  const [userFilter, setUserFilter] = useState<KangurLeaderboardUserFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const { subject } = useKangurSubjectFocus();

  useEffect(() => {
    let isActive = true;

    if (!enabled) {
      setScores([]);
      setError(null);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadScores = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const scoreRows = await kangurPlatform.score.filter({ subject }, '-score', 20);

        if (!isActive) {
          return;
        }

        setScores(scoreRows);
        setError(null);
      } catch (err) {
        if (!isActive) {
          return;
        }
        logKangurClientError(err, {
          source: 'useKangurLeaderboardState',
          action: 'loadScores',
        });
        setScores([]);
        setError(translations('errors.loadScores'));
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadScores();

    return () => {
      isActive = false;
    };
  }, [enabled, subject, translations]);

  const operationOptions = useMemo(
    () => buildOperationOptions(subject, translations),
    [subject, translations]
  );
  const userOptions = useMemo(() => buildUserOptions(translations), [translations]);

  useEffect(() => {
    if (operationOptions.some((option) => option.id === operationFilter)) {
      return;
    }
    setOperationFilter('all');
  }, [operationFilter, operationOptions]);

  const visibleScores = useMemo(() => {
    const filteredScores = scores.filter((score) => {
      const scoreSubject = resolveKangurScoreSubject(score);
      const subjectMatch = scoreSubject === subject;
      const operationMatch = operationFilter === 'all' || score.operation === operationFilter;
      const isRegistered = Boolean(score.created_by);
      const userMatch =
        userFilter === 'all' ||
        (userFilter === 'registered' && isRegistered) ||
        (userFilter === 'anonymous' && !isRegistered);

      return subjectMatch && operationMatch && userMatch;
    });

    return filteredScores.slice(0, limit);
  }, [limit, operationFilter, scores, subject, userFilter]);

  const items = useMemo(
    () =>
      visibleScores.map((score, index) => {
        const isRegistered = Boolean(score.created_by);
        const operationInfo = getOperationInfo(score.operation, translations);
        const medal = index < MEDALS.length ? MEDALS[index]! : null;
        const xpEarned = normalizeXpEarned(score.xp_earned);
        const isCurrentUser =
          Boolean(currentUser?.email) && score.created_by === (currentUser?.email ?? null);

        return {
          accountLabel: isRegistered
            ? translations('account.registered')
            : translations('account.anonymous'),
          currentUserBadgeLabel: translations('currentUserBadge'),
          id: score.id,
          isCurrentUser,
          isMedal: medal !== null,
          isRegistered,
          metaLabel: `${operationInfo.emoji} ${operationInfo.label} · ${
            isRegistered
              ? translations('account.registered')
              : translations('account.anonymous')
          }`,
          operationEmoji: operationInfo.emoji,
          operationLabel: operationInfo.label,
          operationSummary: `${operationInfo.emoji} ${operationInfo.label}`,
          playerName: score.player_name,
          rank: index + 1,
          rankLabel: medal ?? `${index + 1}.`,
          scoreLabel: `${score.score}/${score.total_questions}`,
          timeLabel: `${score.time_taken}s`,
          xpLabel: xpEarned !== null ? `+${xpEarned} XP` : null,
        };
      }),
    [currentUser?.email, translations, visibleScores]
  );

  const operationFilters = useMemo(
    () =>
      operationOptions.map((option) => ({
        displayLabel: `${option.emoji} ${option.label}`,
        id: option.id,
        label: option.label,
        selected: operationFilter === option.id,
        select: (): void => {
          setOperationFilter(option.id);
        },
      })),
    [operationFilter, operationOptions]
  );

  const userFilters = useMemo(
    () =>
      userOptions.map((option) => ({
        displayLabel: option.label,
        icon: option.icon,
        id: option.id,
        label: option.label,
        selected: userFilter === option.id,
        select: (): void => {
          setUserFilter(option.id);
        },
      })),
    [userFilter, userOptions]
  );

  return {
    currentUser,
    emptyStateLabel: error ?? translations('emptyStateLabel'),
    error,
    items,
    loading,
    operationFilter,
    operationFilters,
    scores,
    userFilter,
    userFilters,
    visibleScores,
  };
};
