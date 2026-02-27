export type PromptValidationIntegrationErrorCode =
  | 'scope_resolution'
  | 'rule_compile'
  | 'runtime_execution';

type PromptValidationIntegrationErrorArgs = {
  code: PromptValidationIntegrationErrorCode;
  message: string;
  details?: Record<string, unknown> | undefined;
  cause?: unknown;
};

export class PromptValidationIntegrationError extends Error {
  readonly code: PromptValidationIntegrationErrorCode;
  readonly details: Record<string, unknown> | undefined;
  override readonly cause: unknown;

  constructor(args: PromptValidationIntegrationErrorArgs) {
    super(args.message);
    this.name = 'PromptValidationIntegrationError';
    this.code = args.code;
    this.details = args.details;
    this.cause = args.cause;
  }
}

export class PromptValidationScopeResolutionError extends PromptValidationIntegrationError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super({
      code: 'scope_resolution',
      message,
      details,
      cause,
    });
    this.name = 'PromptValidationScopeResolutionError';
  }
}

export class PromptValidationRuleCompileError extends PromptValidationIntegrationError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super({
      code: 'rule_compile',
      message,
      details,
      cause,
    });
    this.name = 'PromptValidationRuleCompileError';
  }
}

export class PromptValidationRuntimeError extends PromptValidationIntegrationError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super({
      code: 'runtime_execution',
      message,
      details,
      cause,
    });
    this.name = 'PromptValidationRuntimeError';
  }
}

export const asPromptValidationIntegrationError = (
  error: unknown,
  fallbackMessage: string,
  details?: Record<string, unknown>
): PromptValidationIntegrationError => {
  if (error instanceof PromptValidationIntegrationError) return error;
  return new PromptValidationRuntimeError(
    fallbackMessage,
    details,
    error
  );
};
