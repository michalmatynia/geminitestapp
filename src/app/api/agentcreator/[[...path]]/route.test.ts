import { describe, expect, it } from 'vitest';

import { __testables } from './route';

describe('agentcreator route matcher', () => {
  it('extracts params for nested agent assets routes', () => {
    const pattern = __testables.ROUTES.find((route) =>
      route.pattern.length === 4 &&
      typeof route.pattern[2] === 'string' &&
      route.pattern[2] === 'assets'
    )?.pattern;
    if (!pattern) {
      throw new Error('pattern not found');
    }

    const params = __testables.matchPattern(pattern, ['agent', 'run-1', 'assets', 'file.png']);
    expect(params).toEqual({ runId: 'run-1', file: 'file.png' });
  });

  it('allows optional literal tokens to be omitted', () => {
    const pattern: Parameters<typeof __testables.matchPattern>[0] = [
      'personas',
      { param: 'personaId' },
      { literal: 'memory', optional: true },
    ];

    const paramsWithoutLiteral = __testables.matchPattern(pattern, ['personas', 'p-42']);
    expect(paramsWithoutLiteral).toEqual({ personaId: 'p-42' });

    const paramsWithLiteral = __testables.matchPattern(pattern, ['personas', 'p-42', 'memory']);
    expect(paramsWithLiteral).toEqual({ personaId: 'p-42' });
  });

  it('rejects extra segments that do not match an optional literal token', () => {
    const pattern: Parameters<typeof __testables.matchPattern>[0] = [
      'personas',
      { param: 'personaId' },
      { literal: 'memory', optional: true },
    ];

    const params = __testables.matchPattern(pattern, ['personas', 'p-42', 'visuals']);
    expect(params).toBeNull();
  });

  it('returns null when required literals mismatch', () => {
    const pattern: Parameters<typeof __testables.matchPattern>[0] = [
      'teaching',
      'agents',
      { param: 'agentId' },
    ];

    const params = __testables.matchPattern(pattern, ['teaching', 'agents', '123', 'extra']);
    expect(params).toBeNull();
  });
});
