import type { LabeledOptionDto } from '@/shared/contracts/base';

export const SURFACE_OPTIONS: Array<
  LabeledOptionDto<'' | 'lesson' | 'test' | 'game' | 'profile' | 'parent_dashboard' | 'auth'>
> = [
  { value: '', label: 'All surfaces' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'test', label: 'Test' },
  { value: 'game', label: 'Game' },
  { value: 'profile', label: 'Profile' },
  { value: 'parent_dashboard', label: 'Parent dashboard' },
  { value: 'auth', label: 'Auth' },
];

export const FOCUS_KIND_OPTIONS = [
  { value: '', label: 'Whole surface' },
  { value: 'selection', label: 'Selection' },
  { value: 'hero', label: 'Hero' },
  { value: 'screen', label: 'Screen' },
  { value: 'library', label: 'Library' },
  { value: 'empty_state', label: 'Empty state' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'lesson_header', label: 'Lesson header' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'document', label: 'Document' },
  { value: 'home_actions', label: 'Home actions' },
  { value: 'home_quest', label: 'Home quest' },
  { value: 'priority_assignments', label: 'Priority assignments' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'progress', label: 'Progress' },
  { value: 'question', label: 'Question' },
  { value: 'review', label: 'Review' },
  { value: 'summary', label: 'Summary' },
  { value: 'login_action', label: 'Login action' },
  { value: 'create_account_action', label: 'Create account action' },
  { value: 'login_identifier_field', label: 'Login identifier field' },
  { value: 'login_form', label: 'Login form' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const stringifyLineList = (items: string[]): string => items.join('\n');

export const parseLineList = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
