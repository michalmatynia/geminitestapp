import { useTranslations } from 'next-intl';
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
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

const LEARNER_PROFILE_RECOMMENDATION_ROUTE_ACKNOWLEDGE_MS = 0;

export function KangurLearnerProfileRecommendationsWidget(): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.recommendations');
  const isCoarsePointer = useKangurCoarsePointer();
  const { basePath, snapshot } = useKangurLearnerProfileRuntime();
  const { entry: recommendationsContent } =
    useKangurPageContentEntry('learner-profile-recommendations');
  const sectionTitle = recommendationsContent?.title ?? translations('title');
  const sectionSummary =
    recommendationsContent?.summary ??
    translations('summary');

  return (
    <KangurGlassPanel padding='lg' surface='mistSoft' variant='soft'>
      <KangurPanelIntro
        className='mb-3'
        data-testid='learner-profile-recommendations-intro'
        description={sectionSummary}
        eyebrow={sectionTitle}
      />

      {snapshot.recommendations.length === 0 ? (
        <KangurEmptyState description={translations('emptyDescription')} padding='md' />
      ) : (
        <div className='grid grid-cols-1 kangur-panel-gap lg:grid-cols-3'>
          {snapshot.recommendations.map((recommendation) => {
            const accent = KANGUR_PROFILE_RECOMMENDATION_ACCENTS[recommendation.priority];

            return (
              <KangurRecommendationCard
                action={
                  <KangurButton
                    asChild
                    className={
                      isCoarsePointer
                        ? 'mt-0 w-full min-h-11 px-4 sm:w-auto'
                        : 'mt-0 w-full sm:w-auto'
                    }
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
                contentClassName='kangur-panel-gap'
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
