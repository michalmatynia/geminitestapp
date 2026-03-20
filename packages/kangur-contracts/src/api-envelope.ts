export type ApiEnvelopeDto<TData = unknown, TError = string> = {
  success: boolean;
  data?: TData;
  error?: TError;
  message?: string;
};
