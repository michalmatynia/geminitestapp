import { describe, expect, it } from 'vitest';

import { GET, POST, paramsSchema } from './route-handler';

describe('chatbot agent run action route module', () => {
  it('exports the supported HTTP handlers and params schema', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
    expect(paramsSchema.safeParse({ runId: 'run-1', action: 'logs' }).success).toBe(true);
  });
});
