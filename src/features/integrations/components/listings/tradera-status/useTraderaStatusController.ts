import { useState, useMemo } from 'react';
import type { TraderaListing } from '@/features/integrations/contracts/tradera';

export function useTraderaStatusController(listings: TraderaListing[]) {
  const [filter, setFilter] = useState<'all' | 'error' | 'success'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      const matchesFilter = filter === 'all' || l.status === filter;
      const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [listings, filter, searchQuery]);

  return {
    filter, setFilter,
    searchQuery, setSearchQuery,
    filteredListings,
  };
}
