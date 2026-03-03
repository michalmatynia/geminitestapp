import { z } from 'zod';

import {
  ERROR_CATEGORY,
  type ErrorCategory,
  type SuggestedAction,
} from '@/shared/contracts/observability';

type ApiErrorLike = {
  status: number;
  category?: string | undefined;
};

const ERROR_PATTERNS = [
  [/connection|network|timeout|refused|reset|fetch/i, ERROR_CATEGORY.NETWORK],
  [
    /auth|login|permission|access|unauthorized|forbidden|jwt|session/i,
    ERROR_CATEGORY.AUTH,
  ],
  [/not found/i, ERROR_CATEGORY.VALIDATION],
  [/validation|invalid|missing|required|wrong format|bad request/i, ERROR_CATEGORY.VALIDATION],
  [/database|prisma|mongo|sql|query failed|migration|foreign key/i, ERROR_CATEGORY.DATABASE],
  [/ai|openai|ollama|llm|token limit|embedding|vision|prompt/i, ERROR_CATEGORY.AI],
] satisfies ReadonlyArray<readonly [RegExp, ErrorCategory]>;

/**
 * Classifies an error into a category based on its message or instance type.
 */
export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof z.ZodError) {
    return ERROR_CATEGORY.VALIDATION;
  }

  if (isApiErrorLike(error)) {
    if (error.category && Object.values(ERROR_CATEGORY).includes(error.category as any)) {
      return error.category as ErrorCategory;
    }
    if (error.status === 401 || error.status === 403) return ERROR_CATEGORY.AUTH;
    if (error.status === 404 || error.status === 400) return ERROR_CATEGORY.VALIDATION;
    if (error.status >= 500) return ERROR_CATEGORY.SYSTEM;
  }

  const message = error instanceof Error ? error.message : String(error);

  // Check common library error indicators
  if (message.includes('PrismaClient') || message.includes('MongoDB')) {
    return ERROR_CATEGORY.DATABASE;
  }

  for (const [pattern, category] of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return category;
    }
  }

  return ERROR_CATEGORY.SYSTEM;
}

const isApiErrorLike = (error: unknown): error is ApiErrorLike =>
  Boolean(error) &&
  typeof error === 'object' &&
  typeof (error as { status?: unknown }).status === 'number';

/**
 * Provides suggested actions based on the error category and message.
 */
export function getSuggestedActions(category: ErrorCategory, error?: unknown): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const message = error instanceof Error ? error.message : String(error);

  switch (category) {
    case ERROR_CATEGORY.NETWORK:
      actions.push({
        label: 'Retry',
        description:
          'The external service might be temporarily unavailable. Please try again in a few moments.',
        actionType: 'RETRY',
      });
      break;

    case ERROR_CATEGORY.AUTH:
      if (message.toLowerCase().includes('auth') || message.toLowerCase().includes('session')) {
        actions.push({
          label: 'Login Again',
          description: 'Your session might have expired. Please log in again to continue.',
          actionType: 'REAUTHENTICATE',
        });
      } else {
        actions.push({
          label: 'Check Permissions',
          description:
            'You might not have the required permissions for this action. Contact your administrator.',
          actionType: 'CHECK_CONFIG',
        });
      }
      break;

    case ERROR_CATEGORY.DATABASE:
      if (message.toLowerCase().includes('migration') || message.toLowerCase().includes('schema')) {
        actions.push({
          label: 'Run Migrations',
          description: 'The database schema might be out of date. Please run pending migrations.',
          actionType: 'MIGRATE_DB',
        });
      }
      actions.push({
        label: 'Check DB Connection',
        description: 'Ensure the database service is running and accessible.',
        actionType: 'CHECK_CONFIG',
      });
      break;

    case ERROR_CATEGORY.VALIDATION:
      actions.push({
        label: 'Check Input',
        description:
          'Please review the highlighted fields and ensure all required information is correctly provided.',
        actionType: 'REFRESH_PAGE',
      });
      break;

    case ERROR_CATEGORY.AI:
      actions.push({
        label: 'Adjust Prompt',
        description:
          'The AI model might be having trouble with the current input. Try rephrasing or simplifying your request.',
        actionType: 'CHECK_CONFIG',
      });
      if (message.toLowerCase().includes('token')) {
        actions.push({
          label: 'Reduce Content',
          description:
            'The request is too long for the AI model. Try reducing the amount of text sent.',
          actionType: 'CHECK_CONFIG',
        });
      }
      break;

    default:
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
