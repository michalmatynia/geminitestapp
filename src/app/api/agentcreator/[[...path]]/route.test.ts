import { describe, expect, it } from 'vitest';

import { matchCatchAllPattern } from '@/shared/lib/api/catch-all-router';

describe('agentcreator route matcher', () => {
  it('extracts params for nested agent assets routes', () => {
    const pattern = ['agent', { param: 'runId' }, 'assets', { param: 'file' }];

    const params = matchCatchAllPattern(pattern, ['agent', 'run-1', 'assets', 'file.png']);
    expect(params).toEqual({ runId: 'run-1', file: 'file.png' });
  });

  it('allows optional literal tokens to be omitted', () => {
    const pattern: Parameters<typeof matchCatchAllPattern>[0] = [
      'personas',
      { param: 'personaId' },
      { literal: 'memory', optional: true },
    ];

    const paramsWithoutLiteral = matchCatchAllPattern(pattern, ['personas', 'p-42']);
    expect(paramsWithoutLiteral).toEqual({ personaId: 'p-42' });

    const paramsWithLiteral = matchCatchAllPattern(pattern, ['personas', 'p-42', 'memory']);
    expect(paramsWithLiteral).toEqual({ personaId: 'p-42' });
  });

  it('rejects extra segments that do not match an optional literal token', () => {
    const pattern: Parameters<typeof matchCatchAllPattern>[0] = [
      'personas',
      { param: 'personaId' },
      { literal: 'memory', optional: true },
    ];

    const params = matchCatchAllPattern(pattern, ['personas', 'p-42', 'visuals']);
    expect(params).toBeNull();
  });

  it('returns null when required literals mismatch', () => {
    const pattern: Parameters<typeof matchCatchAllPattern>[0] = [
      'teaching',
      'agents',
      { param: 'agentId' },
    ];

    const params = matchCatchAllPattern(pattern, ['teaching', 'agents', '123', 'extra']);
    expect(params).toBeNull();
  });
});
