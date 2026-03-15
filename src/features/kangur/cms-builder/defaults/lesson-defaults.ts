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

export const createDefaultLessonsScreenComponents = (): PageComponentInput[] =>
  withOrders([
    makeBlockSection({
      id: 'kangur-lessons-intro',
      title: 'Lekcje',
      description:
        'Ten ekran jest już składany w CMS builderze. Zmieniaj układ, teksty i rozmieszczenie widgetów bez wracania do kodu strony.',
      blocks: [
        makeWidgetBlock('kangur-widget-lessons-progress', 'player-progress'),
        makeWidgetBlock('kangur-widget-lessons-assignments', 'priority-assignments', {
          title: 'Priorytetowe zadania',
          emptyLabel: 'Brak aktywnych priorytetów.',
          limit: 2,
        }),
      ],
    }),
    makeGridSection({
      id: 'kangur-lessons-workspace',
      rows: [
        makeGridRow({
          id: 'kangur-lessons-workspace-row',
          columns: [
            makeGridColumn({
              id: 'kangur-lessons-column-catalog',
              blocks: [makeWidgetBlock('kangur-widget-lesson-catalog', 'lesson-catalog')],
            }),
            makeGridColumn({
              id: 'kangur-lessons-column-active',
              blocks: [
                makeWidgetBlock('kangur-widget-active-lesson-panel', 'active-lesson-panel'),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-lessons-navigation',
      blocks: [makeWidgetBlock('kangur-widget-lesson-navigation', 'lesson-navigation')],
      paddingTop: 0,
    }),
  ]);
