import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { searchDrugs, checkInteractions } from '../lib/drugApi';
import { queryKeys } from '../lib/queryKeys';
import type { DrugSearchResult, InteractionResult } from '../types/drug';

/**
 * Debounced drug name search via RxNorm.
 * Returns search results, loading state, and a setter for the query string.
 */
export function useDrugSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateQuery = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (text.trim().length < 2) {
      setDebouncedQuery('');
      return;
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
    }, 400);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const { data: results = [], isLoading } = useQuery<DrugSearchResult[]>({
    queryKey: queryKeys.drugSearch.byQuery(debouncedQuery),
    queryFn: () => searchDrugs(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000,
  });

  return {
    query,
    updateQuery,
    clearSearch,
    results,
    isLoading: isLoading && debouncedQuery.length >= 2,
  };
}

/**
 * Check interactions between a list of drug names.
 * Only runs when there are 2+ drug names provided.
 */
export function useDrugInteractions(drugNames: string[]) {
  const sorted = [...drugNames].filter(Boolean).sort();

  return useQuery<InteractionResult[]>({
    queryKey: queryKeys.drugInteractions.byRxcuis(sorted),
    queryFn: () => checkInteractions(sorted),
    enabled: sorted.length >= 2,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
