import type { QueryClient } from '@tanstack/react-query';

export const invalidateKangurMobileAuthQueries = async (
  queryClient: Pick<QueryClient, 'invalidateQueries'>,
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['kangur-mobile', 'leaderboard'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['kangur-mobile', 'scores'],
    }),
  ]);
};
