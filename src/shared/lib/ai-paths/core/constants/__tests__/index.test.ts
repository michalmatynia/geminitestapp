import { describe, it, expect } from 'vitest';
import * as constants from '../index';

describe('AI Paths Core Constants Barrel', () => {
  it('exports base rendering constants', () => {
    expect(constants.CANVAS_WIDTH).toBeDefined();
    expect(constants.NODE_WIDTH).toBeDefined();
  });

  it('exports initial state constants', () => {
    expect(constants.EMPTY_RUNTIME_STATE).toBeDefined();
  });

  it('exports rendering connection and style maps', () => {
    expect(constants.allowedConnections).toBeDefined();
    expect(constants.typeStyles).toBeDefined();
  });

  it('exports trigger identifiers', () => {
    expect(constants.triggers).toBeInstanceOf(Array);
    expect(constants.triggers.length).toBeGreaterThan(0);
  });
});
