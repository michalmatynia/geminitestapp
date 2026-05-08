import { useState, useMemo, type Dispatch, type SetStateAction } from 'react';

type TraderaListing = {
  status: string;
  title: string;
};

type TraderaStatusFilter = 'all' | 'error' | 'success';

type TraderaStatusController = {
  filter: TraderaStatusFilter;
  setFilter: Dispatch<SetStateAction<TraderaStatusFilter>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  filteredListings: TraderaListing[];
};

export function useTraderaStatusController(
  listings: TraderaListing[]
): TraderaStatusController {
  const [filter, setFilter] = useState<TraderaStatusFilter>('all');
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
