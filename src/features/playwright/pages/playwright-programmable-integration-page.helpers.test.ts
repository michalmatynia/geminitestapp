import { describe, expect, it } from 'vitest';

import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { defaultPlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';

import {
  buildDraftMapperAutomationFlowTemplate,
  buildDraftMapperPreviewAutomationFlowTemplate,
  buildDraftMapperResilientAutomationFlowTemplate,
  buildProgrammableActionOptions,
  buildProgrammableConnectionPayload,
  connectionToProgrammableDraftMapperRows,
  createEmptyProgrammableCaptureRoute,
  parseProgrammableCaptureRouteConfigJson,
  serializeProgrammableFieldMapperRows,
  createEmptyProgrammableDraftMapperRule,
  PROGRAMMABLE_DRAFT_TARGET_OPTIONS,
  PROGRAMMABLE_DRAFT_TRANSFORM_OPTIONS,
} from './playwright-programmable-integration-page.helpers';
import {
  serializePlaywrightDraftMapperRows,
} from '@/features/integrations/services/playwright-listing/draft-mapper';

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
        automationFlowJson: '  { "name": "Draft import" }  ',
        listingActionId: ' listing-action ',
        importActionId: ' ',
        captureRoutes: [],
        appearanceMode: 'grid',
        draftMapperRows: [
          {
            id: 'draft-row-a',
            enabled: true,
            targetPath: 'name_en',
            mode: 'scraped',
            sourcePath: ' title ',
            staticValue: '',
            transform: 'trim',
            required: true,
          },
        ],
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
      playwrightImportAutomationFlowJson: '{ "name": "Draft import" }',
      playwrightFieldMapperJson: JSON.stringify([
        { sourceKey: 'source.title', targetField: 'title' },
      ]),
      playwrightDraftMapperJson: JSON.stringify([
        {
          enabled: true,
          targetPath: 'name_en',
          mode: 'scraped',
          sourcePath: 'title',
          staticValue: '',
          transform: 'trim',
          required: true,
        },
      ]),
      custom: true,
    });
  });

  it('round-trips programmable draft mapper rows and exposes draft mapper options', () => {
    const parsedRows = connectionToProgrammableDraftMapperRows({
      id: 'connection-1',
      integrationId: 'integration-1',
      name: 'Programmable',
      playwrightDraftMapperJson: JSON.stringify([
        {
          enabled: true,
          targetPath: 'catalogIds',
          mode: 'static',
          sourcePath: '',
          staticValue: '["catalog-a"]',
          transform: 'string_array',
          required: true,
        },
      ]),
    } as never);

    expect(parsedRows).toHaveLength(1);
    expect(parsedRows[0]).toMatchObject({
      enabled: true,
      targetPath: 'catalogIds',
      mode: 'static',
      staticValue: '["catalog-a"]',
      transform: 'string_array',
      required: true,
    });
    expect(serializePlaywrightDraftMapperRows(parsedRows)).toBe(
      JSON.stringify([
        {
          enabled: true,
          targetPath: 'catalogIds',
          mode: 'static',
          sourcePath: '',
          staticValue: '["catalog-a"]',
          transform: 'string_array',
          required: true,
        },
      ])
    );
    expect(createEmptyProgrammableDraftMapperRule()).toMatchObject({
      enabled: true,
      targetPath: 'name_en',
      mode: 'scraped',
      transform: 'trim',
      required: false,
    });
    expect(PROGRAMMABLE_DRAFT_TARGET_OPTIONS).toContainEqual({
      value: 'catalogIds',
      label: 'catalogIds',
    });
    expect(PROGRAMMABLE_DRAFT_TRANSFORM_OPTIONS).toContainEqual({
      value: 'string_array',
      label: 'string_array',
    });
  });

  it('builds the draft-mapper automation flow template', () => {
    expect(JSON.parse(buildDraftMapperAutomationFlowTemplate())).toEqual({
      name: 'Draft mapper import',
      blocks: [
        {
          kind: 'for_each',
          items: { type: 'path', path: 'vars.scrapedItems' },
          blocks: [
            { kind: 'map_draft' },
            { kind: 'create_draft' },
            {
              kind: 'append_result',
              resultKey: 'drafts',
              value: { type: 'path', path: 'current' },
            },
          ],
        },
      ],
    });
  });

  it('builds the draft-mapper preview automation flow template', () => {
    expect(JSON.parse(buildDraftMapperPreviewAutomationFlowTemplate())).toEqual({
      name: 'Draft mapper preview',
      blocks: [
        {
          kind: 'for_each',
          items: { type: 'path', path: 'vars.scrapedItems' },
          blocks: [
            { kind: 'map_draft' },
            {
              kind: 'append_result',
              resultKey: 'mappedDrafts',
              value: { type: 'path', path: 'current' },
            },
          ],
        },
      ],
    });
  });

  it('builds the draft-mapper resilient automation flow template', () => {
    expect(JSON.parse(buildDraftMapperResilientAutomationFlowTemplate())).toEqual({
      name: 'Draft mapper resilient import',
      blocks: [
        {
          kind: 'for_each',
          items: { type: 'path', path: 'vars.scrapedItems' },
          blocks: [
            { kind: 'map_draft' },
            {
              kind: 'append_result',
              resultKey: 'mappedDrafts',
              value: { type: 'path', path: 'current' },
            },
            {
              kind: 'create_draft',
              onError: 'continue',
            },
            {
              kind: 'append_result',
              resultKey: 'draftWrites',
              value: { type: 'path', path: 'current' },
            },
          ],
        },
      ],
    });
  });
});
