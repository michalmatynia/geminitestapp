import { describe, expect, it } from 'vitest';

import {
  parseUserScript,
  validatePlaywrightNodeScript,
} from '../playwright-node-runner.parser';

describe('playwright-node-runner.parser', () => {
  it('wraps bare function-body scripts into an async run function', async () => {
    const logs: string[] = [];
    const script = parseUserScript(
      `
        log?.('step:start');
        return { ok: true, title: input?.title ?? null };
      `,
      logs
    );

    const result = await script({
      input: { title: 'Tradera test' },
      log: () => undefined,
    });

    expect(result).toEqual({
      ok: true,
      title: 'Tradera test',
    });
    expect(logs).toContain('[parser] Script contains bare return — wrapping in async function.');
  });

  it('returns an actionable syntax error when function-body wrapping still fails', () => {
    const validation = validatePlaywrightNodeScript(`
      if (true) {
        return { ok: true };
    `);

    expect(validation).toMatchObject({
      ok: false,
      error: expect.objectContaining({
        message: expect.stringContaining(
          'Invalid Playwright script syntax after function-body wrapping:'
        ),
      }),
    });
  });
});
