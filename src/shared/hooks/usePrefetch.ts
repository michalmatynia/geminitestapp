import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

interface PrefetchConfig {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  condition?: () => boolean;
  delay?: number;
}

export function usePrefetchQueries(configs: PrefetchConfig[]): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    configs.forEach(({ queryKey, queryFn, condition, delay = 0 }: PrefetchConfig): void => {
      if (condition && !condition()) return;

      const timeoutId = setTimeout(() => {
        void queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: 1000 * 60 * 5, // 5 minutes
        });
      }, delay);

      timeouts.push(timeoutId);
    });

    return (): void => timeouts.forEach((t: NodeJS.Timeout) => clearTimeout(t));
  }, [configs, queryClient]);
}

export interface SmartPrefetchResult {
  prefetchOnHover: (queryKey: unknown[], queryFn: () => Promise<unknown>) => { onMouseEnter: () => void };
  prefetchOnFocus: (queryKey: unknown[], queryFn: () => Promise<unknown>) => { onFocus: () => void };
}

// Smart prefetching based on user behavior
export function useSmartPrefetch(): SmartPrefetchResult {
  const queryClient = useQueryClient();

  const prefetchOnHover = (queryKey: unknown[], queryFn: () => Promise<unknown>): { onMouseEnter: () => void } => {
    return {
      onMouseEnter: (): void => {
        void queryClient.prefetchQuery({ queryKey, queryFn });
      },
    };
  };

  const prefetchOnFocus = (queryKey: unknown[], queryFn: () => Promise<unknown>): { onFocus: () => void } => {
    return {
      onFocus: (): void => {
        void queryClient.prefetchQuery({ queryKey, queryFn });
      },
    };
  };

  return {
    prefetchOnHover,
    prefetchOnFocus,
  };
}
