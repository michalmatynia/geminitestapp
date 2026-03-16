import { describe, it, expect } from 'vitest';
import * as server from './server';

describe('ai-paths server entrypoint', () => {
  it('should export expected members', () => {
    expect(server).toBeDefined();
    expect(typeof server.getAiPathConfig).toBe('function');
    expect(typeof server.getAiPathRun).toBe('function');
    expect(typeof server.listAiPathRuns).toBe('function');
    expect(typeof server.executeAiPathRun).toBe('function');
  });
});
