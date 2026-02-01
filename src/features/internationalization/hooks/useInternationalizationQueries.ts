import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { CurrencyOption, CountryOption, Language } from "../../../shared/types/internationalization";

export const internationalizationKeys = {
  all: ["internationalization"] as const,
  currencies: () => [...internationalizationKeys.all, "currencies"] as const,
  countries: () => [...internationalizationKeys.all, "countries"] as const,
  languages: () => [...internationalizationKeys.all, "languages"] as const,
};

export function useCurrencies() {
  return useQuery({
    queryKey: internationalizationKeys.currencies(),
    queryFn: api.getCurrencies,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: internationalizationKeys.countries(),
    queryFn: api.getCountries,
  });
}

export function useLanguages() {
  return useQuery({
    queryKey: internationalizationKeys.languages(),
    queryFn: api.getLanguages,
  });
}

export function useDeleteCurrencyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCurrency(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.currencies() });
    },
  });
}

export function useDeleteCountryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCountry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.countries() });
    },
  });
}

export function useDeleteLanguageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteLanguage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.languages() });
    },
  });
}

export function useSaveCurrencyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<CurrencyOption> }) => api.saveCurrency(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.currencies() });
    },
  });
}

export function useSaveCountryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<CountryOption> & { currencyIds?: string[] } }) => api.saveCountry(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.countries() });
    },
  });
}

export function useSaveLanguageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Language> & { countryIds?: string[] } }) => api.saveLanguage(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: internationalizationKeys.languages() });
    },
  });
}
