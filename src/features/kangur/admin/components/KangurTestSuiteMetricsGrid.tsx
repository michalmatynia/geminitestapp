import { AlertTriangle, ClipboardList, Folders, ListOrdered, Sparkles, WandSparkles } from 'lucide-react';

import type { KangurTestLibraryHealthSummary } from '../test-suite-health';
import { renderKangurAdminMetricCard } from './KangurAdminMetricCard';

type KangurTestSuiteMetricsGridProps = {
  libraryHealthSummary: KangurTestLibraryHealthSummary;
  groupCount: number;
};

export function renderKangurTestSuiteMetricsGrid({
  libraryHealthSummary,
  groupCount,
}: KangurTestSuiteMetricsGridProps): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-9'>
      {renderKangurAdminMetricCard({
        label: 'Suites',
        value: libraryHealthSummary.suiteCount,
        detail: 'Tracked test suites in the Kangur question bank',
        Icon: ClipboardList,
        tone: 'info',
      })}
      {renderKangurAdminMetricCard({
        label: 'Groups',
        value: groupCount,
        detail: 'Persisted test groups organizing suites in the library',
        Icon: Folders,
        tone: 'info',
      })}
      {renderKangurAdminMetricCard({
        label: 'Clean suites',
        value: libraryHealthSummary.readySuiteCount,
        detail: 'Suites whose current questions are structurally clean',
        Icon: WandSparkles,
        tone: 'success',
      })}
      {renderKangurAdminMetricCard({
        label: 'Needs review',
        value: libraryHealthSummary.suitesNeedingReviewCount,
        detail: 'Suites with questions that still need editorial review',
        Icon: AlertTriangle,
        tone: 'warning',
      })}
      {renderKangurAdminMetricCard({
        label: 'Needs fixes',
        value: libraryHealthSummary.suitesNeedingFixCount,
        detail: 'Suites containing blocked or inconsistent questions',
        Icon: AlertTriangle,
        tone: 'warning',
      })}
      {renderKangurAdminMetricCard({
        label: 'Question queue',
        value: libraryHealthSummary.reviewQueueQuestionCount,
        detail: `${libraryHealthSummary.totalQuestionCount} total questions, ${libraryHealthSummary.richQuestionCount} with rich UI`,
        Icon: Sparkles,
        tone: 'info',
      })}
      {renderKangurAdminMetricCard({
        label: 'Draft questions',
        value: libraryHealthSummary.draftQuestionCount,
        detail: 'Questions still being authored and not yet cleared for publish',
        Icon: ListOrdered,
        tone: 'neutral',
      })}
      {renderKangurAdminMetricCard({
        label: 'Ready to publish',
        value: libraryHealthSummary.readyToPublishQuestionCount,
        detail: `${libraryHealthSummary.publishableQuestionCount} structurally ready now, ${libraryHealthSummary.readyToPublishQuestionCount - libraryHealthSummary.publishableQuestionCount} still need review cleanup`,
        Icon: WandSparkles,
        tone: 'info',
      })}
      {renderKangurAdminMetricCard({
        label: 'Live suites',
        value: libraryHealthSummary.liveSuiteCount,
        detail: `${libraryHealthSummary.unstableLiveSuiteCount} live suites currently need attention`,
        Icon: Folders,
        tone: 'success',
      })}
      {renderKangurAdminMetricCard({
        label: 'Ready for live',
        value: libraryHealthSummary.liveReadySuiteCount,
        detail: `${libraryHealthSummary.partiallyPublishedSuiteCount} suites still have only a partial published set`,
        Icon: Folders,
        tone: 'warning',
      })}
    </div>
  );
}
