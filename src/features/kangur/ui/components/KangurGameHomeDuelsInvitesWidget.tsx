'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurDuelLobbyEntry } from '@/features/kangur/shared/contracts/kangur-duels';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_SPACED_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { GAME_HOME_DUELS_SHELL_CLASSNAME } from '@/features/kangur/ui/pages/GameHome.constants';
import {
  formatDuelDifficultyLabel,
  formatDuelOperationLabel,
  formatRelativeAge,
} from '@/features/kangur/ui/pages/duels/duels-helpers';
import type { KangurHomeScreenVisibilityProps } from '@/features/kangur/ui/types';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { cn } from '@/features/kangur/shared/utils';

const kangurPlatform = getKangurPlatform();
const HOME_DUELS_INVITE_LIMIT = 4;
const HOME_DUELS_INVITE_TRANSITION_MS = 110;

type KangurGameHomeDuelsInvitesWidgetProps = KangurHomeScreenVisibilityProps;

export function KangurGameHomeDuelsInvitesWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeDuelsInvitesWidgetProps = {}): React.JSX.Element | null {
  const inviteTranslations = useTranslations('KangurDuels.homeInvites');
  const commonTranslations = useTranslations('KangurDuels.common');
  const runtime = useKangurGameRuntime();
  const { basePath, screen, user } = runtime;
  const isCoarsePointer = useKangurCoarsePointer();
  const canPlay = Boolean(user?.activeLearner?.id);
  const [inviteEntries, setInviteEntries] = useState<KangurDuelLobbyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingId = useId();

  const duelsHref = useMemo(() => createPageUrl('Duels', basePath), [basePath]);
  const inviteHref = `${duelsHref}#kangur-duels-invite`;
  const buildJoinHref = (sessionId: string): string =>
    appendKangurUrlParams(duelsHref, { join: sessionId }, basePath);

  useEffect(() => {
    if (!canPlay || (hideWhenScreenMismatch && screen !== 'home')) {
      setInviteEntries([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let isActive = true;
    setIsLoading(true);
    setError(null);

    void withKangurClientError(
      {
        source: 'kangur-home-duels-invites',
        action: 'load-invites',
        description: 'Load duel invite entries for the home screen.',
        context: {
          limit: HOME_DUELS_INVITE_LIMIT,
        },
      },
      async () => {
        const response = await kangurPlatform.duels.lobby({
          limit: HOME_DUELS_INVITE_LIMIT,
          signal: controller.signal,
        });
        if (!isActive) {
          return;
        }
        const invites = response.entries.filter((entry) => entry.visibility === 'private');
        setInviteEntries(invites);
        setIsLoading(false);
      },
      {
        fallback: undefined,
        shouldReport: (err) =>
          !(
            err &&
            typeof err === 'object' &&
            'name' in err &&
            (err as { name?: string }).name === 'AbortError'
          ),
        onError: (err) => {
          if (!isActive) {
            return;
          }
          if (
            err &&
            typeof err === 'object' &&
            'name' in err &&
            (err as { name?: string }).name === 'AbortError'
          ) {
            return;
          }
          setError(inviteTranslations('loadError'));
          setIsLoading(false);
        },
      }
    );

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [basePath, canPlay, hideWhenScreenMismatch, screen]);

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  if (!canPlay) {
    return null;
  }

  const visibleInvites = inviteEntries.slice(0, HOME_DUELS_INVITE_LIMIT);
  const nowMs = Date.now();

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
            {visibleInvites.length > 0 ? (
              <KangurStatusChip accent='indigo' size='sm'>
                {visibleInvites.length}
              </KangurStatusChip>
            ) : null}
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
            targetPageKey='Duels'
            transitionAcknowledgeMs={HOME_DUELS_INVITE_TRANSITION_MS}
            transitionSourceId='home-duels-invite:cta'
          >
            {inviteTranslations('sendInvite')}
          </Link>
        </KangurButton>
      </div>

      {error ? (
        <KangurInfoCard accent='rose' padding='md' tone='accent' role='alert'>
          {error}
        </KangurInfoCard>
      ) : null}

      {isLoading ? (
        <KangurInfoCard accent='slate' padding='md' tone='accent' role='status'>
          {inviteTranslations('loading')}
        </KangurInfoCard>
      ) : null}

      {!isLoading && visibleInvites.length > 0 ? (
        <ul
          className={KANGUR_GRID_TIGHT_CLASSNAME}
          role='list'
          aria-label={inviteTranslations('listAria')}
        >
          {visibleInvites.map((entry) => {
            const operationLabel = formatDuelOperationLabel(entry.operation, commonTranslations);
            const difficultyLabel = formatDuelDifficultyLabel(
              entry.difficulty,
              commonTranslations
            );
            return (
              <li key={entry.sessionId}>
                <KangurInfoCard
                  accent='indigo'
                  padding='md'
                  tone='accent'
                  className={`${KANGUR_SPACED_ROW_CLASSNAME} sm:items-center sm:justify-between`}
                  role='group'
                  aria-label={inviteTranslations('cardAria', {
                    name: entry.host.displayName,
                  })}
                >
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='break-words text-sm font-semibold text-slate-800'>
                      {entry.host.displayName}
                    </div>
                    <div className='break-words text-xs text-slate-500'>
                      {inviteTranslations('meta', {
                        operation: operationLabel,
                        difficulty: difficultyLabel,
                        questionCount: entry.questionCount,
                        seconds: entry.timePerQuestionSec,
                        updated: formatRelativeAge(entry.updatedAt, nowMs, commonTranslations),
                      })}
                    </div>
                  </div>
                  <KangurButton
                    asChild
                    size='sm'
                    variant='primary'
                    className={cn(
                      'w-full sm:w-auto sm:shrink-0',
                      isCoarsePointer &&
                        'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
                    )}
                  >
                    <Link
                      href={buildJoinHref(entry.sessionId)}
                      targetPageKey='Duels'
                      transitionAcknowledgeMs={HOME_DUELS_INVITE_TRANSITION_MS}
                      transitionSourceId={`home-duels-invite:${entry.sessionId}`}
                    >
                      {inviteTranslations('join')}
                    </Link>
                  </KangurButton>
                </KangurInfoCard>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!isLoading && !error && visibleInvites.length === 0 ? (
        <KangurInfoCard accent='slate' padding='md' tone='neutral' role='status'>
          {inviteTranslations('empty')}
        </KangurInfoCard>
      ) : null}
    </KangurGlassPanel>
  );
}
