import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/ui/types';

export type OperationSelectorProps = {
  onSelect: (operation: KangurOperation, difficulty: KangurDifficulty) => void;
  priorityAssignmentsByOperation?: Partial<
    Record<KangurOperation, KangurAssignmentSnapshot & { target: { type: 'practice' } }>
  >;
};

const OPERATIONS: Array<{
  id: KangurOperation;
  label: string;
  color: string;
  emoji: string;
}> = [
  { id: 'addition', label: 'Dodawanie', color: 'from-green-400 to-emerald-500', emoji: '➕' },
  { id: 'subtraction', label: 'Odejmowanie', color: 'from-blue-400 to-cyan-500', emoji: '➖' },
  { id: 'multiplication', label: 'Mnozenie', color: 'from-purple-400 to-violet-500', emoji: '✖️' },
  { id: 'division', label: 'Dzielenie', color: 'from-orange-400 to-amber-500', emoji: '➗' },
  { id: 'decimals', label: 'Ulamki', color: 'from-teal-400 to-cyan-600', emoji: '🔢' },
  { id: 'powers', label: 'Potegi', color: 'from-yellow-400 to-orange-500', emoji: '⚡' },
  { id: 'roots', label: 'Pierwiastki', color: 'from-indigo-400 to-blue-600', emoji: '√' },
  { id: 'clock', label: 'Zegar', color: 'from-sky-400 to-blue-500', emoji: '🕐' },
  { id: 'mixed', label: 'Mieszane', color: 'from-pink-400 to-rose-500', emoji: '🎲' },
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
    <div className='flex flex-col items-center gap-6 w-full max-w-lg'>
      <DifficultySelector selected={difficulty} onSelect={setDifficulty} />
      <h2 className='text-2xl font-bold text-gray-700'>Wybierz swoje wyzwanie!</h2>
      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 w-full'>
        {sortedOperations.map((operation, index) => {
          const priorityAssignment = priorityAssignmentsByOperation[operation.id] ?? null;

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
              className={`relative bg-gradient-to-br ${operation.color} text-white rounded-2xl p-5 flex flex-col items-center gap-2 shadow-lg font-bold text-lg ${
                priorityAssignment ? 'ring-4 ring-amber-200/90 shadow-amber-100' : ''
              }`}
            >
              {priorityAssignment ? (
                <span className='absolute right-2 top-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white'>
                  {PRIORITY_LABELS[priorityAssignment.priority]}
                </span>
              ) : null}
              <span className='text-4xl'>{operation.emoji}</span>
              <span>{operation.label}</span>
              {priorityAssignment ? (
                <>
                  <span className='rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white'>
                    Zadanie od rodzica
                  </span>
                  <span className='text-center text-[11px] font-medium text-white/90'>
                    {priorityAssignment.progress.percent}% · {priorityAssignment.title}
                  </span>
                </>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
