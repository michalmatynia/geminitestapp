import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import * as api from "../api";
import type { CurrencyOption, CountryOption, Language } from "../../../shared/types/internationalization";

export const internationalizationKeys = {
  all: ["internationalization"] as const,
  currencies: () => [...internationalizationKeys.all, "currencies"] as const,
  countries: () => [...internationalizationKeys.all, "countries"] as const,
  languages: () => [...internationalizationKeys.all, "languages"] as const,
};

export function useCurrencies(): UseQueryResult<CurrencyOption[], Error> {
  return useQuery({
    queryKey: internationalizationKeys.currencies(),
    queryFn: async (): Promise<CurrencyOption[]> => api.getCurrencies(),
  });
}

export function useCountries(): UseQueryResult<CountryOption[], Error> {
  return useQuery({
    queryKey: internationalizationKeys.countries(),
    queryFn: async (): Promise<CountryOption[]> => api.getCountries(),
  });
}

export function useLanguages(): UseQueryResult<Language[], Error> {
  return useQuery({
    queryKey: internationalizationKeys.languages(),
    queryFn: async (): Promise<Language[]> => api.getLanguages(),
  });
}

export function useDeleteCurrencyMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCurrency(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.currencies() });
    },
  });
}

export function useDeleteCountryMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCountry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.countries() });
    },
  });
}

export function useDeleteLanguageMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteLanguage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.languages() });
    },
  });
}

export function useSaveCurrencyMutation(): UseMutationResult<CurrencyOption, Error, { id?: string; data: Partial<CurrencyOption> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<CurrencyOption> }): Promise<CurrencyOption> => 
      api.saveCurrency(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.currencies() });
    },
  });
}

export function useSaveCountryMutation(): UseMutationResult<CountryOption, Error, { id?: string; data: Partial<CountryOption> & { currencyIds?: string[] } }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<CountryOption> & { currencyIds?: string[] } }): Promise<CountryOption> => 
      api.saveCountry(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.countries() });
    },
  });
}

export function useSaveLanguageMutation(): UseMutationResult<Language, Error, { id?: string; data: Partial<Language> & { countryIds?: string[] } }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<Language> & { countryIds?: string[] } }): Promise<Language> => 
      api.saveLanguage(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.languages() });
    },
  });
}
