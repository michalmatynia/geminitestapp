'use client';

export type KangurTutorAnchorKind =
  | 'lesson_header'
  | 'assignment'
  | 'document'
  | 'question'
  | 'review'
  | 'summary'
  | 'login_action'
  | 'create_account_action'
  | 'login_identifier_field'
  | 'login_form';

export type KangurTutorAnchorSurface = 'lesson' | 'test' | 'game' | 'auth';

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
