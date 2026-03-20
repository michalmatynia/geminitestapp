import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import KangurRewardBreakdownChips from '@/features/kangur/ui/components/KangurRewardBreakdownChips';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurStatusChip,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_STACK_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { BADGES } from '@/features/kangur/ui/services/progress';
import {
  getLocalizedKangurBadgeDescription,
  getLocalizedKangurBadgeName,
  translateKangurProgressWithFallback,
} from '@/features/kangur/ui/services/progress-i18n';
import type { KangurXpToastState } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type XpToastProps = KangurXpToastState;

export default function XpToast({
  xpGained,
  newBadges,
  visible,
  breakdown = [],
  nextBadge = null,
  dailyQuest = null,
  recommendation = null,
}: XpToastProps): React.JSX.Element {
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
          {xpGained > 0 && (
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
                  {recommendation
                    ? translateKangurProgressWithFallback(
                        resultTranslations,
                        'xpToast.recommendationLead',
                        'Świetnie, trzymasz polecany kierunek'
                      )
                    : translateKangurProgressWithFallback(
                        resultTranslations,
                        'xpToast.defaultLead',
                        'Świetnie, zdobywasz kolejne punkty'
                      )}
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
          )}
          {badgeDetails.map((badge) => (
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
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
