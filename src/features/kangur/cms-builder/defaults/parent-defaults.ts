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

export const createDefaultParentDashboardScreenComponents = (): PageComponentInput[] =>
  withOrders([
    makeBlockSection({
      id: 'kangur-parent-dashboard-hero',
      blocks: [makeWidgetBlock('kangur-widget-parent-dashboard-hero', 'parent-dashboard-hero')],
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-parent-dashboard-learners',
      blocks: [
        makeWidgetBlock(
          'kangur-widget-parent-dashboard-learners',
          'parent-dashboard-learner-management'
        ),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeGridSection({
      id: 'kangur-parent-dashboard-analytics',
      rows: [
        makeGridRow({
          id: 'kangur-parent-dashboard-analytics-row',
          columns: [
            makeGridColumn({
              id: 'kangur-parent-dashboard-progress-column',
              blocks: [
                makeWidgetBlock(
                  'kangur-widget-parent-dashboard-progress',
                  'parent-dashboard-progress',
                  {
                    displayMode: 'always',
                  }
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
      id: 'kangur-parent-dashboard-assignments',
      blocks: [
        makeWidgetBlock(
          'kangur-widget-parent-dashboard-assignments',
          'parent-dashboard-assignments',
          {
            displayMode: 'always',
          }
        ),
      ],
      paddingTop: 0,
    }),
  ]);
