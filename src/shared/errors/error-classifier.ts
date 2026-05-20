/**
 * Error Classifier
 * 
 * Error classification and categorization utilities.
 * Provides:
 * - Error category determination
 * - Suggested action resolution
 * - API error classification
 * - Zod validation error detection
 * - Error type identification
 */

/* eslint-disable complexity, max-lines-per-function */

import { z } from 'zod';

import {
  ERROR_CATEGORY,
  type ErrorCategory,
  type SuggestedAction,
} from '@/shared/contracts/observability';
import { AppErrorCodes, isAppError } from '@/shared/errors/app-error';
import { isLocalDatabaseConnectionRefused } from '@/shared/errors/database-error-guidance';

type ApiErrorLike = {
  status: number;
  category?: string | undefined;
};

/**
 * Regular expression patterns for classifying errors by category.
 * Each pattern maps to a specific error category for better error handling.
 */
const ERROR_PATTERNS = [
  // Network errors - Connection failures, timeouts, DNS issues
  [
    /\b(connection|network|timeout|refused|reset)\b|failed to fetch|\bfetch\b|network request failed/i,
    ERROR_CATEGORY.NETWORK,
  ],
  // Authentication/Authorization errors - Login, permissions, access control
  [/auth|login|permission|access|unauthorized|forbidden|jwt|session/i, ERROR_CATEGORY.AUTH],
  // Not found errors - Missing resources (treated as validation issue)
  [/not found/i, ERROR_CATEGORY.VALIDATION],
  // Validation errors - Invalid input, missing fields, format issues
  [/validation|invalid|missing|required|wrong format|bad request/i, ERROR_CATEGORY.VALIDATION],
  // Database errors - MongoDB, SQL, query failures, migrations
  [/database|mongo|sql|query failed|migration|foreign key/i, ERROR_CATEGORY.DATABASE],
  // AI/LLM errors - OpenAI, Ollama, token limits, embeddings, prompts
  [
    /\b(ai|openai|ollama|llm)\b|\btoken limit\b|\bembedding(?:s)?\b|\bvision\b|\bprompt(?:s)?\b/i,
    ERROR_CATEGORY.AI,
  ],
] satisfies ReadonlyArray<readonly [RegExp, ErrorCategory]>;

const ERROR_CATEGORY_VALUES = Object.values(ERROR_CATEGORY);

const isErrorCategory = (value: unknown): value is ErrorCategory =>
  typeof value === 'string' && ERROR_CATEGORY_VALUES.some((category) => category === value);

/**
 * Classifies an error into a category based on its message or instance type.
 * 
 * Classification priority:
 * 1. Zod validation errors → VALIDATION
 * 2. AppError instances → Based on error code
 * 3. API-like errors → Based on HTTP status code
 * 4. Message pattern matching → Based on error message content
 * 5. Default → SYSTEM
 * 
 * @param error - Unknown error to classify
 * @returns ErrorCategory enum value
 */
export function classifyError(error: unknown): ErrorCategory {
  // Zod validation errors - Schema validation failures
  if (error instanceof z.ZodError) {
    return ERROR_CATEGORY.VALIDATION;
  }

  if (isLocalDatabaseConnectionRefused(error)) {
    return ERROR_CATEGORY.DATABASE;
  }

  // AppError instances - Use error code for classification
  if (isAppError(error)) {
    // Authentication/authorization errors
    if (error.code === AppErrorCodes.unauthorized || error.code === AppErrorCodes.forbidden) {
      return ERROR_CATEGORY.AUTH;
    }
    // Database operation errors
    if (error.code === AppErrorCodes.databaseError) {
      return ERROR_CATEGORY.DATABASE;
    }
    // Validation and bad request errors
    if (error.code === AppErrorCodes.validation || error.httpStatus === 400) {
      return ERROR_CATEGORY.VALIDATION;
    }
  }

  // API-like errors with status codes
  if (isApiErrorLike(error)) {
    // Use explicit category if provided
    if (isErrorCategory(error.category)) {
      return error.category;
    }
    // Map HTTP status codes to categories
    if (error.status === 401 || error.status === 403) return ERROR_CATEGORY.AUTH;
    if (error.status === 404 || error.status === 400) return ERROR_CATEGORY.VALIDATION;
    if (error.status >= 500) return ERROR_CATEGORY.SYSTEM;
  }

  const message = error instanceof Error ? error.message : String(error);

  // Special case: Unsupported keys in settings (validation issue)
  if (/includes unsupported keys/i.test(message)) {
    return ERROR_CATEGORY.VALIDATION;
  }
  // Special case: Legacy trigger context modes (validation issue)
  if (/removed legacy trigger context modes/i.test(message)) {
    return ERROR_CATEGORY.VALIDATION;
  }

  // Check for MongoDB-specific errors
  if (message.includes('MongoDB') || message.includes('MongoServerError')) {
    return ERROR_CATEGORY.DATABASE;
  }

  // Pattern matching against common error messages
  for (const [pattern, category] of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return category;
    }
  }

  // Default to system error if no pattern matches
  return ERROR_CATEGORY.SYSTEM;
}

const isApiErrorLike = (error: unknown): error is ApiErrorLike =>
  Boolean(error) &&
  typeof error === 'object' &&
  typeof (error as { status?: unknown }).status === 'number';

/**
 * Provides suggested actions based on the error category and message.
 * 
 * Returns context-specific actions that help users resolve the error:
 * - NETWORK: Retry the operation
 * - AUTH: Re-authenticate or check permissions
 * - DATABASE: Check connection or run migrations
 * - VALIDATION: Review input or update configuration
 * - AI: Adjust prompts, check model selection, or reduce content
 * - SYSTEM: Refresh page or contact support
 * 
 * @param category - Error category from classifyError
 * @param error - Original error object for message inspection
 * @returns Array of suggested actions with labels and descriptions
 */
export function getSuggestedActions(category: ErrorCategory, error?: unknown): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  switch (category) {
    case ERROR_CATEGORY.NETWORK:
      // Network connectivity issues - Suggest retry
      actions.push({
        label: 'Retry',
        description:
          'The external service might be temporarily unavailable. Please try again in a few moments.',
        actionType: 'RETRY',
      });
      break;

    case ERROR_CATEGORY.AUTH:
      // Session expiration - Suggest re-authentication
      if (normalizedMessage.includes('auth') || normalizedMessage.includes('session')) {
        actions.push({
          label: 'Login Again',
          description: 'Your session might have expired. Please log in again to continue.',
          actionType: 'REAUTHENTICATE',
        });
      } else {
        // Permission issues - Suggest checking permissions
        actions.push({
          label: 'Check Permissions',
          description:
            'You might not have the required permissions for this action. Contact your administrator.',
          actionType: 'CHECK_CONFIG',
        });
      }
      break;

    case ERROR_CATEGORY.DATABASE:
      if (isLocalDatabaseConnectionRefused(error)) {
        actions.push({
          label: 'Start Database Server',
          description:
            'The local database service is not accepting connections. Start it, then retry the request.',
          actionType: 'CHECK_CONFIG',
        });
        break;
      }
      // Schema migration issues - Suggest running migrations
      if (normalizedMessage.includes('migration') || normalizedMessage.includes('schema')) {
        actions.push({
          label: 'Run Migrations',
          description: 'The database schema might be out of date. Please run pending migrations.',
          actionType: 'MIGRATE_DB',
        });
      }
      // Database connection issues - Suggest checking connection
      actions.push({
        label: 'Check DB Connection',
        description: 'Ensure the database service is running and accessible.',
        actionType: 'CHECK_CONFIG',
      });
      break;

    case ERROR_CATEGORY.VALIDATION:
      // Legacy trigger context modes - Specific repair action
      if (/removed legacy trigger context modes/i.test(message)) {
        actions.push({
          label: 'Repair AI Path',
          description:
            'Update Trigger nodes to `trigger_only` and resolve entity context through downstream Fetcher or Simulation nodes.',
          actionType: 'CHECK_CONFIG',
        });
        break;
      }
      // Agent persona settings issues - Update persona settings
      if (
        /agent persona settings payload includes unsupported keys/i.test(message) ||
        /agent persona payload includes unsupported keys/i.test(message)
      ) {
        actions.push({
          label: 'Update Persona Settings',
          description:
            'Open Agent Creator personas and remove unsupported model snapshot fields from persona settings.',
          actionType: 'CHECK_CONFIG',
        });
        break;
      }
      // Image studio settings issues - Update image studio settings
      if (/image studio settings payload includes unsupported keys/i.test(message)) {
        actions.push({
          label: 'Update Image Studio Settings',
          description:
            'Open Image Studio settings and save once to persist the latest settings contract without unsupported model snapshot fields.',
          actionType: 'CHECK_CONFIG',
        });
        break;
      }
      // Generic unsupported keys - Re-save settings
      if (/includes unsupported keys/i.test(message)) {
        actions.push({
          label: 'Check Settings Contract',
          description:
            'A saved settings payload still includes unsupported model snapshot fields. Re-save the relevant settings section.',
          actionType: 'CHECK_CONFIG',
        });
        break;
      }
      // Generic validation errors - Review input
      actions.push({
        label: 'Check Input',
        description:
          'Please review the highlighted fields and ensure all required information is correctly provided.',
        actionType: 'REFRESH_PAGE',
      });
      break;

    case ERROR_CATEGORY.AI:
      // No model selected - Suggest selecting a model
      if (
        normalizedMessage.includes('no model assigned') ||
        (normalizedMessage.includes('model') && normalizedMessage.includes('did not select'))
      ) {
        actions.push({
          label: 'Select a model on the node',
          description:
            'Open the Model node in your AI Path and select the AI model to use for this step.',
          actionType: 'CHECK_CONFIG',
        });
        break;
      }
      // Ollama connection issues - Check Ollama server
      if (normalizedMessage.includes('ollama') || normalizedMessage.includes('could not connect')) {
        actions.push({
          label: 'Check Ollama Connection',
          description:
            'Ensure the Ollama server is running and reachable at the configured URL in your environment settings.',
          actionType: 'CHECK_CONFIG',
        });
        break;
      }
      // Generic AI errors - Adjust prompt
      actions.push({
        label: 'Adjust Prompt',
        description:
          'The AI model might be having trouble with the current input. Try rephrasing or simplifying your request.',
        actionType: 'CHECK_CONFIG',
      });
      // Token limit errors - Reduce content
      if (normalizedMessage.includes('token')) {
        actions.push({
          label: 'Reduce Content',
          description:
            'The request is too long for the AI model. Try reducing the amount of text sent.',
          actionType: 'CHECK_CONFIG',
        });
      }
      break;

    default:
      // System errors - Generic recovery actions
      actions.push({
        label: 'Refresh Page',
        description:
          'A temporary system error occurred. Refreshing the page might resolve the issue.',
        actionType: 'REFRESH_PAGE',
      });
      actions.push({
        label: 'Contact Support',
        description: 'If the problem persists, please contact our support team with the Error ID.',
        actionType: 'CONTACT_SUPPORT',
      });
  }

  return actions;
}
