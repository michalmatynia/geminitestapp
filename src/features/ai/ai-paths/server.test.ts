import { describe, it, expect } from 'vitest';
import * as server from './server';

describe('ai-paths server entrypoint', () => {
  it('should export expected members', () => {
    expect(server).toBeDefined();
    expect(typeof server.enqueuePathRun).toBe('function');
    expect(typeof server.cancelPathRun).toBe('function');
    expect(typeof server.resumePathRun).toBe('function');
    expect(typeof server.getAiPathsSettings).toBe('function');
  });
});
