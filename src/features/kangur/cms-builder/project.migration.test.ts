import { describe, expect, it } from 'vitest';

import type { BlockInstance, PageComponentInput } from '@/shared/contracts/cms';

import { createDefaultKangurCmsProject } from './project-defaults';
import { parseKangurCmsProject } from './project';

const blockContainsWidgetId = (block: BlockInstance, widgetId: string): boolean =>
  (block.type === 'KangurWidget' && block.settings['widgetId'] === widgetId) ||
  Boolean(block.blocks?.some((child) => blockContainsWidgetId(child, widgetId)));

const componentContainsWidgetId = (component: PageComponentInput, widgetId: string): boolean =>
  component.content.blocks.some((block) => blockContainsWidgetId(block, widgetId));

const screenContainsWidgetId = (
  components: PageComponentInput[],
  widgetId: string
): boolean => components.some((component) => componentContainsWidgetId(component, widgetId));

describe('parseKangurCmsProject results ownership migration', () => {
  it('moves legacy parent-dashboard scores ownership into learner profile results', () => {
    const project = createDefaultKangurCmsProject('pl');

    project.screens.LearnerProfile.components = project.screens.LearnerProfile.components.filter(
      (component) => !componentContainsWidgetId(component, 'learner-profile-results')
    );

    const analyticsSection = project.screens.ParentDashboard.components.find((component) =>
      component.content.sectionId === 'kangur-parent-dashboard-analytics'
    );
    const firstRow = analyticsSection?.content.blocks[0];
    if (!firstRow?.blocks) {
      throw new Error('Expected parent dashboard analytics row');
    }
    firstRow.blocks.push({
      id: 'kangur-parent-dashboard-scores-column',
      type: 'Column',
      settings: {
        columnSpan: 12,
        columnGap: 16,
      },
      blocks: [
        {
          id: 'kangur-widget-parent-dashboard-scores',
          type: 'KangurWidget',
          settings: {
            widgetId: 'parent-dashboard-scores',
            title: '',
            emptyLabel: '',
            limit: 3,
            displayMode: 'always',
          },
        },
      ],
    });

    const migrated = parseKangurCmsProject(JSON.stringify(project), {
      fallbackToDefault: false,
      locale: 'pl',
    });

    if (!migrated) {
      throw new Error('Expected migrated CMS project');
    }

    expect(
      screenContainsWidgetId(migrated.screens.ParentDashboard.components, 'parent-dashboard-scores')
    ).toBe(false);
    expect(
      screenContainsWidgetId(migrated.screens.ParentDashboard.components, 'parent-dashboard-progress')
    ).toBe(true);
    expect(
      screenContainsWidgetId(migrated.screens.LearnerProfile.components, 'learner-profile-results')
    ).toBe(true);

    const overviewIndex = migrated.screens.LearnerProfile.components.findIndex((component) =>
      componentContainsWidgetId(component, 'learner-profile-overview')
    );
    const resultsIndex = migrated.screens.LearnerProfile.components.findIndex((component) =>
      componentContainsWidgetId(component, 'learner-profile-results')
    );

    expect(overviewIndex).toBeGreaterThanOrEqual(0);
    expect(resultsIndex).toBe(overviewIndex + 1);
  });
});
