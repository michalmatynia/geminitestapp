import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

import { DIFFICULTY_CONFIG } from '@/features/kangur/ui/services/math-questions';
import {
  KangurOptionCardButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type { KangurDifficulty } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type DifficultySelectorProps = {
  selected: KangurDifficulty;
  onSelect: (difficulty: KangurDifficulty) => void;
};

const DIFFICULTIES: Array<{
  id: KangurDifficulty;
  accent: KangurAccent;
}> = [
  { id: 'easy', accent: 'emerald' },
  { id: 'medium', accent: 'amber' },
  { id: 'hard', accent: 'rose' },
];

export default function DifficultySelector({
  selected,
  onSelect,
}: DifficultySelectorProps): React.JSX.Element {
  return (
    <div className='flex w-full flex-col items-center gap-4'>
      <div className='space-y-1 text-center'>
        <h2 className='text-xl font-extrabold tracking-tight text-slate-800'>
          Wybierz poziom trudnosci
        </h2>
        <p className='text-sm text-slate-500'>Ten sam uklad, tylko rosnacy poziom wyzwania.</p>
      </div>
      <div className='grid w-full max-w-3xl gap-3 md:grid-cols-3'>
        {DIFFICULTIES.map((difficulty, index) => {
          const config = DIFFICULTY_CONFIG[difficulty.id];
          const isSelected = selected === difficulty.id;
          const accent = KANGUR_ACCENT_STYLES[difficulty.accent];
          return (
            <motion.div
              key={difficulty.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className='w-full'
            >
              <KangurOptionCardButton
                accent={difficulty.accent}
                className='flex w-full flex-col items-center gap-3 rounded-[28px] px-4 py-5 text-center'
                data-testid={`difficulty-option-${difficulty.id}`}
                emphasis={isSelected ? 'accent' : 'neutral'}
                onClick={() => onSelect(difficulty.id)}
                type='button'
              >
                <span
                  className={cn(
                    'inline-flex h-12 w-12 items-center justify-center rounded-2xl text-3xl shadow-sm',
                    accent.icon
                  )}
                >
                  {config.emoji}
                </span>
                <span
                  className={cn(
                    'text-lg font-extrabold',
                    isSelected ? accent.activeText : 'text-slate-800'
                  )}
                >
                  {config.label}
                </span>
                <KangurStatusChip accent={difficulty.accent} className='gap-1' size='sm'>
                  <Clock className='h-3 w-3' /> {config.timeLimit}s
                </KangurStatusChip>
                <span className={cn('text-xs', isSelected ? accent.mutedText : 'text-slate-500')}>
                  Zakres 1-{config.range}
                </span>
              </KangurOptionCardButton>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
