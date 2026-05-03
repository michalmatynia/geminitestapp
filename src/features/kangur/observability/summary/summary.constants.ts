import type { KangurRouteMetrics } from '@/shared/contracts/kangur-observability';
import { type DuelLobbyMetricKey } from './summary.contracts';

export const ANALYTICS_COLLECTION_NAME = 'analytics_events';
export const SYSTEM_LOGS_COLLECTION_NAME = 'system_logs';

export const KANGUR_ANALYTICS_EVENT_NAMES = [
  'kangur_learner_signin_succeeded',
  'kangur_learner_signin_failed',
  'kangur_game_completed',
  'kangur_launchable_game_viewed',
  'kangur_launchable_game_finished',
  'kangur_progress_hydrated',
  'kangur_progress_hydration_failed',
  'kangur_progress_sync_failed',
  'kangur_api_write_succeeded',
  'kangur_api_write_failed',
  'kangur_api_read_failed',
  'kangur_duels_lobby_viewed',
  'kangur_duels_lobby_refresh_clicked',
  'kangur_duels_lobby_filter_changed',
  'kangur_duels_lobby_sort_changed',
  'kangur_duels_lobby_join_clicked',
  'kangur_duels_lobby_create_clicked',
  'kangur_duels_lobby_login_clicked',
  'kangur_duels_lobby_fetch_succeeded',
  'kangur_duels_lobby_fetch_failed',
  'kangur_duels_lobby_fetch_skipped',
  'kangur_duels_lobby_chat_sent',
  'kangur_duels_lobby_chat_send_failed',
  'kangur_duels_action_started',
  'kangur_duels_action_succeeded',
  'kangur_duels_action_failed',
  'kangur_duels_quick_match_clicked',
  'kangur_duels_challenge_create_clicked',
  'kangur_duels_private_invite_clicked',
  'kangur_ai_tutor_opened',
  'kangur_ai_tutor_closed',
  'kangur_ai_tutor_selection_cta_shown',
  'kangur_ai_tutor_selection_cta_clicked',
  'kangur_ai_tutor_anchor_changed',
  'kangur_ai_tutor_motion_completed',
  'kangur_ai_tutor_context_switched',
  'kangur_ai_tutor_quick_action_clicked',
  'kangur_ai_tutor_follow_up_clicked',
  'kangur_ai_tutor_follow_up_completed',
  'kangur_ai_tutor_feedback_submitted',
  'kangur_ai_tutor_repeat_question_detected',
  'kangur_ai_tutor_recovery_after_hint',
  'kangur_ai_tutor_message_sent',
  'kangur_ai_tutor_message_succeeded',
  'kangur_ai_tutor_message_failed',
  'kangur_ai_tutor_quota_exhausted',
] as const;

export const KANGUR_DUELS_LOBBY_EVENT_NAMES = [
  'kangur_duels_lobby_viewed',
  'kangur_duels_lobby_refresh_clicked',
  'kangur_duels_lobby_filter_changed',
  'kangur_duels_lobby_sort_changed',
  'kangur_duels_lobby_join_clicked',
  'kangur_duels_lobby_create_clicked',
  'kangur_duels_lobby_login_clicked',
] as const;

export const KANGUR_ROUTE_DEFINITIONS = {
  authMeGet: {
    source: 'kangur.auth.me.GET',
  },
  learnerSignInPost: {
    source: 'kangur.auth.learnerSignIn.POST',
  },
  progressPatch: {
    source: 'kangur.progress.PATCH',
  },
  scoresPost: {
    source: 'kangur.scores.POST',
  },
  assignmentsPost: {
    source: 'kangur.assignments.POST',
  },
  learnersPost: {
    source: 'kangur.learners.POST',
  },
  ttsPost: {
    source: 'kangur.tts.POST',
  },
} as const satisfies Record<keyof KangurRouteMetrics, { source: string }>;

export type KangurRouteKey = keyof typeof KANGUR_ROUTE_DEFINITIONS;

export const LOBBY_EVENT_KEY_MAP: Record<string, DuelLobbyMetricKey> = {
  kangur_duels_lobby_viewed: 'viewed',
  kangur_duels_lobby_refresh_clicked: 'refreshClicked',
  kangur_duels_lobby_filter_changed: 'filterChanged',
  kangur_duels_lobby_sort_changed: 'sortChanged',
  kangur_duels_lobby_join_clicked: 'joinClicked',
  kangur_duels_lobby_create_clicked: 'createClicked',
  kangur_duels_lobby_login_clicked: 'loginClicked',
};
