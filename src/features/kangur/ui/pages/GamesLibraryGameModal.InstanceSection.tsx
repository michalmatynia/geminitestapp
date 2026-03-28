'use client';

import React from 'react';

import { KangurInfoCard } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';

import {
  GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME,
  GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME,
  GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME,
} from './GamesLibraryGameModal.utils';

export const InstanceSection = ({
  state,
}: {
  state: {
    game: { engineId: string };
    launchableRuntime: { engineId?: string; screen: string } | null;
    translations: (key: string) => string;
  };
}): React.JSX.Element => {
  const { translations, launchableRuntime, game } = state;

  return (
    <KangurInfoCard accent='violet' className='space-y-4' padding='lg'>
      <div className='space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
          {translations('modal.instances.eyebrow')}
        </div>
        <div className='text-lg font-black [color:var(--kangur-page-text)]'>
          {translations('modal.instances.title')}
        </div>
        <div className='text-sm [color:var(--kangur-page-muted-text)]'>
          {translations('modal.instances.description')}
        </div>
      </div>

      {!launchableRuntime ? (
        <div className={GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME}>
          {translations('modal.instances.unavailable')}
        </div>
      ) : (
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]'>
          <div className={cn(GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME, 'space-y-4 p-4')}>
            <div className='grid gap-3 md:grid-cols-2'>
              <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {translations('modal.instances.engineLabel')}
                </div>
                <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
                  {launchableRuntime.engineId ?? game.engineId}
                </div>
              </div>
              <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {translations('modal.instances.runtimeLabel')}
                </div>
                <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
                  {launchableRuntime.screen}
                </div>
              </div>
            </div>

            <div className={GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME}>
              {translations('modal.instances.unavailable')}
            </div>
          </div>
        </div>
      )}
    </KangurInfoCard>
  );
};
