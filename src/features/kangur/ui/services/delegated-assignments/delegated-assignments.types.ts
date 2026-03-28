import type { TranslationValues } from 'use-intl';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentSnapshot,
} from '@kangur/platform';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type {
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

export type KangurAssignmentCatalogGroup = 'time' | 'arithmetic' | 'geometry' | 'logic' | 'practice';

export type KangurAssignmentsRuntimeLocalizer = {
  locale?: string;
  translate?: (key: string, values?: TranslationValues) => string;
};

export type KangurAssignmentCatalogItem = {
  id: string;
  title: string;
  description: string;
  badge: string;
  group: KangurAssignmentCatalogGroup;
  priorityLabel: string;
  createInput: KangurAssignmentCreateInput;
  keywords: string[];
};

export type KangurAssignmentListItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  createdAt: string;
  subject: KangurLessonSubject;
  subjectLabel: string;
  subjectAccent: KangurAccent;
  priority: KangurAssignmentSnapshot['priority'];
  status: KangurAssignmentSnapshot['progress']['status'];
  priorityLabel: string;
  priorityAccent: 'rose' | 'amber' | 'emerald';
  statusLabel: string;
  statusAccent: 'slate' | 'indigo' | 'emerald';
  progressPercent: number;
  progressSummary: string;
  progressCountLabel: string;
  lastActivityLabel: string | null;
  timeLimitMinutes: number | null;
  timeLimitStartsAt: string | null;
  timeLimitLabel: string | null;
  actionHref: string;
  actionLabel: string;
  actionVariant: 'primary' | 'surface';
};
