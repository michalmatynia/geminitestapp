/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';

import {
  PromptValidationIntegrationError,
  PromptValidationRuleCompileError,
  PromptValidationRuntimeError,
  PromptValidationScopeResolutionError,
  asPromptValidationIntegrationError,
} from './errors';

describe('prompt-core errors', () => {
  it('constructs integration errors with codes, details, and causes', () => {
    const cause = new Error('compile failed');
    const error = new PromptValidationIntegrationError({
      code: 'rule_compile',
      message: 'Could not compile validation rules.',
      details: { ruleId: 'rule-1' },
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('PromptValidationIntegrationError');
    expect(error.code).toBe('rule_compile');
    expect(error.message).toBe('Could not compile validation rules.');
    expect(error.details).toEqual({ ruleId: 'rule-1' });
    expect(error.cause).toBe(cause);
  });

  it('creates typed subclasses for scope, compile, and runtime failures', () => {
    const scopeError = new PromptValidationScopeResolutionError('Scope failed', {
      scope: 'product',
    });
    const compileError = new PromptValidationRuleCompileError('Compile failed', {
      ruleId: 'rule-2',
    });
    const runtimeError = new PromptValidationRuntimeError('Runtime failed', {
      nodeId: 'node-1',
    });

    expect(scopeError.name).toBe('PromptValidationScopeResolutionError');
    expect(scopeError.code).toBe('scope_resolution');
    expect(scopeError.details).toEqual({ scope: 'product' });

    expect(compileError.name).toBe('PromptValidationRuleCompileError');
    expect(compileError.code).toBe('rule_compile');
    expect(compileError.details).toEqual({ ruleId: 'rule-2' });

    expect(runtimeError.name).toBe('PromptValidationRuntimeError');
    expect(runtimeError.code).toBe('runtime_execution');
    expect(runtimeError.details).toEqual({ nodeId: 'node-1' });
  });

  it('preserves existing integration errors and wraps unknown failures as runtime errors', () => {
    const existing = new PromptValidationRuleCompileError('Already typed', {
      ruleId: 'rule-3',
    });

    expect(asPromptValidationIntegrationError(existing, 'fallback')).toBe(existing);

    const wrapped = asPromptValidationIntegrationError('boom', 'Fallback message', {
      source: 'runtime',
    });

    expect(wrapped).toBeInstanceOf(PromptValidationRuntimeError);
    expect(wrapped.message).toBe('Fallback message');
    expect(wrapped.code).toBe('runtime_execution');
    expect(wrapped.details).toEqual({ source: 'runtime' });
    expect(wrapped.cause).toBe('boom');
  });
});
