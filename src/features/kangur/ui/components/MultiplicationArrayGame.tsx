import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import {
  KANGUR_ACCENT_STYLES,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetricCard,
  KangurOptionCardButton,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { cn } from '@/shared/utils';

type MultiplicationArrayGameProps = {
  onFinish: () => void;
};

const TOTAL_ROUNDS = 6;

const GROUP_SIZES: Array<[number, number]> = [
  [2, 3],
  [3, 4],
  [2, 5],
  [4, 3],
  [3, 6],
  [5, 2],
  [4, 4],
  [3, 5],
  [2, 6],
  [4, 5],
  [3, 3],
  [5, 3],
];

function pickProblem(excludePrev?: [number, number]): [number, number] {
  const candidates = GROUP_SIZES.filter(([a, b]) => a !== excludePrev?.[0] || b !== excludePrev[1]);
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return pick ?? [3, 4];
}

const ROW_COLORS = [
  'bg-purple-400',
  'bg-indigo-400',
  'bg-violet-400',
  'bg-fuchsia-400',
  'bg-pink-400',
];

const ROW_GLOW = [
  'bg-purple-500 shadow-purple-300',
  'bg-indigo-500 shadow-indigo-300',
  'bg-violet-500 shadow-violet-300',
  'bg-fuchsia-500 shadow-fuchsia-300',
  'bg-pink-500 shadow-pink-300',
];

export default function MultiplicationArrayGame({
  onFinish,
}: MultiplicationArrayGameProps): React.JSX.Element {
  const [[a, b], setProblem] = useState<[number, number]>(() => pickProblem());
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const total = a * b;
  const collectedCount = collected.size * b;
  const allCollected = collected.size === a;

  useEffect(() => {
    if (allCollected && !celebrating && !done) {
      setCelebrating(true);
      const timer = setTimeout(() => {
        const newScore = score + 1;
        if (roundIndex + 1 >= TOTAL_ROUNDS) {
          const progress = loadProgress();
          const reward = createLessonPracticeReward(
            progress,
            'multiplication',
            newScore,
            TOTAL_ROUNDS
          );
          addXp(reward.xp, reward.progressUpdates);
          setXpEarned(reward.xp);
          setScore(newScore);
          setDone(true);
        } else {
          setScore(newScore);
          setRoundIndex((r) => r + 1);
          const next = pickProblem([a, b]);
          setProblem(next);
          setCollected(new Set());
          setCelebrating(false);
        }
      }, 1400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [allCollected, celebrating, done, score, roundIndex, a, b]);

  const handleTapGroup = (groupIndex: number): void => {
    if (collected.has(groupIndex) || celebrating) return;
    setCollected((prev) => new Set([...prev, groupIndex]));
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='w-full max-w-sm'
      >
        <KangurGlassPanel
          className='flex flex-col items-center gap-4 text-center'
          data-testid='multiplication-array-summary-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          <KangurDisplayEmoji data-testid='multiplication-array-summary-emoji' size='lg'>
            {percent === 100 ? '🏆' : percent >= 67 ? '🌟' : '💪'}
          </KangurDisplayEmoji>
          <h2 className='text-2xl font-extrabold text-slate-800'>
            Zebrałeś {score}/{TOTAL_ROUNDS} grup!
          </h2>
          {xpEarned > 0 && (
            <KangurStatusChip accent='violet' className='px-4 py-2 text-sm font-bold'>
              +{xpEarned} XP ✨
            </KangurStatusChip>
          )}
          <KangurProgressBar accent='indigo' animated size='md' value={percent} />
          <p className='text-slate-500'>
            {percent === 100
              ? 'Mistrz grupowania! Tabliczka zdobyta!'
              : percent >= 67
                ? 'Świetna robota! Prawie perfekcja!'
                : 'Dobra próba! Graj dalej, aby ćwiczyć!'}
          </p>
          <div className='flex gap-3 w-full'>
            <KangurButton
              className='flex-1'
              onClick={() => {
                setRoundIndex(0);
                setScore(0);
                setDone(false);
                setXpEarned(0);
                setCelebrating(false);
                const next = pickProblem();
                setProblem(next);
                setCollected(new Set());
              }}
              size='lg'
              variant='surface'
            >
              <RefreshCw className='w-4 h-4' /> Jeszcze raz
            </KangurButton>
            <KangurButton className='flex-1' onClick={onFinish} size='lg' variant='primary'>
              Gotowe!
            </KangurButton>
          </div>
        </KangurGlassPanel>
      </motion.div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      {/* Progress bar */}
      <div className='flex items-center gap-2 w-full'>
        <KangurProgressBar
          accent='indigo'
          className='flex-1'
          data-testid='multiplication-array-progress-bar'
          size='sm'
          value={(roundIndex / TOTAL_ROUNDS) * 100}
        />
        <span className='text-xs font-bold text-slate-400'>
          {roundIndex + 1}/{TOTAL_ROUNDS}
        </span>
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={`${roundIndex}-${a}-${b}`}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className='w-full'
        >
          <KangurGlassPanel
            className='flex flex-col items-center gap-5'
            data-testid='multiplication-array-round-shell'
            padding='lg'
            surface='solid'
            variant='soft'
          >
            {/* Problem header */}
            <div className='text-center'>
              <p className='text-xs font-bold text-purple-400 uppercase tracking-wide mb-1'>
                Dotknij każdą grupę, by ją zebrać!
              </p>
              <p className='text-3xl font-extrabold text-purple-600'>
                {a} × {b}{' '}
                <span className='text-slate-400'>
                  = {allCollected ? <span className='text-green-500'>{total}</span> : '?'}
                </span>
              </p>
            </div>

            {/* Running total counter */}
            <div className='flex items-center gap-2'>
              <KangurMetricCard
                accent='violet'
                align='center'
                className='min-w-[110px]'
                data-testid='multiplication-array-counter-collected'
                label='Zebrane'
                padding='sm'
                value={
                  <motion.span
                    key={collectedCount}
                    animate={{ scale: 1 }}
                    initial={{ scale: 1.4 }}
                    transition={{ duration: 0.25 }}
                  >
                    {collectedCount}
                  </motion.span>
                }
              />
              <div className='text-slate-300 text-2xl font-bold'>/</div>
              <KangurMetricCard
                accent='slate'
                align='center'
                className='min-w-[110px]'
                data-testid='multiplication-array-counter-target'
                label='Cel'
                padding='sm'
                value={total}
              />
            </div>

            {/* Groups grid */}
            <div className='flex flex-col gap-2 w-full'>
              {Array.from({ length: a }).map((_, groupIndex) => {
                const isCollected = collected.has(groupIndex);
                const color = ROW_COLORS[groupIndex % ROW_COLORS.length];
                const glow = ROW_GLOW[groupIndex % ROW_GLOW.length];
                const accent: KangurAccent = 'violet';
                return (
                  <motion.div
                    key={groupIndex}
                    whileHover={!isCollected && !celebrating ? { scale: 1.03 } : {}}
                    whileTap={!isCollected && !celebrating ? { scale: 0.97 } : {}}
                  >
                    <KangurOptionCardButton
                      accent={accent}
                      aria-pressed={isCollected}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-[24px] px-4 py-3 transition-all duration-300',
                        isCollected ? KANGUR_ACCENT_STYLES.violet.activeText : 'text-slate-700',
                        !isCollected && !celebrating ? 'cursor-pointer' : 'cursor-default'
                      )}
                      data-testid={`multiplication-array-group-${groupIndex}`}
                      emphasis={isCollected ? 'accent' : 'neutral'}
                      onClick={() => handleTapGroup(groupIndex)}
                      type='button'
                    >
                      <span
                        className={cn(
                          'w-5 text-center text-xs font-bold',
                          isCollected ? KANGUR_ACCENT_STYLES.violet.mutedText : 'text-slate-400'
                        )}
                      >
                        {groupIndex + 1}
                      </span>
                      <div className='flex gap-1 flex-wrap'>
                        {Array.from({ length: b }).map((_, dotIndex) => (
                          <motion.div
                            key={dotIndex}
                            initial={false}
                            animate={
                              isCollected ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0.4 }
                            }
                            transition={{ delay: isCollected ? dotIndex * 0.04 : 0, duration: 0.2 }}
                            className={`w-6 h-6 rounded-full shadow-sm ${
                              isCollected ? `${glow} shadow-md` : color
                            } opacity-80`}
                          />
                        ))}
                      </div>
                      {isCollected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className='ml-auto text-sm font-extrabold text-violet-600'
                        >
                          +{b} ✓
                        </motion.span>
                      )}
                    </KangurOptionCardButton>
                  </motion.div>
                );
              })}
            </div>

            {/* Celebration banner */}
            <AnimatePresence>
              {allCollected && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className='text-center'
                >
                  <p className='text-2xl font-extrabold text-green-600'>
                    🎉 {a} × {b} = {total}!
                  </p>
                  <p className='mt-1 text-sm text-slate-500'>
                    {a} grup po {b} = {total} razem
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instruction when not all collected */}
            {!allCollected && (
              <p className='text-center text-xs text-slate-400'>
                Zebrane: {collected.size}/{a} grup — dotknij kolejną!
              </p>
            )}
          </KangurGlassPanel>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
