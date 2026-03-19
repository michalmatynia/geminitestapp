'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { IdLabelOptionDto } from '@/shared/contracts/base';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { DIFFICULTY_CONFIG } from '@/features/kangur/ui/services/math-questions';
import type {
  KangurDifficulty,
  KangurDifficultyOption,
  KangurOperation,
} from '@/features/kangur/ui/types';

type KangurPracticeAssignment = KangurAssignmentSnapshot & { target: { type: 'practice' } };

export type KangurOperationSelectorItem = {
  accent: KangurAccent;
  actionLabel: string;
  description: string;
  displayLabel: string;
  emoji: string;
  hasPriorityAssignment: boolean;
  id: KangurOperation;
  isRecommended: boolean;
  label: string;
  priority: KangurAssignmentSnapshot['priority'] | null;
  priorityLabel: string;
  recommendedLabel: string;
  select: () => void;
  statusLabel: string;
  subject: KangurLessonSubject;
};

type UseKangurOperationSelectorStateOptions = {
  active?: boolean;
  onSelect?: (operation: KangurOperation, difficulty: KangurDifficulty) => void;
  priorityAssignmentsByOperation?: Partial<Record<KangurOperation, KangurPracticeAssignment>>;
  recommendedLabel?: string;
  recommendedOperation?: KangurOperation | null;
};

const OPERATIONS: Array<
  IdLabelOptionDto<KangurOperation> & {
    accent: KangurAccent;
    emoji: string;
    subject: KangurLessonSubject;
  }
> = [
  { accent: 'emerald', id: 'addition', label: '', emoji: '➕', subject: 'maths' },
  { accent: 'sky', id: 'subtraction', label: '', emoji: '➖', subject: 'maths' },
  { accent: 'violet', id: 'multiplication', label: '', emoji: '✖️', subject: 'maths' },
  { accent: 'amber', id: 'division', label: '', emoji: '➗', subject: 'maths' },
  { accent: 'teal', id: 'decimals', label: '', emoji: '🔢', subject: 'maths' },
  { accent: 'amber', id: 'powers', label: '', emoji: '⚡', subject: 'maths' },
  { accent: 'indigo', id: 'roots', label: '', emoji: '√', subject: 'maths' },
  { accent: 'sky', id: 'clock', label: '', emoji: '🕐', subject: 'maths' },
  { accent: 'rose', id: 'mixed', label: '', emoji: '🎲', subject: 'maths' },
];

const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

const DEFAULT_DIFFICULTY: KangurDifficulty = 'medium';

export const useKangurOperationSelectorState = (
  options: UseKangurOperationSelectorStateOptions = {}
) => {
  const translations = useTranslations('KangurOperationSelector');
  const active = options.active ?? true;
  const onSelect = options.onSelect;
  const priorityAssignmentsByOperation = options.priorityAssignmentsByOperation ?? {};
  const recommendedLabel = options.recommendedLabel ?? translations('recommendedNow');
  const recommendedOperation = options.recommendedOperation ?? null;
  const previousActiveRef = useRef(active);
  const [difficulty, setDifficulty] = useState<KangurDifficulty>(DEFAULT_DIFFICULTY);

  useEffect(() => {
    if (active && !previousActiveRef.current) {
      setDifficulty(DEFAULT_DIFFICULTY);
    }

    previousActiveRef.current = active;
  }, [active]);

  const difficultyOptions = useMemo<KangurDifficultyOption[]>(
    () =>
      (Object.keys(DIFFICULTY_CONFIG) as KangurDifficulty[]).map((id) => {
        const config = DIFFICULTY_CONFIG[id];
        return {
          displayLabel: `${config.emoji} ${translations(`difficulty.${id}`)}`,
          id,
          label: translations(`difficulty.${id}`),
          metaLabel: translations('difficultyMeta', {
            seconds: config.timeLimit,
            range: config.range,
          }),
          selected: difficulty === id,
          select: (): void => {
            setDifficulty(id);
          },
        };
      }),
    [difficulty, translations]
  );

  const operations = useMemo<KangurOperationSelectorItem[]>(
    () =>
      [...OPERATIONS]
        .sort((left, right) => {
          const leftAssignment = priorityAssignmentsByOperation[left.id] ?? null;
          const rightAssignment = priorityAssignmentsByOperation[right.id] ?? null;
          const leftRank = leftAssignment
            ? PRIORITY_ORDER[leftAssignment.priority]
            : Number.POSITIVE_INFINITY;
          const rightRank = rightAssignment
            ? PRIORITY_ORDER[rightAssignment.priority]
            : Number.POSITIVE_INFINITY;

          if (leftRank !== rightRank) {
            return leftRank - rightRank;
          }

          return (
            OPERATIONS.findIndex((operation) => operation.id === left.id) -
            OPERATIONS.findIndex((operation) => operation.id === right.id)
          );
        })
        .map((operation) => {
          const priorityAssignment = priorityAssignmentsByOperation[operation.id] ?? null;
          const isRecommended = recommendedOperation === operation.id;
          const operationLabel = translations(`operations.${operation.id}`);
          return {
            accent: operation.accent,
            actionLabel: translations('actions.startLesson'),
            description: priorityAssignment
              ? `${priorityAssignment.progress.percent}% · ${priorityAssignment.title}`
              : translations('descriptionNoAssignment'),
            displayLabel: `${operation.emoji} ${operationLabel}`,
            emoji: operation.emoji,
            hasPriorityAssignment: Boolean(priorityAssignment),
            id: operation.id,
            isRecommended,
            label: operationLabel,
            priority: priorityAssignment?.priority ?? null,
            priorityLabel: priorityAssignment
              ? translations(`priority.${priorityAssignment.priority}`)
              : '',
            recommendedLabel: isRecommended ? recommendedLabel : '',
            select: (): void => {
              onSelect?.(operation.id, difficulty);
            },
            statusLabel: priorityAssignment
              ? translations('status.parentAssignment')
              : translations('status.freePractice'),
            subject: operation.subject,
          };
        }),
    [difficulty, onSelect, priorityAssignmentsByOperation, recommendedLabel, recommendedOperation, translations]
  );

  return {
    difficulty,
    difficultyOptions,
    operations,
    setDifficulty,
  };
};
