export type KangurTutorAnchorKind =
  | 'selection'
  | 'hero'
  | 'screen'
  | 'library'
  | 'empty_state'
  | 'navigation'
  | 'lesson_header'
  | 'assignment'
  | 'document'
  | 'question'
  | 'review'
  | 'summary'
  | 'home_actions'
  | 'home_quest'
  | 'priority_assignments'
  | 'leaderboard'
  | 'progress'
  | 'login_action'
  | 'create_account_action'
  | 'login_identifier_field'
  | 'login_form';

export type KangurTutorAnchorSurface =
  | 'lesson'
  | 'test'
  | 'game'
  | 'profile'
  | 'parent_dashboard'
  | 'auth';

export type KangurTutorAnchorMetadata = {
  contentId?: string | null;
  label?: string | null;
  assignmentId?: string | null;
};

export type KangurTutorAnchorRegistration = {
  id: string;
  kind: KangurTutorAnchorKind;
  surface: KangurTutorAnchorSurface;
  priority: number;
  metadata?: KangurTutorAnchorMetadata;
  getRect: () => DOMRect | null;
};
