import { describe, it, expect } from 'vitest';

import {
  parsePlanJson,
  normalizeStringList,
  buildPlan,
  decideNextAction,
  isExtractionStep,
  normalizeDecision,
} from '@/features/ai/agent-runtime/planning/utils';

describe('Agent Runtime Planning Utils', () => {
  describe('parsePlanJson', () => {
    it('should parse JSON from markdown code blocks', () => {
      const content = 'Here is the plan: ```json\n{"steps": ["Step 1"]}\n```';
      const result = parsePlanJson(content) as any;
      expect(result.steps).toEqual(['Step 1']);
    });

    it('should parse raw JSON content', () => {
      const content = '{"steps": ["Step 1"]}';
      const result = parsePlanJson(content) as any;
      expect(result.steps).toEqual(['Step 1']);
    });

    it('should return null for invalid JSON', () => {
      const content = 'Not a JSON';
      expect(parsePlanJson(content)).toBeNull();
    });
  });

  describe('normalizeStringList', () => {
    it('should trim strings and remove empty ones', () => {
      const input = ['  first  ', '', 'second', '   '];
      expect(normalizeStringList(input)).toEqual(['first', 'second']);
    });

    it('should return empty array for non-array input', () => {
      expect(normalizeStringList(null)).toEqual([]);
    });
  });

  describe('buildPlan', () => {
    it('should generate login steps for login-related prompts', () => {
      const steps = buildPlan('I need to log in to my account');
      expect(steps[0]).toBe('Open the target website.');
      expect(steps[1]).toBe('Locate the sign-in form.');
      expect(steps.length).toBe(5);
    });

    it('should generate browse steps for website prompts', () => {
      const steps = buildPlan('Browse example.com');
      expect(steps[0]).toBe('Open the target URL.');
      expect(steps[2]).toBe('Locate the requested content.');
    });

    it('should split regular prompts by sentences', () => {
      const steps = buildPlan('Do thing one. Do thing two!');
      expect(steps).toEqual(['Do thing one', 'Do thing two!']);
    });
  });

  describe('decideNextAction', () => {
    it('should choose playwright for browse prompts', () => {
      const decision = decideNextAction('Browse this site', []);
      expect(decision.action).toBe('tool');
      expect(decision.toolName).toBe('playwright');
    });

    it('should choose wait_human when no memory and no tool prompt', () => {
      const decision = decideNextAction('Hello', []);
      expect(decision.action).toBe('wait_human');
    });

    it('should choose respond when there is memory', () => {
      const decision = decideNextAction('Hello', ['previous context']);
      expect(decision.action).toBe('respond');
    });
  });

  describe('normalizeDecision', () => {
    it('should keep explicit tool decisions and default the tool name', () => {
      const decision = normalizeDecision(
        {
          action: 'tool',
          reason: 'Use a browser',
        },
        [],
        'Prompt',
        [],
      );

      expect(decision).toEqual({
        action: 'tool',
        reason: 'Use a browser',
        toolName: 'playwright',
      });
    });

    it('should fall back to tool execution when plan steps already exist', () => {
      const decision = normalizeDecision(
        undefined,
        [{ title: 'Open page' } as any],
        'Prompt',
        [],
      );

      expect(decision).toEqual({
        action: 'tool',
        reason: 'Plan generated; execute tool steps.',
        toolName: 'playwright',
      });
    });

    it('should delegate to next-action logic when no explicit decision or steps exist', () => {
      const decision = normalizeDecision(undefined, [], 'Hello', ['memory']);
      expect(decision.action).toBe('respond');
    });
  });

  describe('isExtractionStep', () => {
    it('should return true for extract_info task type', () => {
      const step = { title: 'Any' } as any;
      expect(isExtractionStep(step, '', 'extract_info')).toBe(true);
    });

    it('should return true when title mentions extract and product', () => {
      const step = { title: 'Extract product info', expectedObservation: null } as any;
      expect(isExtractionStep(step, 'Prompt', null)).toBe(true);
    });

    it('should return false for regular steps', () => {
      const step = { title: 'Click button', expectedObservation: null } as any;
      expect(isExtractionStep(step, 'Prompt', null)).toBe(false);
    });
  });
});
