import { ErrorCategory, type SuggestedAction } from '@/shared/types/observability';

const ERROR_PATTERNS: [RegExp, ErrorCategory][] = [
  [/connection|network|timeout|refused|reset|fetch/i, ErrorCategory.EXTERNAL],
  [/auth|login|permission|access|unauthorized|forbidden|jwt|session|not found/i, ErrorCategory.USER],
  [/validation|invalid|missing|required|wrong format|bad request/i, ErrorCategory.VALIDATION],
  [/database|prisma|mongo|sql|query failed|migration|foreign key/i, ErrorCategory.DATABASE],
  [/ai|openai|ollama|llm|token limit|embedding|vision|prompt/i, ErrorCategory.AI],
];

/**
 * Classifies an error into a category based on its message.
 */
export function classifyError(error: unknown): ErrorCategory {
  const message = error instanceof Error ? error.message : String(error);
  
  for (const [pattern, category] of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return category;
    }
  }
  
  return ErrorCategory.SYSTEM;
}

/**
 * Provides suggested actions based on the error category and message.
 */
export function getSuggestedActions(category: ErrorCategory, error?: unknown): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const message = error instanceof Error ? error.message : String(error);

  switch (category) {
    case ErrorCategory.EXTERNAL:
      actions.push({
        label: 'Retry',
        description: 'The external service might be temporarily unavailable. Please try again in a few moments.',
        actionType: 'RETRY',
      });
      break;

    case ErrorCategory.USER:
      if (message.toLowerCase().includes('auth') || message.toLowerCase().includes('session')) {
        actions.push({
          label: 'Login Again',
          description: 'Your session might have expired. Please log in again to continue.',
          actionType: 'REAUTHENTICATE',
        });
      } else {
        actions.push({
          label: 'Check Permissions',
          description: 'You might not have the required permissions for this action. Contact your administrator.',
          actionType: 'CHECK_CONFIG',
        });
      }
      break;

    case ErrorCategory.DATABASE:
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

    case ErrorCategory.VALIDATION:
      actions.push({
        label: 'Check Input',
        description: 'Please review the highlighted fields and ensure all required information is correctly provided.',
        actionType: 'REFRESH_PAGE',
      });
      break;

    case ErrorCategory.AI:
      actions.push({
        label: 'Adjust Prompt',
        description: 'The AI model might be having trouble with the current input. Try rephrasing or simplifying your request.',
        actionType: 'CHECK_CONFIG',
      });
      if (message.toLowerCase().includes('token')) {
        actions.push({
          label: 'Reduce Content',
          description: 'The request is too long for the AI model. Try reducing the amount of text sent.',
          actionType: 'CHECK_CONFIG',
        });
      }
      break;

    default:
      actions.push({
        label: 'Refresh Page',
        description: 'A temporary system error occurred. Refreshing the page might resolve the issue.',
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
