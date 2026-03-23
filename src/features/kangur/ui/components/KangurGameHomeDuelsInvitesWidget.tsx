'use client';

import { useId, useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_SPACED_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { GAME_HOME_DUELS_SHELL_CLASSNAME } from '@/features/kangur/ui/pages/GameHome.constants';
import type { KangurHomeScreenVisibilityProps } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

const HOME_DUELS_INVITE_TRANSITION_MS = 110;

type KangurGameHomeDuelsInvitesWidgetProps = KangurHomeScreenVisibilityProps;

export function KangurGameHomeDuelsInvitesWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeDuelsInvitesWidgetProps = {}): React.JSX.Element | null {
  const inviteTranslations = useTranslations('KangurDuels.homeInvites');
  const runtime = useKangurGameRuntime();
  const { basePath, screen, user } = runtime;
  const isCoarsePointer = useKangurCoarsePointer();
  const canPlay = Boolean(user?.activeLearner?.id);
  const headingId = useId();

  const duelsHref = useMemo(() => createPageUrl('Duels', basePath), [basePath]);
  const inviteHref = `${duelsHref}#kangur-duels-invite`;

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  if (!canPlay) {
    return null;
  }

  return (
    <KangurGlassPanel
      className={GAME_HOME_DUELS_SHELL_CLASSNAME}
      padding='lg'
      surface='solid'
      variant='soft'
      role='region'
      aria-labelledby={headingId}
      data-testid='kangur-home-duels-invites'
    >
      <div className={`${KANGUR_SPACED_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
        <div className='min-w-0 flex-1 space-y-1'>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <h3 id={headingId} className='break-words text-base font-semibold text-slate-900'>
              {inviteTranslations('heading')}
            </h3>
          </div>
          <p className='text-xs text-slate-600'>
            {inviteTranslations('description')}
          </p>
        </div>
        <KangurButton
          asChild
          size='sm'
          variant='secondary'
          className={cn(
            'w-full sm:w-auto sm:shrink-0',
            isCoarsePointer && 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
          )}
          data-doc-id='home_duels_invite'
        >
          <Link
            href={inviteHref}
            prefetch={false}
            targetPageKey='Duels'
            transitionAcknowledgeMs={HOME_DUELS_INVITE_TRANSITION_MS}
            transitionSourceId='home-duels-invite:cta'
          >
            {inviteTranslations('sendInvite')}
          </Link>
        </KangurButton>
      </div>

      <KangurInfoCard accent='slate' padding='md' tone='neutral' role='status'>
        {inviteTranslations('empty')}
      </KangurInfoCard>
    </KangurGlassPanel>
  );
}
