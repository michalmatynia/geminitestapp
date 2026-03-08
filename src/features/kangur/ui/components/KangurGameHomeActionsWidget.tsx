'use client';

import { motion } from 'framer-motion';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { cn } from '@/shared/utils';

type HomeActionTone = 'neutral' | 'violet' | 'sky' | 'mist' | 'sand';

type HomeAction = {
  id: string;
  label: string;
  symbol: string;
  trailingSymbol?: string;
  tone: HomeActionTone;
  href?: string;
  targetPageKey?: string;
  onClick?: () => void;
  disabled?: boolean;
};

const HOME_ACTION_TONE_STYLES: Record<
  HomeActionTone,
  {
    shell: string;
    icon: string;
  }
> = {
  neutral: {
    shell: 'home-action-theme-neutral',
    icon: 'drop-shadow-[0_3px_8px_rgba(86,97,211,0.16)]',
  },
  violet: {
    shell: 'home-action-theme-violet',
    icon: 'drop-shadow-[0_3px_8px_rgba(74,54,190,0.12)]',
  },
  sky: {
    shell: 'home-action-theme-sky',
    icon: 'drop-shadow-[0_3px_8px_rgba(78,146,225,0.18)]',
  },
  mist: {
    shell: 'home-action-theme-mist',
    icon: 'drop-shadow-[0_3px_8px_rgba(103,126,220,0.16)]',
  },
  sand: {
    shell: 'home-action-theme-sand',
    icon: 'drop-shadow-[0_3px_8px_rgba(224,123,74,0.18)]',
  },
};

const resolveHomeActionDocId = (actionId: string): string => {
  switch (actionId) {
    case 'lessons':
      return 'home_lessons_action';
    case 'kangur':
      return 'home_kangur_exam_action';
    default:
      return 'home_quick_practice_action';
  }
};

function KangurHomeActionCard({
  action,
  index,
}: {
  action: HomeAction;
  index: number;
}): React.JSX.Element {
  const docId = resolveHomeActionDocId(action.id);
  const tone = HOME_ACTION_TONE_STYLES[action.tone];
  const wrapperClassName = cn(
    'relative home-action-featured-shell',
    tone.shell,
    action.disabled ? 'pointer-events-none opacity-55' : null
  );
  const sharedClassName = cn(
    'relative z-10 w-full cursor-pointer text-center',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
    'disabled:cursor-not-allowed',
    'home-action-featured'
  );

  const content = (
    <>
      <span className='home-action-featured-face' />
      <span className='home-action-featured-accent' />
      <span className='pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.12)_36%,rgba(255,255,255,0)_58%)] opacity-90' />
      <span className='pointer-events-none absolute left-[10%] top-[18%] h-[34px] w-[140px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_70%)] opacity-60 blur-xl sm:h-[52px] sm:w-[220px]' />
      <span className='pointer-events-none absolute right-[8%] top-[14%] h-[36px] w-[110px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_72%)] opacity-45 blur-xl sm:h-[60px] sm:w-[180px]' />

      <span
        className={cn(
          'relative z-10 flex min-w-0 items-center justify-center gap-4 text-[18px] font-semibold tracking-[-0.04em] sm:gap-5 sm:text-[22px]'
        )}
      >
        <span
          className={cn(
            'leading-none',
            'text-[20px] sm:text-[24px]',
            tone.icon
          )}
          aria-hidden='true'
        >
          {action.symbol}
        </span>
        <span>{action.label}</span>
        {action.trailingSymbol ? (
          <span
            className={cn(
              'leading-none',
              'text-[20px] sm:text-[24px]',
              tone.icon
            )}
            aria-hidden='true'
          >
            {action.trailingSymbol}
          </span>
        ) : null}
      </span>

      <span className='home-action-featured-sparkle home-action-featured-sparkle-1 pointer-events-none absolute left-[14%] top-[28%] text-[9px] text-white/60 sm:text-[13px]'>
        ✦
      </span>
      <span className='home-action-featured-sparkle home-action-featured-sparkle-2 pointer-events-none absolute right-[14%] top-[22%] text-[10px] text-white/60 sm:text-[14px]'>
        ✦
      </span>
      <span className='home-action-featured-sparkle home-action-featured-sparkle-3 pointer-events-none absolute right-[8%] top-[54%] text-[9px] text-white/50 sm:text-[12px]'>
        ✦
      </span>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index }}
      className={wrapperClassName}
    >
      <div className='home-action-featured-underlay' />
      {action.href ? (
        <Link
          href={action.href}
          className={sharedClassName}
          data-doc-id={docId}
          targetPageKey={action.targetPageKey}
        >
          {content}
        </Link>
      ) : (
        <button
          type='button'
          onClick={action.onClick}
          disabled={action.disabled}
          className={sharedClassName}
          data-doc-id={docId}
        >
          {content}
        </button>
      )}
    </motion.div>
  );
}

type KangurGameHomeActionsWidgetProps = {
  hideWhenScreenMismatch?: boolean;
};

export function KangurGameHomeActionsWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeActionsWidgetProps = {}): React.JSX.Element | null {
  const { basePath, canStartFromHome, handleStartGame, screen, setScreen } =
    useKangurGameRuntime();

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  const actions: HomeAction[] = [
    {
      id: 'lessons',
      label: 'Lekcje',
      symbol: '📚',
      tone: 'neutral',
      href: createPageUrl('Lessons', basePath),
      targetPageKey: 'Lessons',
    },
    {
      id: 'play',
      label: 'Grajmy!',
      symbol: '🪐',
      trailingSymbol: '🚀',
      tone: 'violet',
      onClick: handleStartGame,
      disabled: !canStartFromHome,
    },
    {
      id: 'training',
      label: 'Trening mieszany',
      symbol: '🤸',
      tone: 'sky',
      onClick: () => setScreen('training'),
      disabled: !canStartFromHome,
    },
    {
      id: 'kangur',
      label: 'Kangur Matematyczny',
      symbol: '🦘',
      tone: 'sand',
      onClick: () => setScreen('kangur_setup'),
      disabled: !canStartFromHome,
    },
  ];

  return (
    <KangurGlassPanel
      className='w-full shadow-[0_18px_40px_-28px_rgba(168,175,216,0.18)]'
      data-testid='kangur-home-actions-shell'
      padding='lg'
      surface='mist'
      variant='soft'
    >
      <section aria-labelledby='kangur-home-actions-heading'>
        <h3 id='kangur-home-actions-heading' className='sr-only'>
          Wybierz aktywnosc
        </h3>
        <div className='space-y-6 sm:space-y-7' data-testid='kangur-home-actions-list'>
          {actions.map((action, index) => (
            <KangurHomeActionCard key={action.id} action={action} index={index} />
          ))}
        </div>
      </section>
    </KangurGlassPanel>
  );
}
