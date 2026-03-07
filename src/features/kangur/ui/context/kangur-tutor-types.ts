'use client';

export type KangurTutorAnchorKind =
  | 'lesson_header'
  | 'assignment'
  | 'document'
  | 'question'
  | 'review'
  | 'summary';

export type KangurTutorAnchorMetadata = {
  contentId?: string | null;
  label?: string | null;
  assignmentId?: string | null;
};

export type KangurTutorAnchorRegistration = {
  id: string;
  kind: KangurTutorAnchorKind;
  surface: 'lesson' | 'test';
  priority: number;
  metadata?: KangurTutorAnchorMetadata;
  getRect: () => DOMRect | null;
};
