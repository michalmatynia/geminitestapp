import React from 'react';
import { motion } from 'framer-motion';
import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import { useMultiplicationArrayGame } from './context';
import {
  resolveMultiplicationArrayButtonClassName,
  resolveMultiplicationArrayIndexClassName,
  resolveMultiplicationArrayDotClassName,
} from './ui-utils';
import { ROW_COLORS, ROW_GLOW } from './constants';

export function MultiplicationArrayGroupCard({
  groupIndex,
}: {
  groupIndex: number;
}): React.JSX.Element {
  const { b, celebrating, collected, isCoarsePointer, onTapGroup } = useMultiplicationArrayGame();
  const isCollected = collected.has(groupIndex);
  const color = ROW_COLORS[groupIndex % ROW_COLORS.length] ?? ROW_COLORS[0];
  const glow = ROW_GLOW[groupIndex % ROW_GLOW.length] ?? ROW_GLOW[0];

  return (
    <KangurAnswerChoiceCard
      accent='violet'
      aria-pressed={isCollected}
      buttonClassName={resolveMultiplicationArrayButtonClassName({
        celebrating,
        isCoarsePointer,
        isCollected,
      })}
      data-testid={`multiplication-array-group-${groupIndex}`}
      emphasis={isCollected ? 'accent' : 'neutral'}
      hoverScale={1.03}
      interactive={!isCollected && !celebrating}
      onClick={() => onTapGroup(groupIndex)}
      tapScale={0.97}
      type='button'
    >
      <span className={resolveMultiplicationArrayIndexClassName(isCollected)}>{groupIndex + 1}</span>
      <div className='flex flex-wrap gap-1'>
        {Array.from({ length: b }).map((_, dotIndex) => (
          <motion.div
            key={dotIndex}
            animate={isCollected ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0.4 }}
            className={resolveMultiplicationArrayDotClassName({ color, glow, isCollected })}
            initial={false}
            transition={{ delay: isCollected ? dotIndex * 0.04 : 0, duration: 0.2 }}
          />
        ))}
      </div>
      {isCollected ? (
        <motion.span
          animate={{ scale: 1 }}
          className='ml-auto text-sm font-extrabold text-violet-600'
          initial={{ scale: 0 }}
        >
          +{b} ✓
        </motion.span>
      ) : null}
    </KangurAnswerChoiceCard>
  );
}
