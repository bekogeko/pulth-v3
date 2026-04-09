'use client'

import {QueryClient, QueryClientProvider, HydrationBoundary, type DehydratedState} from "@tanstack/react-query";
import {useState, type ReactNode} from "react";

type ReactQueryProviderProps = {
  children: ReactNode;
  state?: DehydratedState;
};

export default function QueryProvider({children, state}: ReactQueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={state}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
