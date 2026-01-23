export const AppErrorCodes = {
  validation: "VALIDATION_ERROR",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  badRequest: "BAD_REQUEST",
  rateLimited: "RATE_LIMITED",
  externalService: "EXTERNAL_SERVICE_ERROR",
  internal: "INTERNAL_ERROR",
  skuExists: "SKU_EXISTS",
} as const;

export type AppErrorCode =
  | (typeof AppErrorCodes)[keyof typeof AppErrorCodes]
  | (string & {});

export type AppErrorOptions = {
  code: AppErrorCode;
  httpStatus: number;
  cause?: unknown;
  meta?: Record<string, unknown>;
  expected?: boolean;
};

export class AppError extends Error {
  code: AppErrorCode;
  httpStatus: number;
  meta?: Record<string, unknown>;
  expected: boolean;
  override cause?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.meta = options.meta;
    this.expected = options.expected ?? true;
    this.cause = options.cause;
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;

export const createAppError = (message: string, options: AppErrorOptions) =>
  new AppError(message, options);

export const validationError = (
  message: string,
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.validation,
    httpStatus: 400,
    meta,
    expected: true,
  });

export const authError = (message = "Unauthorized", meta?: Record<string, unknown>) =>
  new AppError(message, {
    code: AppErrorCodes.unauthorized,
    httpStatus: 401,
    meta,
    expected: true,
  });

export const forbiddenError = (
  message = "Forbidden",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.forbidden,
    httpStatus: 403,
    meta,
    expected: true,
  });

export const notFoundError = (
  message = "Not found",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.notFound,
    httpStatus: 404,
    meta,
    expected: true,
  });

export const conflictError = (
  message = "Conflict",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.conflict,
    httpStatus: 409,
    meta,
    expected: true,
  });

export const badRequestError = (
  message = "Bad request",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.badRequest,
    httpStatus: 400,
    meta,
    expected: true,
  });

export const externalServiceError = (
  message = "External service error",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.externalService,
    httpStatus: 502,
    meta,
    expected: false,
  });

export const internalError = (
  message = "Unexpected error occurred",
  meta?: Record<string, unknown>
) =>
  new AppError(message, {
    code: AppErrorCodes.internal,
    httpStatus: 500,
    meta,
    expected: false,
  });
