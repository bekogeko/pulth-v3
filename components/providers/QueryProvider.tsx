'use client'

import {QueryClient, QueryClientProvider, HydrationBoundary, type DehydratedState} from "@tanstack/react-query";
import {useState, type ReactNode} from "react";
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";

type ReactQueryProviderProps = {
  children: ReactNode;
  state?: DehydratedState;
};

export default function QueryProvider({children, state}: ReactQueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={state}>{children}</HydrationBoundary>
        {process.env.NODE_ENV === "development" ? (
            <ReactQueryDevtools buttonPosition="bottom-left" />
        ) : null}
    </QueryClientProvider>
  );
}
