import { describe, expect, it } from 'vitest';

import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { defaultPlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';

import {
  buildProgrammableActionOptions,
  buildProgrammableConnectionPayload,
  createEmptyProgrammableCaptureRoute,
  parseProgrammableCaptureRouteConfigJson,
  serializeProgrammableFieldMapperRows,
} from './playwright-programmable-integration-page.helpers';

const buildAction = (overrides: Partial<PlaywrightAction>): PlaywrightAction => ({
  id: 'action',
  name: 'Action',
  description: null,
  runtimeKey: null,
  blocks: [],
  stepSetIds: [],
  personaId: null,
  executionSettings: defaultPlaywrightActionExecutionSettings,
  createdAt: '2026-04-17T00:00:00.000Z',
  updatedAt: '2026-04-17T00:00:00.000Z',
  ...overrides,
});

describe('playwrightProgrammableIntegrationPage helpers', () => {
  it('parses capture routes from both array and object payloads', () => {
    expect(
      parseProgrammableCaptureRouteConfigJson(
        JSON.stringify([
          {
            ...createEmptyProgrammableCaptureRoute(1),
            title: 'List',
            path: '/list',
          },
        ])
      )
    ).toMatchObject({
      appearanceMode: '',
      routes: [{ title: 'List', path: '/list' }],
    });

    expect(
      parseProgrammableCaptureRouteConfigJson(
        JSON.stringify({
          appearanceMode: 'grid',
          routes: [
            {
              ...createEmptyProgrammableCaptureRoute(1),
              title: 'Item',
              path: '/item',
            },
          ],
        })
      )
    ).toMatchObject({
      appearanceMode: 'grid',
      routes: [{ title: 'Item', path: '/item' }],
    });
  });

  it('builds programmable action options from supported session profiles', () => {
    expect(
      buildProgrammableActionOptions(
        [
          buildAction({ id: 'action-a', name: 'Action A' }),
          buildAction({
            id: 'runtime_action__playwright_programmable_listing',
            name: 'Programmable Listing Session',
            runtimeKey: 'playwright_programmable_listing',
          }),
        ],
        'Default session'
      )
    ).toEqual([
      { value: '', label: 'Default session' },
      {
        value: 'runtime_action__playwright_programmable_listing',
        label: 'Programmable Listing Session (playwright_programmable_listing)',
      },
    ]);
  });

  it('serializes trimmed field mapper rows and programmable payload values', () => {
    expect(
      serializeProgrammableFieldMapperRows([
        { id: 'row-a', sourceKey: '  source.title  ', targetField: 'title' },
        { id: 'row-b', sourceKey: '   ', targetField: 'description' },
      ])
    ).toBe(JSON.stringify([{ sourceKey: 'source.title', targetField: 'title' }]));

    expect(
      buildProgrammableConnectionPayload({
        connectionName: '  Programmable A  ',
        listingScript: '  export default {}  ',
        importScript: '   ',
        importBaseUrl: ' https://example.com/import ',
        listingActionId: ' listing-action ',
        importActionId: ' ',
        captureRoutes: [],
        appearanceMode: 'grid',
        fieldMapperRows: [{ id: 'row-a', sourceKey: ' source.title ', targetField: 'title' }],
        payloadPatch: { custom: true },
      })
    ).toMatchObject({
      name: 'Programmable A',
      playwrightListingScript: 'export default {}',
      playwrightImportScript: null,
      playwrightImportBaseUrl: 'https://example.com/import',
      playwrightListingActionId: 'listing-action',
      playwrightImportActionId: null,
      playwrightFieldMapperJson: JSON.stringify([
        { sourceKey: 'source.title', targetField: 'title' },
      ]),
      custom: true,
    });
  });
});
