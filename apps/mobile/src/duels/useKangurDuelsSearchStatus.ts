import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { type KangurMobileTone as Tone } from '../shared/KangurMobileUi';
import { type UseKangurMobileDuelsLobbyResult as DuelLobbyState } from './useKangurMobileDuelsLobby';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

function getSearchStatusTone(
  isSearchLoading: boolean,
  trimmedSearchQuery: string,
  trimmedSearchSubmittedQuery: string,
): Tone {
  if (isSearchLoading) {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  if (trimmedSearchSubmittedQuery.length >= 2 || trimmedSearchQuery.length >= 2) {
    return {
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
      textColor: '#1d4ed8',
    };
  }

  return {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    textColor: '#475569',
  };
}

function getSearchStatusLabel(
  copy: DuelCopy,
  lobby: DuelLobbyState,
  trimmedSearchQuery: string,
  trimmedSearchSubmittedQuery: string,
): string {
  if (lobby.isSearchLoading) {
    return copy({
      de: 'Suche läuft',
      en: 'Searching',
      pl: 'Trwa wyszukiwanie',
    });
  }

  if (trimmedSearchSubmittedQuery.length >= 2) {
    return copy({
      de: `Suche: ${trimmedSearchSubmittedQuery}`,
      en: `Search: ${trimmedSearchSubmittedQuery}`,
      pl: `Szukano: ${trimmedSearchSubmittedQuery}`,
    });
  }

  if (trimmedSearchQuery.length >= 2) {
    return copy({
      de: `Bereit: ${trimmedSearchQuery}`,
      en: `Ready: ${trimmedSearchQuery}`,
      pl: `Gotowe: ${trimmedSearchQuery}`,
    });
  }

  if (lobby.isAuthenticated) {
    return copy({
      de: 'Mindestens 2 Zeichen',
      en: 'At least 2 characters',
      pl: 'Co najmniej 2 znaki',
    });
  }

  return copy({
    de: 'Anmeldung erforderlich',
    en: 'Sign-in required',
    pl: 'Wymaga logowania',
  });
}

export function useKangurDuelsSearchStatus(
  copy: DuelCopy,
  lobby: DuelLobbyState,
): {
  searchStatusLabel: string;
  searchStatusTone: Tone;
} {
  const trimmedSearchQuery = lobby.searchQuery.trim();
  const trimmedSearchSubmittedQuery = lobby.searchSubmittedQuery.trim();

  return {
    searchStatusLabel: getSearchStatusLabel(
      copy,
      lobby,
      trimmedSearchQuery,
      trimmedSearchSubmittedQuery,
    ),
    searchStatusTone: getSearchStatusTone(
      lobby.isSearchLoading,
      trimmedSearchQuery,
      trimmedSearchSubmittedQuery,
    ),
  };
}
