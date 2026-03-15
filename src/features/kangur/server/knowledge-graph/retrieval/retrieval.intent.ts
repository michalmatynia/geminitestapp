import type { KangurKnowledgeGraphQueryIntent } from './retrieval.contracts';
import { normalizeText } from './retrieval.utils';

export const buildKnowledgeGraphQueryIntent = (value: string): KangurKnowledgeGraphQueryIntent => {
  const normalized = normalizeText(value);
  const preferredSurfaces = new Set<string>();
  const preferredRoutes = new Set<string>();
  const preferredFocusKinds = new Set<string>();

  if (/(zalog|login|konto|ucz[ęe]n|rodzic)/u.test(normalized)) {
    preferredSurfaces.add('auth');
    preferredRoutes.add('/');
    preferredFocusKinds.add('login_action');
    preferredFocusKinds.add('login_form');
    preferredFocusKinds.add('create_account_action');
  }

  if (/(lekcj)/u.test(normalized)) {
    preferredSurfaces.add('lesson');
    preferredRoutes.add('/lessons');
  }

  if (/(test)/u.test(normalized)) {
    preferredSurfaces.add('test');
    preferredRoutes.add('/tests');
  }

  if (/(gra|gram|grac|zabawa|ćwiczeni)/u.test(normalized)) {
    preferredSurfaces.add('game');
    preferredRoutes.add('/game');
  }

  if (/(profil|wynik|osi[ąa]gni[ęe]cia|post[ęe]p)/u.test(normalized)) {
    preferredSurfaces.add('profile');
    preferredRoutes.add('/profile');
  }

  if (/(rodzic|mama|tata|opiekun|zarz[ąa]dzanie)/u.test(normalized)) {
    preferredSurfaces.add('parent_dashboard');
    preferredRoutes.add('/parent');
  }

  const isLocationLookup = /(gdzie|jak wejsc|jak otworzyc|pokaz|znajdz|gdzie znajde)/u.test(
    normalized
  );

  return {
    preferredSurfaces: Array.from(preferredSurfaces),
    preferredRoutes: Array.from(preferredRoutes),
    preferredFocusKinds: Array.from(preferredFocusKinds),
    isLocationLookup,
  };
};
