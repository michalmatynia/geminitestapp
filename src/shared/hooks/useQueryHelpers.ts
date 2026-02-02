import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { useToast } from "@/shared/ui";
import { useEffect } from "react";

// Enhanced query hook with built-in error handling and toast notifications
export function useQueryWithToast<TData, TError = Error>(
  options: UseQueryOptions<TData, TError> & {
    successMessage?: string;
    errorMessage?: string;
  }
): UseQueryResult<TData, TError> {
  const { toast } = useToast();
  const query = useQuery(options);

  useEffect(() => {
    if (query.isSuccess && options.successMessage) {
      toast(options.successMessage, { variant: "success" });
    }
  }, [query.isSuccess, options.successMessage, toast]);

  useEffect(() => {
    if (query.isError) {
      const message: string = options.errorMessage || 
        (query.error instanceof Error ? query.error.message : "An error occurred");
      toast(message, { variant: "error" });
    }
  }, [query.isError, query.error, options.errorMessage, toast]);
  
  return query;
}

// Enhanced mutation hook with built-in error handling and toast notifications
export function useMutationWithToast<TData, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    successMessage?: string;
    errorMessage?: string;
  }
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { toast } = useToast();
  
  return useMutation({
    ...options,
    onSuccess: (data: TData, variables: TVariables, context: TContext): void => {
      if (options.successMessage) {
        toast(options.successMessage, { variant: "success" });
      }
      // @ts-expect-error - options.onSuccess type mismatch in library
      options.onSuccess?.(data, variables, context);
    },
    onError: (error: TError, variables: TVariables, context: TContext | undefined): void => {
      const message: string = options.errorMessage || 
        (error instanceof Error ? error.message : "An error occurred");
      toast(message, { variant: "error" });
      // @ts-expect-error - options.onError type mismatch in library
      options.onError?.(error, variables, context);
    },
  });
}

// Hook for optimistic updates with rollback
export function useOptimisticMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    queryKey: unknown[];
    optimisticUpdate: (oldData: unknown, variables: TVariables) => unknown;
    successMessage?: string;
    errorMessage?: string;
  }
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    ...options,
    onMutate: async (variables: TVariables): Promise<TContext> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.queryKey });
      
      // Snapshot previous value
      const previousData: unknown = queryClient.getQueryData(options.queryKey);
      
      // Optimistically update
      queryClient.setQueryData(options.queryKey, (old: unknown) => 
        options.optimisticUpdate(old, variables)
      );
      
      // Call original onMutate if provided
      // @ts-expect-error - options.onMutate type mismatch in library
      const context: unknown = await options.onMutate?.(variables);
      
      return { previousData, ...(context as Record<string, unknown>) } as TContext;
    },
    onError: (error: TError, variables: TVariables, context: TContext | undefined): void => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousData' in context) {
        queryClient.setQueryData(options.queryKey, (context as { previousData: unknown }).previousData);
      }
      
      const message: string = options.errorMessage || 
        (error instanceof Error ? error.message : "An error occurred");
      toast(message, { variant: "error" });
      
      // @ts-expect-error - options.onError type mismatch in library
      options.onError?.(error, variables, context);
    },
    onSuccess: (data: TData, variables: TVariables, context: TContext): void => {
      if (options.successMessage) {
        toast(options.successMessage, { variant: "success" });
      }
      // @ts-expect-error - options.onSuccess type mismatch in library
      options.onSuccess?.(data, variables, context);
    },
    onSettled: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext | undefined): void => {
      // Always refetch to ensure consistency
      void queryClient.invalidateQueries({ queryKey: options.queryKey });
      // @ts-expect-error - options.onSettled type mismatch in library
      options.onSettled?.(data, error, variables, context);
    },
  });
}