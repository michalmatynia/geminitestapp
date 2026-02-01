import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";

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
      queryClient.invalidateQueries({ queryKey: internationalizationKeys.currencies() });
    },
  });
}

export function useDeleteCountryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCountry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internationalizationKeys.countries() });
    },
  });
}

export function useDeleteLanguageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteLanguage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internationalizationKeys.languages() });
    },
  });
}
