import { describe, expect, it } from 'vitest';

import { parseWriteOutcomeRows } from './playwrightProgrammableWriteStatus';

describe('parseWriteOutcomeRows', () => {
  it('maps unsupported explicit write statuses to unknown', () => {
    expect(
      parseWriteOutcomeRows({
        kind: 'draft',
        value: [
          {
            kind: 'draft',
            status: 'pending_review',
            index: 2,
            payload: { sku: 'SKU-UNKNOWN-1' },
            record: null,
          },
        ],
      })
    ).toEqual([
      {
        createdRecord: null,
        errorMessage: null,
        index: 2,
        payloadRecord: { sku: 'SKU-UNKNOWN-1' },
        status: 'unknown',
      },
    ]);
  });
});
