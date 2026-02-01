"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

type QueryProviderProps = {
  children: React.ReactNode;
};

export const QueryProvider = ({ children }: QueryProviderProps): React.JSX.Element => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // staleTime: 1000 * 60 * 5, // 5 minutes
            // gcTime: 1000 * 60 * 60 * 1, // 1 hour
            refetchOnWindowFocus: false,
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
