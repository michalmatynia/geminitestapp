// @ts-nocheck
import type { PageComponentInput } from '@/shared/contracts/cms';
import {
  makeBlockSection,
  makeWidgetBlock,
  withOrders,
} from '../project-factories';
import {
  makeGridColumn,
  makeGridRow,
  makeGridSection,
} from '../project-sections';

export const createDefaultLearnerProfileScreenComponents = (): PageComponentInput[] =>
  withOrders([
    makeBlockSection({
      id: 'kangur-profile-hero',
      blocks: [makeWidgetBlock('kangur-widget-profile-hero', 'learner-profile-hero')],
      paddingBottom: 0,
    }),
    makeGridSection({
      id: 'kangur-profile-summary-grid',
      rows: [
        makeGridRow({
          id: 'kangur-profile-summary-row',
          columns: [
            makeGridColumn({
              id: 'kangur-profile-summary-level',
              blocks: [
                makeWidgetBlock(
                  'kangur-widget-profile-level-progress',
                  'learner-profile-level-progress'
                ),
              ],
            }),
            makeGridColumn({
              id: 'kangur-profile-summary-recommendations',
              blocks: [
                makeWidgetBlock(
                  'kangur-widget-profile-recommendations',
                  'learner-profile-recommendations'
                ),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-profile-overview',
      blocks: [makeWidgetBlock('kangur-widget-profile-overview', 'learner-profile-overview')],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-profile-results',
      blocks: [makeWidgetBlock('kangur-widget-profile-results', 'learner-profile-results')],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeGridSection({
      id: 'kangur-profile-learning-grid',
      rows: [
        makeGridRow({
          id: 'kangur-profile-learning-row',
          columns: [
            makeGridColumn({
              id: 'kangur-profile-learning-assignments',
              blocks: [
                makeWidgetBlock(
                  'kangur-widget-profile-assignments',
                  'learner-profile-assignments'
                ),
              ],
            }),
            makeGridColumn({
              id: 'kangur-profile-learning-mastery',
              blocks: [
                makeWidgetBlock('kangur-widget-profile-mastery', 'learner-profile-mastery'),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-profile-performance',
      blocks: [
        makeWidgetBlock('kangur-widget-profile-performance', 'learner-profile-performance'),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-profile-sessions',
      blocks: [makeWidgetBlock('kangur-widget-profile-sessions', 'learner-profile-sessions')],
      paddingTop: 0,
    }),
  ]);
