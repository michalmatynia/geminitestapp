'use client';

import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import { KangurGlassPanel, KangurTextField } from '@/features/kangur/ui/design/primitives';
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
      </div>
    </KangurGlassPanel>
  );
}
