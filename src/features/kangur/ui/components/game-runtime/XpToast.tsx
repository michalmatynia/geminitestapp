'use client';

import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { BADGES } from '@kangur/core';

import KangurRewardBreakdownChips from './KangurRewardBreakdownChips';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurStatusChip,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_STACK_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  getLocalizedKangurBadgeDescription,
  getLocalizedKangurBadgeName,
  translateKangurProgressWithFallback,
} from '@/features/kangur/ui/services/progress-i18n';
import type { KangurXpToastState } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type XpToastProps = KangurXpToastState;

type ResolvedXpToastProps = {
  breakdown: KangurXpToastState['breakdown'];
  dailyQuest: KangurXpToastState['dailyQuest'];
  newBadges: KangurXpToastState['newBadges'];
  nextBadge: KangurXpToastState['nextBadge'];
  recommendation: KangurXpToastState['recommendation'];
  visible: boolean;
  xpGained: number;
};

const resolveXpToastProps = (props: XpToastProps): ResolvedXpToastProps => ({
  breakdown: props.breakdown ?? [],
  dailyQuest: props.dailyQuest ?? null,
  newBadges: props.newBadges ?? [],
  nextBadge: props.nextBadge ?? null,
  recommendation: props.recommendation ?? null,
  visible: props.visible,
  xpGained: props.xpGained,
});

const resolveXpToastLead = ({
  recommendation,
  resultTranslations,
}: {
  recommendation: KangurXpToastState['recommendation'];
  resultTranslations: ReturnType<typeof useTranslations>;
}): string =>
  recommendation
    ? translateKangurProgressWithFallback(
        resultTranslations,
        'xpToast.recommendationLead',
        'Świetnie, trzymasz polecany kierunek'
      )
    : translateKangurProgressWithFallback(
        resultTranslations,
        'xpToast.defaultLead',
        'Świetnie, zdobywasz kolejne punkty'
      );

function XpToastRewardPanel({
  dailyQuest,
  nextBadge,
  recommendation,
  resultTranslations,
  rewardBreakdown,
  xpGained,
}: {
  dailyQuest: KangurXpToastState['dailyQuest'];
  nextBadge: KangurXpToastState['nextBadge'];
  recommendation: KangurXpToastState['recommendation'];
  resultTranslations: ReturnType<typeof useTranslations>;
  rewardBreakdown: KangurXpToastState['breakdown'];
  xpGained: number;
}): React.JSX.Element | null {
  if (xpGained <= 0) {
    return null;
  }

  return (
    <KangurSurfacePanel
      accent='indigo'
      data-testid='xp-toast-xp-shell'
      padding='md'
    >
      <div className='flex items-center kangur-panel-gap'>
        <KangurStatusChip accent='indigo' className='text-sm font-bold'>
          +{xpGained} XP
        </KangurStatusChip>
        <span className='text-sm font-bold [color:var(--kangur-page-text)]'>
          {resolveXpToastLead({ recommendation, resultTranslations })}
        </span>
      </div>
      <KangurRewardBreakdownChips
        accent='slate'
        breakdown={rewardBreakdown}
        className='mt-2'
        dataTestId='xp-toast-breakdown'
        itemDataTestIdPrefix='xp-toast-breakdown'
        limit={4}
      />
      {nextBadge ? (
        <p
          className='mt-2 text-xs font-medium [color:var(--kangur-page-muted-text)]'
          data-testid='xp-toast-next-badge'
        >
          {translateKangurProgressWithFallback(
            resultTranslations,
            'xpToast.nextBadgePrefix',
            'Następna odznaka:'
          )}{' '}
          {nextBadge.emoji} {nextBadge.name} · {nextBadge.summary}
        </p>
      ) : null}
      {dailyQuest ? (
        <p
          className='mt-1 text-xs font-semibold text-emerald-700'
          data-testid='xp-toast-daily-quest'
        >
          {translateKangurProgressWithFallback(
            resultTranslations,
            'xpToast.dailyQuestPrefix',
            'Misja dnia ukończona:'
          )}{' '}
          {dailyQuest.title} · {dailyQuest.summary} · +{dailyQuest.xpAwarded} XP
        </p>
      ) : null}
      {recommendation ? (
        <p
          className='mt-1 text-xs font-semibold text-violet-700'
          data-testid='xp-toast-recommendation'
        >
          {translateKangurProgressWithFallback(
            resultTranslations,
            'xpToast.recommendationPrefix',
            'Polecony kierunek:'
          )}{' '}
          {recommendation.title} · {recommendation.summary}
        </p>
      ) : null}
    </KangurSurfacePanel>
  );
}

function XpToastBadgePanels({
  badgeDetails,
  resultTranslations,
}: {
  badgeDetails: Array<
    (typeof BADGES)[number] & {
      desc: string;
      name: string;
    }
  >;
  resultTranslations: ReturnType<typeof useTranslations>;
}): React.JSX.Element[] {
  return badgeDetails.map((badge) => (
    <KangurSurfacePanel
      accent='amber'
      data-testid={`xp-toast-badge-shell-${badge.id}`}
      key={badge.id}
      padding='md'
    >
      <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
        <div className='flex items-center kangur-panel-gap'>
          <KangurStatusChip accent='amber' className='text-sm font-bold'>
            {badge.emoji}{' '}
            {translateKangurProgressWithFallback(
              resultTranslations,
              'xpToast.newBadgeLabel',
              'Nowa odznaka'
            )}
          </KangurStatusChip>
          <span className='text-sm font-bold [color:var(--kangur-page-text)]'>
            {badge.name}
          </span>
        </div>
        <p
          className='text-xs font-medium [color:var(--kangur-page-muted-text)]'
          data-testid={`xp-toast-badge-desc-${badge.id}`}
        >
          {badge.desc}
        </p>
      </div>
    </KangurSurfacePanel>
  ));
}

const XpToast = memo((props: XpToastProps): React.JSX.Element => {
  const {
    breakdown,
    dailyQuest,
    newBadges,
    nextBadge,
    recommendation,
    visible,
    xpGained,
  } = resolveXpToastProps(props);
  const resultTranslations = useTranslations('KangurGameResult');
  const progressTranslations = useTranslations('KangurProgressRuntime');
  const routing = useOptionalKangurRouting();
  const embedded = routing?.embedded ?? false;
  const rewardBreakdown = breakdown;
  const badgeDetails = (newBadges ?? [])
    .map((badgeId) => BADGES.find((badge) => badge.id === badgeId))
    .filter((badge): badge is (typeof BADGES)[number] => Boolean(badge))
    .map((badge) => ({
      ...badge,
      name: getLocalizedKangurBadgeName({
        badgeId: badge.id,
        fallback: badge.name,
        translate: progressTranslations,
      }),
      desc: getLocalizedKangurBadgeDescription({
        badgeId: badge.id,
        fallback: badge.desc,
        translate: progressTranslations,
      }),
    }));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          role='status'
          aria-live='polite'
          aria-atomic='true'
          className={cn(
            'left-1/2 z-50 flex flex-col items-center gap-2 -translate-x-1/2 pointer-events-none',
            embedded ? 'absolute top-6' : 'fixed top-20'
          )}
        >
          <XpToastRewardPanel
            dailyQuest={dailyQuest}
            nextBadge={nextBadge}
            recommendation={recommendation}
            resultTranslations={resultTranslations}
            rewardBreakdown={rewardBreakdown}
            xpGained={xpGained}
          />
          <XpToastBadgePanels
            badgeDetails={badgeDetails}
            resultTranslations={resultTranslations}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default XpToast;
