'use client';

import { LogIn } from 'lucide-react';

import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import { KangurButton, KangurPanel, KangurTextField } from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameHomeHeroWidget(): React.JSX.Element | null {
  const {
    basePath,
    handleStartGame,
    navigateToLogin,
    playerName,
    screen,
    setPlayerName,
    user,
  } = useKangurGameRuntime();

  if (screen !== 'home') {
    return null;
  }

  if (user) {
    return <KangurAssignmentSpotlight basePath={basePath} />;
  }

  const playerNameInputId = 'kangur-home-player-name';
  const playerNameLabelId = 'kangur-home-player-name-label';
  const playerNameHintId = 'kangur-home-player-name-hint';

  return (
    <KangurPanel className='w-full border-white/78 bg-white/58' padding='lg' variant='elevated'>
      <div className='px-1'>
        <label
          id={playerNameLabelId}
          htmlFor={playerNameInputId}
          className='block text-[14px] font-bold uppercase tracking-[0.12em] text-[#97a0c3]'
        >
          Imie gracza
        </label>
        <KangurTextField
          aria-describedby={playerNameHintId}
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
        <div className='mt-4 flex flex-wrap items-center justify-between gap-3 text-[15px] text-[#8c97bb]'>
          <p id={playerNameHintId}>Zaloguj się, aby Twój wynik pojawił się na tablicy.</p>
          <KangurButton
            onClick={navigateToLogin}
            size='sm'
            variant='secondary'
            data-doc-id='profile_login'
          >
            <LogIn className='h-4 w-4' /> Zaloguj się
          </KangurButton>
        </div>
      </div>
    </KangurPanel>
  );
}
