import { motion } from 'framer-motion';
import { DIFFICULTY_CONFIG } from './mathQuestions';
import { Clock } from 'lucide-react';

const difficulties = [
  { id: 'easy', color: 'from-green-400 to-emerald-500', border: 'border-green-300' },
  { id: 'medium', color: 'from-yellow-400 to-amber-500', border: 'border-yellow-300' },
  { id: 'hard', color: 'from-red-400 to-rose-500', border: 'border-red-300' },
];

export default function DifficultySelector({ selected, onSelect }) {
  return (
    <div className='flex flex-col items-center gap-4 w-full'>
      <h2 className='text-xl font-bold text-gray-600'>Wybierz poziom trudności</h2>
      <div className='flex gap-3 w-full max-w-lg justify-center'>
        {difficulties.map((d, i) => {
          const cfg = DIFFICULTY_CONFIG[d.id];
          const isSelected = selected === d.id;
          return (
            <motion.button
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect(d.id)}
              className={`flex-1 bg-gradient-to-br ${d.color} text-white rounded-2xl py-4 px-2 flex flex-col items-center gap-1 shadow-lg font-bold transition-all border-4 ${isSelected ? d.border : 'border-transparent'}`}
            >
              <span className='text-3xl'>{cfg.emoji}</span>
              <span className='text-lg'>{cfg.label}</span>
              <span className='flex items-center gap-1 text-xs opacity-90 font-normal'>
                <Clock className='w-3 h-3' /> {cfg.timeLimit}s
              </span>
              <span className='text-xs opacity-80 font-normal'>1–{cfg.range}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
