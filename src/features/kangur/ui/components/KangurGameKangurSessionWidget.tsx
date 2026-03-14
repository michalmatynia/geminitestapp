import KangurGame from '@/features/kangur/ui/components/KangurGame';
import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import { KangurGameProvider } from '@/features/kangur/ui/context/KangurGameContext';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';

export function KangurGameKangurSessionWidget(): React.JSX.Element | null {
  const { activeSessionRecommendation, kangurMode, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'kangur') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center'>
      {activeSessionRecommendation ? (
        <KangurRecommendationCard
          accent='violet'
          bodyClassName='gap-2'
          className='mb-4 w-full rounded-[28px]'
          contentClassName='gap-2'
          dataTestId='kangur-kangur-session-recommendation-card'
          description={activeSessionRecommendation.description}
          descriptionRelaxed
          descriptionSize='xs'
          descriptionTestId='kangur-kangur-session-recommendation-description'
          headerExtras={
            <KangurStatusChip
              accent='amber'
              data-testid='kangur-kangur-session-recommendation-label'
              labelStyle='caps'
              size='sm'
            >
              {activeSessionRecommendation.label}
            </KangurStatusChip>
          }
          label='Polecony kierunek'
          labelSize='sm'
          labelStyle='caps'
          labelTestId='kangur-kangur-session-recommendation-chip'
          title={activeSessionRecommendation.title}
          titleTestId='kangur-kangur-session-recommendation-title'
        />
      ) : null}
      <KangurGameProvider mode={kangurMode} onBack={() => setScreen('kangur_setup')}>
        <KangurGame />
      </KangurGameProvider>
    </div>
  );
}
