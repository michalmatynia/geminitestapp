'use client';

import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import {
  KangurButton,
  KangurGlassPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

type KangurGameHomeHeroWidgetProps = {
  hideWhenScreenMismatch?: boolean;
};

export function KangurGameHomeHeroWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeHeroWidgetProps = {}): React.JSX.Element | null {
  const runtime = useKangurGameRuntime();
  const {
    basePath,
    handleStartGame,
    navigateToLogin,
    playerName,
    screen,
    setPlayerName,
    user,
  } = runtime;
  const canAccessParentAssignments =
    runtime.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);

  if (hideWhenScreenMismatch && screen !== 'home') {
    return null;
  }

  if (canAccessParentAssignments) {
    return <KangurAssignmentSpotlight basePath={basePath} enabled={canAccessParentAssignments} />;
  }

  const playerNameInputId = 'kangur-home-player-name';
  const playerNameLabelId = 'kangur-home-player-name-label';

  return (
    <KangurGlassPanel
      className='w-full'
      data-testid='kangur-home-hero-shell'
      padding='lg'
      surface='mist'
      variant='soft'
    >
      <div className='px-1'>
        <label
          id={playerNameLabelId}
          htmlFor={playerNameInputId}
          className='block text-[14px] font-bold uppercase tracking-[0.12em] text-[#97a0c3]'
        >
          Imie gracza
        </label>
        <KangurTextField
          accent='indigo'
          className='mt-4 h-[58px] text-[18px]'
          data-doc-id='home_player_name_input'
          id={playerNameInputId}
          maxLength={20}
          placeholder='Wpisz swoje imie...'
          onKeyDown={(event) => {
            if (event.key === 'Enter' && playerName.trim()) {
              handleStartGame();
            }
          }}
          onChange={(event) => setPlayerName(event.target.value)}
          size='lg'
          type='text'
          value={playerName}
        />
        {!user ? (
          <div className='mt-5 rounded-[1.5rem] border border-indigo-200/80 bg-indigo-50/70 p-4 text-sm text-slate-700'>
            <p className='font-bold text-slate-900'>Grasz jako gosc</p>
            <p className='mt-1 leading-6'>
              Lokalna gra dziala od razu. Jesli rodzic chce synchronizowac postep i zarzadzac
              uczniami, moze zalogowac sie albo utworzyc konto bez opuszczania Kangura.
            </p>
            <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
              <KangurButton
                className='w-full sm:w-auto'
                data-doc-id='home_parent_login'
                onClick={navigateToLogin}
                size='sm'
                type='button'
                variant='surface'
              >
                Zaloguj rodzica
              </KangurButton>
              <KangurButton
                className='w-full sm:w-auto'
                data-doc-id='home_parent_create_account'
                onClick={() => navigateToLogin({ authMode: 'create-account' })}
                size='sm'
                type='button'
                variant='primary'
              >
                Utworz konto rodzica
              </KangurButton>
            </div>
          </div>
        ) : null}
      </div>
    </KangurGlassPanel>
  );
}
