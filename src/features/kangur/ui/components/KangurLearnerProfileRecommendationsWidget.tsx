'use client';

import Link from 'next/link';

import { KangurButton, KangurEmptyState, KangurInfoCard, KangurPanel, KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PROFILE_RECOMMENDATION_ACCENTS,
  buildKangurRecommendationHref,
  getKangurRecommendationButtonVariant,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileRecommendationsWidget(): React.JSX.Element {
  const { basePath, snapshot } = useKangurLearnerProfileRuntime();

  return (
    <KangurPanel padding='lg' variant='soft'>
      <div className='mb-3 text-sm font-bold uppercase tracking-wide text-gray-500'>
        Plan na dzis
      </div>

      {snapshot.recommendations.length === 0 ? (
        <KangurEmptyState description='Brak rekomendacji do wyswietlenia.' padding='md' />
      ) : (
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-3'>
          {snapshot.recommendations.map((recommendation) => {
            const accent = KANGUR_PROFILE_RECOMMENDATION_ACCENTS[recommendation.priority];

            return (
              <KangurInfoCard
                accent={accent}
                key={recommendation.id}
                className='rounded-[26px]'
                data-testid={`learner-profile-recommendation-${recommendation.id}`}
                padding='md'
                tone='accent'
              >
                <KangurStatusChip
                  accent={accent}
                  className='uppercase tracking-[0.14em]'
                  size='sm'
                >
                  {recommendation.priority === 'high'
                    ? 'Priorytet wysoki'
                    : recommendation.priority === 'medium'
                      ? 'Priorytet sredni'
                      : 'Priorytet niski'}
                </KangurStatusChip>
                <div className='mt-3 text-sm font-semibold'>{recommendation.title}</div>
                <div className='mt-1 text-xs opacity-80'>{recommendation.description}</div>
                <KangurButton
                  asChild
                  className='mt-3'
                  size='sm'
                  variant={getKangurRecommendationButtonVariant(recommendation.action.page)}
                  data-doc-id='learner_recommendation_action'
                >
                  <Link href={buildKangurRecommendationHref(basePath, recommendation.action)}>
                    {recommendation.action.label}
                  </Link>
                </KangurButton>
              </KangurInfoCard>
            );
          })}
        </div>
      )}
    </KangurPanel>
  );
}
