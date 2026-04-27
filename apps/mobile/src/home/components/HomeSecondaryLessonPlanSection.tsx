import { Text, View } from 'react-native';

import {
  SectionCard,
} from '../homeScreenPrimitives';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { useHomeScreenDeferredPanels } from '../useHomeScreenDeferredPanels';
import {
  DeferredHomeInsightsLessonPlanDetails,
} from '../home-screen-deferred';
import { LiveHomeSecondaryLessonPlanSection } from './LiveHomeSecondaryLessonPlanSection';

export function HomeSecondaryLessonPlanSection(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const areDeferredHomeInsightLessonPlanDetailsReady = useHomeScreenDeferredPanels(
    'home:insights:lessons:plan:details',
    false,
  );

  return (
    <SectionCard
      title={copy({
        de: 'Lektionsplan zum Start',
        en: 'Lesson plan from home',
        pl: 'Plan lekcji ze startu',
      })}
    >
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'Sieh sofort, was wiederholt werden sollte und welche Lektion nur kurz aufgefrischt werden muss.',
          en: 'See right away what needs review and which lesson only needs a quick refresh.',
          pl: 'Od razu zobacz, co wymaga powtórki, a którą lekcję trzeba tylko krótko odświeżyć.',
        })}
      </Text>
      {!areDeferredHomeInsightLessonPlanDetailsReady ? (
        <DeferredHomeInsightsLessonPlanDetails />
      ) : (
        <LiveHomeSecondaryLessonPlanSection />
      )}
    </SectionCard>
  );
}
