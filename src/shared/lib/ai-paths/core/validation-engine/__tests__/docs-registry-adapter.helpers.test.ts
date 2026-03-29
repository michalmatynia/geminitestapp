import { describe, expect, it } from 'vitest';

import { parseCsvLine, toModuleFromNodeType } from '../docs-registry-adapter.helpers';

describe('docs-registry-adapter helpers', () => {
  it('maps node types to validation modules', () => {
    expect(toModuleFromNodeType('fetcher')).toBe('simulation');
    expect(toModuleFromNodeType('database')).toBe('database');
    expect(toModuleFromNodeType('custom_node')).toBe('custom');
  });

  it('parses CSV lines with quoted commas and escaped quotes', () => {
    expect(parseCsvLine('name,module,severity')).toEqual(['name', 'module', 'severity']);
    expect(parseCsvLine('"Query, fetcher",simulation,"warning"')).toEqual([
      'Query, fetcher',
      'simulation',
      'warning',
    ]);
    expect(parseCsvLine('"Escaped ""quote""",custom')).toEqual(['Escaped "quote"', 'custom']);
  });

  it('trims cells and keeps empty trailing values', () => {
    expect(parseCsvLine(' name , module , ')).toEqual(['name', 'module', '']);
  });
});
