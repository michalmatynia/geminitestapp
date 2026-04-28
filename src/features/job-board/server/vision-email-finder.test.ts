import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/playwright/server/runtime', () => ({
  runPlaywrightEngineTask: vi.fn(),
}));

import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import { findCompanyEmailsWithVisionLoop } from './vision-email-finder';

const runPlaywrightEngineTaskMock = vi.mocked(runPlaywrightEngineTask);

describe('vision-email-finder', () => {
  beforeEach(() => {
    runPlaywrightEngineTaskMock.mockReset();
  });

  it('forwards the headless preference to the Playwright engine request', async () => {
    runPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-vision-1',
      status: 'completed',
      result: {
        returnValue: {
          emails: [
            {
              address: 'hr@acme.example',
              source: 'https://acme.example/contact',
              isPrimary: true,
            },
          ],
          iterationsRun: 2,
          durationMs: 2400,
          finalUrl: 'https://acme.example/contact',
          reasoning: 'Found company email on the contact page.',
          actionHistory: [
            {
              iteration: 1,
              url: 'https://acme.example/',
              resultUrl: 'https://acme.example/contact',
              pageType: 'homepage',
              visibleEmails: [],
              obfuscatedHints: [],
              nextActionKind: 'click_link',
              nextActionTarget: 'Contact',
              nextActionReason: 'Open the contact page.',
              evaluationReasoning: 'The homepage does not show an email yet.',
              injectorReasoning: 'Click the Contact link.',
              outcome: 'executed',
              error: null,
              collectedCount: 0,
              durationMs: 1200,
            },
            {
              iteration: 2,
              url: 'https://acme.example/contact',
              resultUrl: 'https://acme.example/contact',
              pageType: 'contact',
              visibleEmails: ['hr@acme.example'],
              obfuscatedHints: [],
              nextActionKind: null,
              nextActionTarget: null,
              nextActionReason: null,
              evaluationReasoning: 'The contact page shows the company email.',
              injectorReasoning: 'Found company email on the contact page.',
              outcome: 'done_visible_email',
              error: null,
              collectedCount: 1,
              durationMs: 900,
            },
          ],
        },
      },
    } as never);

    const result = await findCompanyEmailsWithVisionLoop({
      website: 'https://acme.example',
      domain: 'acme.example',
      companyName: 'Acme',
      headless: false,
    });

    expect(runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          startUrl: 'https://acme.example',
          settingsOverrides: expect.objectContaining({
            headless: false,
          }),
        }),
      })
    );
    expect(result.error).toBeUndefined();
    expect(result.actionHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          iteration: 1,
          nextActionKind: 'click_link',
          outcome: 'executed',
        }),
        expect.objectContaining({
          iteration: 2,
          pageType: 'contact',
          visibleEmails: ['hr@acme.example'],
          outcome: 'done_visible_email',
        }),
      ])
    );
    expect(result.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'validate_input',
          status: 'completed',
        }),
        expect.objectContaining({
          key: 'vision_guided_navigation',
          status: 'completed',
          message: expect.stringContaining('#1 [homepage]'),
        }),
        expect.objectContaining({
          key: 'rank_company_emails',
          status: 'completed',
        }),
      ])
    );
    expect(result.emails).toEqual([
      expect.objectContaining({
        address: 'hr@acme.example',
        isPrimary: true,
      }),
    ]);
  });
});
