import { keepPreviousData, QueryClient } from "@tanstack/react-query";

/**
 * The app's TanStack Query client, passed to <Refine> so code outside React (the auth provider)
 * can reach the cache. Same query defaults Refine applies to the client it would create itself.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    },
  },
});
