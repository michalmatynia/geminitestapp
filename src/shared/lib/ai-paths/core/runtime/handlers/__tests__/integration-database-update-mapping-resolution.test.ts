import { describe, expect, it } from 'vitest';

import { resolveDatabaseUpdateMappings } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-mapping-resolution';
import type { DatabaseConfig } from '@/shared/contracts/ai-paths';

describe('resolveDatabaseUpdateMappings', () => {
  it('resolves mapping sourcePath from nested source ports', () => {
    const result = resolveDatabaseUpdateMappings({
      dbConfig: {
        mappings: [
          {
            sourcePort: 'value',
            sourcePath: 'description_pl',
            targetPath: 'description_pl',
          },
          {
            sourcePort: 'result',
            sourcePath: 'parameters',
            targetPath: 'parameters',
          },
        ],
      } as unknown as DatabaseConfig,
      nodeInputPorts: ['value', 'result'],
      resolvedInputs: {
        value: {
          description_pl: 'Opis',
        },
        result: {
          parameters: [{ parameterId: 'p1', value: 'v1' }],
        },
      },
      parameterTargetPath: 'parameters',
    });

    expect(result.updates).toEqual({
      description_pl: 'Opis',
      parameters: [{ parameterId: 'p1', value: 'v1' }],
    });
    expect(result.unresolvedSourcePorts.size).toBe(0);
  });

  it('falls back to alias source roots when sourcePort is unresolved', () => {
    const result = resolveDatabaseUpdateMappings({
      dbConfig: {
        mappings: [
          {
            sourcePort: 'value',
            sourcePath: 'description_pl',
            targetPath: 'description_pl',
          },
        ],
      } as unknown as DatabaseConfig,
      nodeInputPorts: ['value', 'result'],
      resolvedInputs: {
        result: {
          description_pl: 'Opis fallback',
        },
      },
      parameterTargetPath: 'parameters',
    });

    expect(result.updates).toEqual({
      description_pl: 'Opis fallback',
    });
    expect(result.unresolvedSourcePorts.size).toBe(0);
  });
});
