import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

import { DIFFICULTY_CONFIG } from '@/features/kangur/ui/services/math-questions';
import type { KangurDifficulty } from '@/features/kangur/ui/types';

type DifficultySelectorProps = {
  selected: KangurDifficulty;
  onSelect: (difficulty: KangurDifficulty) => void;
};

const DIFFICULTIES: Array<{
  id: KangurDifficulty;
  color: string;
  border: string;
}> = [
  { id: 'easy', color: 'from-green-400 to-emerald-500', border: 'border-green-300' },
  { id: 'medium', color: 'from-yellow-400 to-amber-500', border: 'border-yellow-300' },
  { id: 'hard', color: 'from-red-400 to-rose-500', border: 'border-red-300' },
];

export default function DifficultySelector({
  selected,
  onSelect,
}: DifficultySelectorProps): React.JSX.Element {
  return (
    <div className='flex flex-col items-center gap-4 w-full'>
      <h2 className='text-xl font-bold text-gray-600'>Wybierz poziom trudnosci</h2>
      <div className='flex gap-3 w-full max-w-lg justify-center'>
        {DIFFICULTIES.map((difficulty, index) => {
          const config = DIFFICULTY_CONFIG[difficulty.id];
          const isSelected = selected === difficulty.id;
          return (
            <motion.button
              key={difficulty.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect(difficulty.id)}
              className={`flex-1 bg-gradient-to-br ${difficulty.color} text-white rounded-2xl py-4 px-2 flex flex-col items-center gap-1 shadow-lg font-bold transition-all border-4 ${isSelected ? difficulty.border : 'border-transparent'}`}
            >
              <span className='text-3xl'>{config.emoji}</span>
              <span className='text-lg'>{config.label}</span>
              <span className='flex items-center gap-1 text-xs opacity-90 font-normal'>
                <Clock className='w-3 h-3' /> {config.timeLimit}s
              </span>
              <span className='text-xs opacity-80 font-normal'>1-{config.range}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
