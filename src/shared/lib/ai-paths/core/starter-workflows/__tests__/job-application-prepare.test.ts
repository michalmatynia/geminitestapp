import { describe, expect, it } from 'vitest';

import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
  materializeStarterWorkflowSeedBundle,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { handleParser } from '@/shared/lib/ai-paths/core/runtime/handlers/transform/parser';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import {
  JOB_APPLICATION_PREPARE_TRIGGER_LOCATION,
  JOB_APPLICATION_COVER_LETTER_PATH_ID,
  JOB_APPLICATION_COVER_LETTER_STARTER_TEMPLATE_ID,
  JOB_APPLICATION_COVER_LETTER_TRIGGER_BUTTON_ID,
  JOB_APPLICATION_TAILORED_CV_PATH_ID,
  JOB_APPLICATION_TAILORED_CV_STARTER_TEMPLATE_ID,
  JOB_APPLICATION_TAILORED_CV_TRIGGER_BUTTON_ID,
  JOB_APPLICATION_TAILORED_EMAIL_PATH_ID,
  JOB_APPLICATION_TAILORED_EMAIL_STARTER_TEMPLATE_ID,
  JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_BUTTON_ID,
} from '@/shared/lib/ai-paths/job-application-prepare';

describe('starter job application preparation workflow', () => {
  it('ships separate canonical trigger buttons for each application artifact', () => {
    const bundle = materializeStarterWorkflowSeedBundle('auto_seed');

    expect(bundle.triggerButtons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: JOB_APPLICATION_TAILORED_CV_TRIGGER_BUTTON_ID,
          name: 'Create Tailored CV',
          pathId: JOB_APPLICATION_TAILORED_CV_PATH_ID,
          locations: [JOB_APPLICATION_PREPARE_TRIGGER_LOCATION],
          mode: 'click',
        }),
        expect.objectContaining({
          id: JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_BUTTON_ID,
          name: 'Create Application Email',
          pathId: JOB_APPLICATION_TAILORED_EMAIL_PATH_ID,
          locations: [JOB_APPLICATION_PREPARE_TRIGGER_LOCATION],
          mode: 'click',
        }),
        expect.objectContaining({
          id: JOB_APPLICATION_COVER_LETTER_TRIGGER_BUTTON_ID,
          name: 'Create Cover Letter',
          pathId: JOB_APPLICATION_COVER_LETTER_PATH_ID,
          locations: [JOB_APPLICATION_PREPARE_TRIGGER_LOCATION],
          mode: 'click',
        }),
      ])
    );
  });

  it('materializes each canonical path with the matching trigger event id', () => {
    const expectations = [
      {
        pathId: JOB_APPLICATION_TAILORED_CV_PATH_ID,
        templateId: JOB_APPLICATION_TAILORED_CV_STARTER_TEMPLATE_ID,
        triggerId: JOB_APPLICATION_TAILORED_CV_TRIGGER_BUTTON_ID,
      },
      {
        pathId: JOB_APPLICATION_TAILORED_EMAIL_PATH_ID,
        templateId: JOB_APPLICATION_TAILORED_EMAIL_STARTER_TEMPLATE_ID,
        triggerId: JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_BUTTON_ID,
      },
      {
        pathId: JOB_APPLICATION_COVER_LETTER_PATH_ID,
        templateId: JOB_APPLICATION_COVER_LETTER_STARTER_TEMPLATE_ID,
        triggerId: JOB_APPLICATION_COVER_LETTER_TRIGGER_BUTTON_ID,
      },
    ];

    expectations.forEach((expectation) => {
      const entry = getStarterWorkflowTemplateById(expectation.templateId);
      if (!entry) throw new Error(`Missing ${expectation.templateId} entry`);

      const config = materializeStarterWorkflowPathConfig(entry, {
        pathId: expectation.pathId,
        seededDefault: true,
      });
      const triggerNodes = config.nodes.filter((node) => node.type === 'trigger');

      expect(triggerNodes).toHaveLength(1);
      expect(triggerNodes[0]?.config?.trigger?.event).toBe(expectation.triggerId);
    });
  });

  it('parses person, job, organisation, and platform context from the trigger entity', async () => {
    const entry = getStarterWorkflowTemplateById(JOB_APPLICATION_TAILORED_CV_STARTER_TEMPLATE_ID);
    if (!entry) throw new Error('Missing starter_job_application_tailored_cv entry');

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
                artifact: 'tailored_cv',
                artifacts: ['tailored_cv', 'cv_pdf_preview'],
              },
              outputContract: {
                tailoredCv: { bodyBlocks: 'CvBlock[]' },
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

  it('materializes a runnable AI Path graph for the tailored CV package', () => {
    const entry = getStarterWorkflowTemplateById(JOB_APPLICATION_TAILORED_CV_STARTER_TEMPLATE_ID);
    if (!entry) throw new Error('Missing starter_job_application_tailored_cv entry');

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

    expect(promptNode?.config?.prompt?.template).toContain('tailored CV');
    expect(promptNode?.config?.prompt?.template).toContain('bodyBlocks');
    expect(promptNode?.config?.prompt?.template).toContain('lexicon');
    expect(promptNode?.config?.prompt?.template).toContain('"language"');
    expect(modelNode?.title).toBe('Tailored CV Model');
    expect(modelNode?.config?.model).toEqual(
      expect.objectContaining({
        maxTokens: 3500,
        waitForResult: true,
      })
    );
    expect(modelNode?.config?.model).not.toHaveProperty('modelId');
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
    const applicationDatabaseNode = databaseNodes.find(
      (node) => node.config?.database?.query?.collection === 'filemaker_job_applications'
    );
    expect(applicationDatabaseNode?.config?.database).toEqual(
      expect.objectContaining({
        action: 'updateOne',
        actionCategory: 'update',
        upsert: true,
      })
    );
    expect(applicationDatabaseNode?.config?.database?.query?.queryTemplate).toContain(
      'canonicalApplicationKey'
    );
    expect(applicationDatabaseNode?.config?.database?.updateTemplate).toContain(
      'activeArtifacts.tailoredCvVersionId'
    );
    expect(
      databaseNodes.find((node) => node.config?.database?.query?.collection === 'filemaker_cvs')
        ?.config?.database?.query?.queryTemplate
    ).toContain('bodyBlocks');
    expect(report.shouldBlock).toBe(false);
    expect(report.compileReport.errors).toBe(0);
  });

  it('materializes runnable AI Path graphs for email and cover letter packages', () => {
    const expectations = [
      {
        expectedPrompt: 'tailored job application email',
        expectedTemplateField: 'applicationEmail',
        templateId: JOB_APPLICATION_TAILORED_EMAIL_STARTER_TEMPLATE_ID,
      },
      {
        expectedPrompt: 'tailored cover letter',
        expectedTemplateField: 'coverLetter',
        templateId: JOB_APPLICATION_COVER_LETTER_STARTER_TEMPLATE_ID,
      },
    ];

    expectations.forEach((expectation) => {
      const entry = getStarterWorkflowTemplateById(expectation.templateId);
      if (!entry) throw new Error(`Missing ${expectation.templateId} entry`);

      const config = materializeStarterWorkflowPathConfig(entry, {
        pathId: `${expectation.templateId}_runtime`,
      });
      const promptNode = config.nodes.find((node) => node.type === 'prompt');
      const databaseNodes = config.nodes.filter((node) => node.type === 'database');
      const report = evaluateRunPreflight({
        nodes: config.nodes,
        edges: config.edges,
        aiPathsValidation: { enabled: true },
        strictFlowMode: true,
        mode: 'full',
      });

      expect(promptNode?.config?.prompt?.template).toContain(expectation.expectedPrompt);
      expect(databaseNodes).toHaveLength(1);
      expect(databaseNodes[0]?.config?.database?.query?.collection).toBe(
        'filemaker_job_applications'
      );
      expect(databaseNodes[0]?.config?.database).toEqual(
        expect.objectContaining({
          action: 'updateOne',
          actionCategory: 'update',
          upsert: true,
        })
      );
      expect(databaseNodes[0]?.config?.database?.query?.queryTemplate).toContain(
        'canonicalApplicationKey'
      );
      expect(databaseNodes[0]?.config?.database?.updateTemplate).toContain(
        `activeArtifacts.${expectation.expectedTemplateField}VersionId`
      );
      expect(databaseNodes[0]?.config?.database?.updateTemplate).toContain(
        expectation.expectedTemplateField
      );
      expect(report.shouldBlock).toBe(false);
      expect(report.compileReport.errors).toBe(0);
    });
  });
});
