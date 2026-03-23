import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  GAME_HOME_ACTIONS_LIST_CLASSNAME,
  GAME_HOME_ACTIONS_SHELL_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';
import type { KangurHomeScreenVisibilityProps } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type HomeActionTone = 'neutral' | 'violet' | 'sky' | 'mist' | 'sand';

type HomeAction = {
  id: string;
  label: string;
  symbol: string;
  trailingSymbol?: string;
  tone: HomeActionTone;
  href?: string;
  targetPageKey?: string;
  transitionSourceId?: string;
  prefetch?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

type HomeActionNavigationState = 'idle' | 'pressed' | 'transitioning';

const HOME_ACTION_TRANSITION_EASE = [0.22, 1, 0.36, 1] as const;

const resolveHomeActionNavigationState = ({
  activeTransitionSourceId,
  transitionPhase,
  transitionSourceId,
}: {
  activeTransitionSourceId?: string | null;
  transitionPhase?:
    | 'acknowledging'
    | 'idle'
    | 'pending'
    | 'waiting_for_ready'
    | 'revealing';
  transitionSourceId?: string;
}): HomeActionNavigationState => {
  if (!transitionSourceId || transitionSourceId !== activeTransitionSourceId) {
    return 'idle';
  }

  if (transitionPhase === 'acknowledging') {
    return 'pressed';
  }

  return 'transitioning';
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
    case 'duels':
      return 'home_duels_action';
    default:
      return 'home_quick_practice_action';
  }
};

function KangurHomeActionCard({
  action,
  navState,
  index,
}: {
  action: HomeAction;
  navState: HomeActionNavigationState;
  index: number;
}): React.JSX.Element {
  const actionDisabled = action.disabled;
  const actionId = action.id;
  const actionHref = action.href;
  const actionLabel = action.label;
  const actionOnClick = action.onClick;
  const actionPrefetch = action.prefetch;
  const actionSymbol = action.symbol;
  const actionTransitionSourceId = action.transitionSourceId;
  const actionTargetPageKey = action.targetPageKey;
  const actionTone = action.tone;
  const actionTrailingSymbol = action.trailingSymbol;
  const docId = resolveHomeActionDocId(actionId);
  const tone = HOME_ACTION_TONE_STYLES[actionTone];
  const isCoarsePointer = useKangurCoarsePointer();
  const wrapperClassName = cn(
    'relative home-action-featured-shell',
    tone.shell,
    navState !== 'idle' ? 'pointer-events-none' : null,
    actionDisabled ? 'pointer-events-none opacity-55' : null
  );
  const sharedClassName = cn(
    'relative z-10 w-full cursor-pointer text-center',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
    'disabled:cursor-not-allowed',
    'home-action-featured',
    isCoarsePointer ? 'touch-manipulation select-none min-h-[5rem] active:scale-[0.985]' : null
  );

  const content = (
    <>
      <span className='home-action-featured-face' />
      <span className='home-action-featured-accent' />
      <span className='pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.12)_36%,rgba(255,255,255,0)_58%)] opacity-82' />
      <span className='pointer-events-none absolute left-[10%] top-[18%] h-[34px] w-[140px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_70%)] opacity-60 blur-xl sm:h-[52px] sm:w-[220px]' />
      <span className='pointer-events-none absolute right-[8%] top-[14%] h-[36px] w-[110px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_72%)] opacity-45 blur-xl sm:h-[60px] sm:w-[180px]' />

      <span
        className={cn(
          'relative z-10 flex w-full min-w-0 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold leading-tight tracking-[-0.03em]',
          'sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-5 sm:text-[22px] sm:leading-none sm:tracking-[-0.04em]'
        )}
      >
        <span
          className={cn(
            'leading-none',
            'text-[18px] sm:text-[24px]',
            tone.icon,
            'sm:justify-self-end'
          )}
          aria-hidden='true'
        >
          {actionSymbol}
        </span>
        <span className='home-action-featured-label max-w-full break-words text-balance text-center sm:justify-self-center'>
          {actionLabel}
        </span>
        {actionTrailingSymbol ? (
          <span
            className={cn(
              'leading-none',
              'text-[18px] sm:text-[24px]',
              tone.icon,
              'sm:justify-self-start'
            )}
            aria-hidden='true'
          >
            {actionTrailingSymbol}
          </span>
        ) : (
          <span
            className={cn(
              'hidden sm:inline-flex leading-none',
              'text-[18px] sm:text-[24px]',
              tone.icon,
              'opacity-0 sm:justify-self-start'
            )}
            aria-hidden='true'
          >
            {actionSymbol}
          </span>
        )}
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
      initial={{ opacity: 0, y: 16, scale: 1 }}
      animate={
        navState === 'idle'
          ? { opacity: 1, scale: 1, y: 0 }
          : { opacity: 1, scale: 0.985, y: 0 }
      }
      transition={
        navState === 'idle'
          ? {
            delay: 0.06 * index,
            duration: 0.28,
            ease: HOME_ACTION_TRANSITION_EASE,
          }
          : {
            duration: 0.12,
            ease: HOME_ACTION_TRANSITION_EASE,
          }
      }
      className={wrapperClassName}
      data-nav-state={navState}
      data-home-action={actionId}
      data-testid={`kangur-home-action-${actionId}`}
    >
      <div className='home-action-featured-underlay' />
      {actionHref ? (
        <Link
          href={actionHref}
          className={sharedClassName}
          data-doc-id={docId}
          aria-label={actionLabel}
          prefetch={actionPrefetch}
          targetPageKey={actionTargetPageKey}
          transitionSourceId={actionTransitionSourceId}
        >
          {content}
        </Link>
      ) : (
        <button
          type='button'
          onClick={actionOnClick}
          disabled={actionDisabled}
          className={sharedClassName}
          data-doc-id={docId}
          aria-label={actionLabel}
        >
          {content}
        </button>
      )}
    </motion.div>
  );
}

type KangurGameHomeActionsWidgetProps = KangurHomeScreenVisibilityProps;

export function KangurGameHomeActionsWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeActionsWidgetProps = {}): React.JSX.Element | null {
  const translations = useTranslations('KangurGameHomeActions');
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const { basePath, canStartFromHome, handleStartGame, screen, setScreen } =
    useKangurGameRuntime();
  const { subject } = useKangurSubjectFocus();

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  const actions: HomeAction[] = [
    {
      id: 'lessons',
      label: translations('actions.lessons'),
      symbol: '📚',
      tone: 'neutral',
      href: createPageUrl('Lessons', basePath),
      targetPageKey: 'Lessons',
      transitionSourceId: 'game-home-action:lessons',
    },
    {
      id: 'play',
      label: translations('actions.play'),
      symbol: '🪐',
      trailingSymbol: '🚀',
      tone: 'violet',
      onClick: handleStartGame,
      disabled: !canStartFromHome,
    },
    {
      id: 'duels',
      label: translations('actions.duels'),
      symbol: '⚔️',
      trailingSymbol: '🏆',
      tone: 'sky',
      href: createPageUrl('Duels', basePath),
      prefetch: false,
      targetPageKey: 'Duels',
      transitionSourceId: 'game-home-action:duels',
    },
    {
      id: 'kangur',
      label: translations('actions.kangur'),
      symbol: '🦘',
      tone: 'sand',
      onClick: () => setScreen('kangur_setup'),
      disabled: !canStartFromHome,
    },
  ];
  const visibleActions =
    subject === 'maths' ? actions : actions.filter((action) => action.id !== 'kangur');

  return (
    <KangurGlassPanel
      className={GAME_HOME_ACTIONS_SHELL_CLASSNAME}
      data-testid='kangur-home-actions-shell'
      padding='lg'
      surface='mist'
      variant='soft'
    >
      <section aria-labelledby='kangur-home-actions-heading'>
        <h3 id='kangur-home-actions-heading' className='sr-only'>
          {translations('sectionLabel')}
        </h3>
        <div className={GAME_HOME_ACTIONS_LIST_CLASSNAME} data-testid='kangur-home-actions-list'>
          {visibleActions.map((action, index) => (
            <KangurHomeActionCard
              key={action.id}
              action={action}
              navState={resolveHomeActionNavigationState({
                activeTransitionSourceId: routeTransitionState?.activeTransitionSourceId,
                transitionPhase: routeTransitionState?.transitionPhase,
                transitionSourceId: action.transitionSourceId,
              })}
              index={index}
            />
          ))}
        </div>
      </section>
    </KangurGlassPanel>
  );
}
