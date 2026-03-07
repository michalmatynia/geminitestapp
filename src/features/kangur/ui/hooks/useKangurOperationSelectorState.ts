'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { DIFFICULTY_CONFIG } from '@/features/kangur/ui/services/math-questions';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/ui/types';

type KangurPracticeAssignment = KangurAssignmentSnapshot & { target: { type: 'practice' } };

export type KangurOperationSelectorDifficultyOption = {
  displayLabel: string;
  id: KangurDifficulty;
  label: string;
  metaLabel: string;
  selected: boolean;
  select: () => void;
};

export type KangurOperationSelectorItem = {
  accent: KangurAccent;
  actionLabel: string;
  description: string;
  displayLabel: string;
  emoji: string;
  hasPriorityAssignment: boolean;
  id: KangurOperation;
  label: string;
  priorityLabel: string;
  select: () => void;
  statusLabel: string;
};

type UseKangurOperationSelectorStateOptions = {
  active?: boolean;
  onSelect?: (operation: KangurOperation, difficulty: KangurDifficulty) => void;
  priorityAssignmentsByOperation?: Partial<Record<KangurOperation, KangurPracticeAssignment>>;
};

const OPERATIONS: Array<{
  accent: KangurAccent;
  id: KangurOperation;
  label: string;
  emoji: string;
}> = [
  { accent: 'emerald', id: 'addition', label: 'Dodawanie', emoji: '➕' },
  { accent: 'sky', id: 'subtraction', label: 'Odejmowanie', emoji: '➖' },
  { accent: 'violet', id: 'multiplication', label: 'Mnozenie', emoji: '✖️' },
  { accent: 'amber', id: 'division', label: 'Dzielenie', emoji: '➗' },
  { accent: 'teal', id: 'decimals', label: 'Ulamki', emoji: '🔢' },
  { accent: 'amber', id: 'powers', label: 'Potegi', emoji: '⚡' },
  { accent: 'indigo', id: 'roots', label: 'Pierwiastki', emoji: '√' },
  { accent: 'sky', id: 'clock', label: 'Zegar', emoji: '🕐' },
  { accent: 'rose', id: 'mixed', label: 'Mieszane', emoji: '🎲' },
];

const PRIORITY_LABELS = {
  high: 'Priorytet wysoki',
  medium: 'Priorytet sredni',
  low: 'Priorytet niski',
} as const;

const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

const DEFAULT_DIFFICULTY: KangurDifficulty = 'medium';

export const useKangurOperationSelectorState = (
  options: UseKangurOperationSelectorStateOptions = {}
) => {
  const active = options.active ?? true;
  const onSelect = options.onSelect;
  const priorityAssignmentsByOperation = options.priorityAssignmentsByOperation ?? {};
  const previousActiveRef = useRef(active);
  const [difficulty, setDifficulty] = useState<KangurDifficulty>(DEFAULT_DIFFICULTY);

  useEffect(() => {
    if (active && !previousActiveRef.current) {
      setDifficulty(DEFAULT_DIFFICULTY);
    }

    previousActiveRef.current = active;
  }, [active]);

  const difficultyOptions = useMemo<KangurOperationSelectorDifficultyOption[]>(
    () =>
      (Object.keys(DIFFICULTY_CONFIG) as KangurDifficulty[]).map((id) => {
        const config = DIFFICULTY_CONFIG[id];
        return {
          displayLabel: `${config.emoji} ${config.label}`,
          id,
          label: config.label,
          metaLabel: `${config.timeLimit}s · zakres 1-${config.range}`,
          selected: difficulty === id,
          select: (): void => {
            setDifficulty(id);
          },
        };
      }),
    [difficulty]
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
          return {
            accent: operation.accent,
            actionLabel: 'Zacznij lekcje',
            description: priorityAssignment
              ? `${priorityAssignment.progress.percent}% · ${priorityAssignment.title}`
              : 'Wejdz do serii pytan i cwicz we wlasnym tempie.',
            displayLabel: `${operation.emoji} ${operation.label}`,
            emoji: operation.emoji,
            hasPriorityAssignment: Boolean(priorityAssignment),
            id: operation.id,
            label: operation.label,
            priorityLabel: priorityAssignment ? PRIORITY_LABELS[priorityAssignment.priority] : '',
            select: (): void => {
              onSelect?.(operation.id, difficulty);
            },
            statusLabel: priorityAssignment ? 'Zadanie od rodzica' : 'Trening swobodny',
          };
        }),
    [difficulty, onSelect, priorityAssignmentsByOperation]
  );

  return {
    difficulty,
    difficultyOptions,
    operations,
    setDifficulty,
  };
};
