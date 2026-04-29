import { describe, expect, it } from 'vitest';

import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
  materializeStarterWorkflowSeedBundle,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { handleParser } from '@/shared/lib/ai-paths/core/runtime/handlers/transform/parser';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import {
  JOB_APPLICATION_PREPARE_PATH_ID,
  JOB_APPLICATION_PREPARE_STARTER_TEMPLATE_ID,
  JOB_APPLICATION_PREPARE_TRIGGER_BUTTON_ID,
  JOB_APPLICATION_PREPARE_TRIGGER_LOCATION,
} from '@/shared/lib/ai-paths/job-application-prepare';

describe('starter job application preparation workflow', () => {
  it('ships a canonical trigger button bound to the starter path', () => {
    const bundle = materializeStarterWorkflowSeedBundle('auto_seed');
    const triggerButton = bundle.triggerButtons.find(
      (button) => button.id === JOB_APPLICATION_PREPARE_TRIGGER_BUTTON_ID
    );

    expect(triggerButton).toEqual(
      expect.objectContaining({
        name: 'Create Application',
        pathId: JOB_APPLICATION_PREPARE_PATH_ID,
        locations: [JOB_APPLICATION_PREPARE_TRIGGER_LOCATION],
        mode: 'click',
      })
    );
  });

  it('materializes the canonical path with the matching trigger event id', () => {
    const entry = getStarterWorkflowTemplateById(JOB_APPLICATION_PREPARE_STARTER_TEMPLATE_ID);
    if (!entry) throw new Error('Missing starter_job_application_prepare entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: JOB_APPLICATION_PREPARE_PATH_ID,
      seededDefault: true,
    });
    const triggerNodes = config.nodes.filter((node) => node.type === 'trigger');

    expect(triggerNodes).toHaveLength(1);
    expect(triggerNodes[0]?.config?.trigger?.event).toBe(
      JOB_APPLICATION_PREPARE_TRIGGER_BUTTON_ID
    );
  });

  it('parses person, job, organisation, and platform context from the trigger entity', async () => {
    const entry = getStarterWorkflowTemplateById(JOB_APPLICATION_PREPARE_STARTER_TEMPLATE_ID);
    if (!entry) throw new Error('Missing starter_job_application_prepare entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_job_application_parser_runtime',
    });
    const parserNode = config.nodes.find((node) => node.type === 'parser');
    if (!parserNode) throw new Error('Missing job application parser node');

    const result = await handleParser({
      node: parserNode,
      nodeInputs: {
        context: {
          entityJson: {
            id: 'org-1:job-1:person-1',
            applicationContext: {
              personContext: {
                selectedPersonId: 'person-1',
                person: { fullName: 'Ada Lovelace' },
                cvs: [{ id: 'cv-1', title: 'Primary CV' }],
              },
              jobContext: {
                selectedJobListingId: 'job-1',
                listing: { id: 'job-1', title: 'FileMaker Consultant' },
              },
              organizationContext: {
                selectedOrganizationId: 'org-1',
                organization: { id: 'org-1', name: 'Acme Hiring' },
              },
              platformContext: {
                integrationSlug: 'pracuj-pl',
                connectionId: 'connection-pracuj',
              },
              generationRequest: {
                artifacts: ['tailored_cv', 'cover_letter'],
              },
              outputContract: {
                coverLetter: { bodyMarkdown: 'string' },
              },
            },
          },
        },
      },
      fetchEntityCached: async () => null,
      simulationEntityType: null,
      resolvedEntity: null,
      reportAiPathsError: () => undefined,
    } as Parameters<typeof handleParser>[0]);

    expect(result['bundle']).toEqual(
      expect.objectContaining({
        personContext: expect.objectContaining({
          selectedPersonId: 'person-1',
          cvs: [expect.objectContaining({ id: 'cv-1' })],
        }),
        jobContext: expect.objectContaining({
          selectedJobListingId: 'job-1',
        }),
        organizationContext: expect.objectContaining({
          selectedOrganizationId: 'org-1',
        }),
        platformContext: expect.objectContaining({
          integrationSlug: 'pracuj-pl',
        }),
      })
    );
  });

  it('materializes a runnable AI Path graph for the application package', () => {
    const entry = getStarterWorkflowTemplateById(JOB_APPLICATION_PREPARE_STARTER_TEMPLATE_ID);
    if (!entry) throw new Error('Missing starter_job_application_prepare entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_job_application_runtime',
    });
    const promptNode = config.nodes.find((node) => node.type === 'prompt');
    const modelNode = config.nodes.find((node) => node.type === 'model');
    const regexNode = config.nodes.find((node) => node.type === 'regex');
    const databaseNodes = config.nodes.filter((node) => node.type === 'database');
    const report = evaluateRunPreflight({
      nodes: config.nodes,
      edges: config.edges,
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(promptNode?.config?.prompt?.template).toContain('Tailor the CV and cover letter');
    expect(promptNode?.config?.prompt?.template).toContain('bodyText');
    expect(modelNode?.config?.model).toEqual(
      expect.objectContaining({
        maxTokens: 2200,
        waitForResult: true,
      })
    );
    expect(regexNode?.config?.regex).toEqual(
      expect.objectContaining({
        mode: 'extract_json',
        outputMode: 'object',
      })
    );
    expect(databaseNodes).toHaveLength(2);
    expect(databaseNodes.map((node) => node.config?.database?.query?.collection).sort()).toEqual([
      'filemaker_cvs',
      'filemaker_job_applications',
    ]);
    expect(
      databaseNodes.find(
        (node) => node.config?.database?.query?.collection === 'filemaker_job_applications'
      )?.config?.database?.query?.queryTemplate
    ).toContain('tailoredCvId');
    expect(report.shouldBlock).toBe(false);
    expect(report.compileReport.errors).toBe(0);
  });
});
