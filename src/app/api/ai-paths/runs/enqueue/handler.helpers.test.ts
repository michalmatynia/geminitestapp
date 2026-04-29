import { describe, expect, it } from 'vitest';

import { compactRunTriggerContext } from './handler.helpers';

describe('ai-paths runs enqueue handler helpers', () => {
  it('compacts Filemaker job application trigger context before run persistence', () => {
    const largeText = 'x'.repeat(8_000);
    const compacted = compactRunTriggerContext({
      source: {
        location: 'filemaker_organization_job_application',
      },
      entity: {
        applicationContext: {
          duplicate: true,
        },
      },
      entityJson: {
        id: 'org-1:job-1:person-1:application_package',
        applicationContext: {
          personContext: {
            linkedRecords: {
              linkedEmails: [
                { email: 'candidate@example.com', label: 'Primary', rawHtml: largeText },
                { email: 'alt@example.com', label: 'Alt' },
              ],
              linkedDocuments: Array.from({ length: 30 }, (_value, index) => ({
                id: `doc-${index}`,
                bodyText: largeText,
              })),
            },
          },
          jobContext: {
            listing: {
              description: largeText,
            },
          },
        },
      },
    });

    const entityJson = compacted?.['entityJson'] as Record<string, unknown>;
    const applicationContext = entityJson['applicationContext'] as Record<string, unknown>;
    const personContext = applicationContext['personContext'] as Record<string, unknown>;
    const linkedRecordsSummary = personContext['linkedRecordsSummary'] as Record<string, unknown>;
    const linkedEmails = linkedRecordsSummary['linkedEmails'] as Array<Record<string, unknown>>;
    const jobContext = applicationContext['jobContext'] as Record<string, unknown>;
    const listing = jobContext['listing'] as Record<string, unknown>;

    expect(compacted?.['entity']).toBeNull();
    expect(linkedRecordsSummary['linkedDocumentsCount']).toBe(30);
    expect(linkedEmails).toEqual([
      { email: 'candidate@example.com', label: 'Primary' },
      { email: 'alt@example.com', label: 'Alt' },
    ]);
    expect(String(listing['description'])).toHaveLength(4015);
  });
});
