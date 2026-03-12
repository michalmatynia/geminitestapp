'use client';

import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KANGUR_PROFILE_RECOMMENDATION_ACCENTS,
  buildKangurRecommendationHref,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurPanelIntro,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

const LEARNER_PROFILE_RECOMMENDATION_ROUTE_ACKNOWLEDGE_MS = 110;

export function KangurLearnerProfileRecommendationsWidget(): React.JSX.Element {
  const { basePath, snapshot } = useKangurLearnerProfileRuntime();
  const { entry: recommendationsContent } =
    useKangurPageContentEntry('learner-profile-recommendations');
  const sectionTitle = recommendationsContent?.title ?? 'Plan na dziś';
  const sectionSummary =
    recommendationsContent?.summary ??
    'Krótka lista kolejnych kroków na podstawie ostatnich wyników i aktywności.';

  return (
    <KangurGlassPanel padding='lg' surface='mistSoft' variant='soft'>
      <KangurPanelIntro
        className='mb-3'
        data-testid='learner-profile-recommendations-intro'
        description={sectionSummary}
        eyebrow={sectionTitle}
      />

      {snapshot.recommendations.length === 0 ? (
        <KangurEmptyState description='Brak rekomendacji do wyświetlenia.' padding='md' />
      ) : (
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-3'>
          {snapshot.recommendations.map((recommendation) => {
            const accent = KANGUR_PROFILE_RECOMMENDATION_ACCENTS[recommendation.priority];

            return (
              <KangurRecommendationCard
                action={
                  <KangurButton
                    asChild
                    className='mt-0'
                    size='sm'
                    variant='primary'
                    data-doc-id='learner_recommendation_action'
                  >
                    <Link
                      href={buildKangurRecommendationHref(basePath, recommendation.action)}
                      targetPageKey={recommendation.action.page}
                      transitionAcknowledgeMs={
                        LEARNER_PROFILE_RECOMMENDATION_ROUTE_ACKNOWLEDGE_MS
                      }
                      transitionSourceId={`learner-profile-recommendation:${recommendation.id}`}
                    >
                      {recommendation.action.label}
                    </Link>
                  </KangurButton>
                }
                accent={accent}
                className='rounded-[26px]'
                contentClassName='gap-3'
                dataTestId={`learner-profile-recommendation-${recommendation.id}`}
                description={recommendation.description}
                descriptionClassName='opacity-80'
                descriptionSize='xs'
                descriptionTestId={`learner-profile-recommendation-description-${recommendation.id}`}
                key={recommendation.id}
                labelContent={
                  <KangurAssignmentPriorityChip
                    accent={accent}
                    className='uppercase tracking-[0.14em]'
                    priority={recommendation.priority}
                    size='sm'
                  />
                }
                title={recommendation.title}
                titleTestId={`learner-profile-recommendation-title-${recommendation.id}`}
              />
            );
          })}
        </div>
      )}
    </KangurGlassPanel>
  );
}
