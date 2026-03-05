import { useState } from 'react';
import { motion } from 'framer-motion';

import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/ui/types';

export type OperationSelectorProps = {
  onSelect: (operation: KangurOperation, difficulty: KangurDifficulty) => void;
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

export default function OperationSelector({ onSelect }: OperationSelectorProps): React.JSX.Element {
  const [difficulty, setDifficulty] = useState<KangurDifficulty>('medium');

  return (
    <div className='flex flex-col items-center gap-6 w-full max-w-lg'>
      <DifficultySelector selected={difficulty} onSelect={setDifficulty} />
      <h2 className='text-2xl font-bold text-gray-700'>Wybierz swoje wyzwanie!</h2>
      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 w-full'>
        {OPERATIONS.map((operation, index) => (
          <motion.button
            key={operation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(operation.id, difficulty)}
            className={`bg-gradient-to-br ${operation.color} text-white rounded-2xl p-5 flex flex-col items-center gap-2 shadow-lg font-bold text-lg`}
          >
            <span className='text-4xl'>{operation.emoji}</span>
            <span>{operation.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
