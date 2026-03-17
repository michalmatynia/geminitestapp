'use client';

import { useEffect, useId, useMemo, useState } from 'react';

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
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SPACED_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  formatDuelDifficultyLabel,
  formatDuelOperationLabel,
  formatRelativeAge,
} from '@/features/kangur/ui/pages/duels/duels-helpers';
import { withKangurClientError } from '@/features/kangur/observability/client';

const kangurPlatform = getKangurPlatform();
const HOME_DUELS_INVITE_LIMIT = 4;
const HOME_DUELS_INVITE_TRANSITION_MS = 110;

type KangurGameHomeDuelsInvitesWidgetProps = {
  hideWhenScreenMismatch?: boolean;
};

export function KangurGameHomeDuelsInvitesWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeDuelsInvitesWidgetProps = {}): React.JSX.Element | null {
  const runtime = useKangurGameRuntime();
  const { basePath, screen, user } = runtime;
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
          setError('Nie udało się pobrać zaproszeń do pojedynków.');
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
      className={KANGUR_PANEL_GAP_CLASSNAME}
      padding='lg'
      surface='solid'
      variant='soft'
      role='region'
      aria-labelledby={headingId}
      data-testid='kangur-home-duels-invites'
    >
      <div className={`${KANGUR_SPACED_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
        <div className='space-y-1'>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <h3 id={headingId} className='text-base font-semibold text-slate-900'>
              Zaproszenia do pojedynku
            </h3>
            {visibleInvites.length > 0 ? (
              <KangurStatusChip accent='indigo' size='sm'>
                {visibleInvites.length}
              </KangurStatusChip>
            ) : null}
          </div>
          <p className='text-xs text-slate-600'>
            Prywatne wyzwania od innych graczy.
          </p>
        </div>
        <KangurButton
          asChild
          size='sm'
          variant='secondary'
          className='w-full sm:w-auto'
          data-doc-id='home_duels_invite'
        >
          <Link
            href={inviteHref}
            targetPageKey='Duels'
            transitionAcknowledgeMs={HOME_DUELS_INVITE_TRANSITION_MS}
            transitionSourceId='home-duels-invite:cta'
          >
            Wyślij zaproszenie
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
          Ładujemy zaproszenia…
        </KangurInfoCard>
      ) : null}

      {!isLoading && visibleInvites.length > 0 ? (
        <ul className={KANGUR_GRID_TIGHT_CLASSNAME} role='list' aria-label='Zaproszenia do pojedynku'>
          {visibleInvites.map((entry) => {
            const operationLabel = formatDuelOperationLabel(entry.operation);
            const difficultyLabel = formatDuelDifficultyLabel(entry.difficulty);
            return (
              <li key={entry.sessionId}>
                <KangurInfoCard
                  accent='indigo'
                  padding='md'
                  tone='accent'
                  className={`${KANGUR_SPACED_ROW_CLASSNAME} sm:items-center sm:justify-between`}
                  role='group'
                  aria-label={`Zaproszenie od ${entry.host.displayName}`}
                >
                  <div className='space-y-1'>
                    <div className='text-sm font-semibold text-slate-800'>
                      {entry.host.displayName}
                    </div>
                    <div className='text-xs text-slate-500'>
                      {operationLabel} • {difficultyLabel} • {entry.questionCount} pytań •{' '}
                      {entry.timePerQuestionSec}s / pytanie •{' '}
                      {formatRelativeAge(entry.updatedAt, nowMs)}
                    </div>
                  </div>
                  <KangurButton
                    asChild
                    size='sm'
                    variant='primary'
                    className='w-full sm:w-auto'
                  >
                    <Link
                      href={buildJoinHref(entry.sessionId)}
                      targetPageKey='Duels'
                      transitionAcknowledgeMs={HOME_DUELS_INVITE_TRANSITION_MS}
                      transitionSourceId={`home-duels-invite:${entry.sessionId}`}
                    >
                      Dołącz
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
          Brak zaproszeń. Wyślij własne wyzwanie, aby zaprosić znajomych.
        </KangurInfoCard>
      ) : null}
    </KangurGlassPanel>
  );
}
