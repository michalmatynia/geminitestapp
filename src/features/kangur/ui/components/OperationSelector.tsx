import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_OPTION_CARD_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

export type OperationSelectorProps = {
  onSelect: (operation: KangurOperation, difficulty: KangurDifficulty) => void;
  priorityAssignmentsByOperation?: Partial<
    Record<KangurOperation, KangurAssignmentSnapshot & { target: { type: 'practice' } }>
  >;
};

const OPERATIONS: Array<{
  id: KangurOperation;
  label: string;
  accent: KangurAccent;
  emoji: string;
}> = [
  { id: 'addition', label: 'Dodawanie', accent: 'emerald', emoji: '➕' },
  { id: 'subtraction', label: 'Odejmowanie', accent: 'sky', emoji: '➖' },
  { id: 'multiplication', label: 'Mnozenie', accent: 'violet', emoji: '✖️' },
  { id: 'division', label: 'Dzielenie', accent: 'amber', emoji: '➗' },
  { id: 'decimals', label: 'Ulamki', accent: 'teal', emoji: '🔢' },
  { id: 'powers', label: 'Potegi', accent: 'amber', emoji: '⚡' },
  { id: 'roots', label: 'Pierwiastki', accent: 'indigo', emoji: '√' },
  { id: 'clock', label: 'Zegar', accent: 'sky', emoji: '🕐' },
  { id: 'mixed', label: 'Mieszane', accent: 'rose', emoji: '🎲' },
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

export default function OperationSelector({
  onSelect,
  priorityAssignmentsByOperation = {},
}: OperationSelectorProps): React.JSX.Element {
  const [difficulty, setDifficulty] = useState<KangurDifficulty>('medium');
  const sortedOperations = useMemo(
    () =>
      [...OPERATIONS].sort((left, right) => {
        const leftAssignment = priorityAssignmentsByOperation[left.id] ?? null;
        const rightAssignment = priorityAssignmentsByOperation[right.id] ?? null;
        const leftRank = leftAssignment ? PRIORITY_ORDER[leftAssignment.priority] : Number.POSITIVE_INFINITY;
        const rightRank = rightAssignment ? PRIORITY_ORDER[rightAssignment.priority] : Number.POSITIVE_INFINITY;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return OPERATIONS.findIndex((operation) => operation.id === left.id) -
          OPERATIONS.findIndex((operation) => operation.id === right.id);
      }),
    [priorityAssignmentsByOperation]
  );

  return (
    <div className='flex w-full max-w-3xl flex-col items-center gap-6'>
      <DifficultySelector selected={difficulty} onSelect={setDifficulty} />
      <div className='space-y-2 text-center'>
        <h2 className='text-2xl font-extrabold tracking-tight text-slate-800'>
          Wybierz swoje wyzwanie
        </h2>
        <p className='text-sm text-slate-500'>
          Kazda kategoria ma ten sam uklad. Kolor tylko podpowiada temat.
        </p>
      </div>
      <div className='grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {sortedOperations.map((operation, index) => {
          const priorityAssignment = priorityAssignmentsByOperation[operation.id] ?? null;
          const accent = KANGUR_ACCENT_STYLES[operation.accent];

          return (
            <motion.button
              key={operation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(operation.id, difficulty)}
              data-testid={`operation-card-${operation.id}`}
              className={cn(
                KANGUR_OPTION_CARD_CLASSNAME,
                'relative flex min-h-[180px] flex-col gap-4 rounded-[30px] p-5',
                accent.hoverCard,
                priorityAssignment ? accent.activeCard : 'border-slate-200/80'
              )}
            >
              {priorityAssignment ? (
                <span
                  className={cn(
                    'absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em]',
                    'border border-amber-200 bg-amber-50 text-amber-700'
                  )}
                >
                  {PRIORITY_LABELS[priorityAssignment.priority]}
                </span>
              ) : null}
              <div className='flex items-start justify-between gap-3'>
                <span
                  className={cn(
                    'inline-flex h-12 w-12 items-center justify-center rounded-2xl text-3xl shadow-sm',
                    accent.icon
                  )}
                >
                  {operation.emoji}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    priorityAssignment ? accent.badge : 'border border-slate-200 bg-slate-50 text-slate-500'
                  )}
                >
                  {priorityAssignment ? 'Zadanie od rodzica' : 'Trening swobodny'}
                </span>
              </div>
              <div className='space-y-1 text-left'>
                <span className='block text-lg font-extrabold text-slate-800'>{operation.label}</span>
                <span className='block text-sm text-slate-500'>
                  {priorityAssignment
                    ? `${priorityAssignment.progress.percent}% · ${priorityAssignment.title}`
                    : 'Wejdz do serii pytan i cwicz we wlasnym tempie.'}
                </span>
              </div>
              <span className={cn('mt-auto text-sm font-semibold', accent.activeText)}>
                Zacznij lekcje
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
