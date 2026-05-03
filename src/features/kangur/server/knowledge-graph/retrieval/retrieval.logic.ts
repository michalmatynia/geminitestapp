import {
  type KangurKnowledgeGraphQueryIntent,
  type KangurKnowledgeGraphQueryMode,
  SEMANTIC_HELP_PATTERNS,
  WEBSITE_HELP_PATTERNS,
} from './retrieval.contracts';
import { normalizeText, tokenizeQuery } from './retrieval.utils';
import { type KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

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
    if (/(pytan|pyta[ńn]|pytanie|zadanie testowe)/u.test(normalized)) {
      preferredFocusKinds.add('question');
    }
    if (/(om[oó]w|om[oó]wienie|b[łl][ea]d|po te[śs]cie)/u.test(normalized)) {
      preferredFocusKinds.add('review');
    }
    if (/(podsumow|wynik|rezultat|rezultaty)/u.test(normalized)) {
      preferredFocusKinds.add('summary');
    }
    if (/(pusty zestaw|brak pytan|brak pyta[ńn]|empty)/u.test(normalized)) {
      preferredFocusKinds.add('empty_state');
    }
  }

  if (/(zadani)/u.test(normalized)) {
    preferredSurfaces.add('assignment');
    preferredRoutes.add('/assignments');
  }

  if (/(profil)/u.test(normalized)) {
    preferredSurfaces.add('profile');
    preferredRoutes.add('/profile');
  }

  if (/(gra|grze|misja)/u.test(normalized)) {
    preferredSurfaces.add('game');
    preferredRoutes.add('/game');
    preferredFocusKinds.add('home_quest');
  }

  if (/(panel rodzica|rodzic)/u.test(normalized)) {
    preferredSurfaces.add('parent_dashboard');
    preferredRoutes.add('/parent-dashboard');
  }

  return {
    preferredSurfaces: Array.from(preferredSurfaces),
    preferredRoutes: Array.from(preferredRoutes),
    preferredFocusKinds: Array.from(preferredFocusKinds),
    isLocationLookup:
      /(gdzie|znajd|wrocic|wrócic|wroc|wróc|przejsc|przejść|otworzyc|otworzyć|wejsc|wejść)/u.test(
        normalized
      ),
  };
};

export const shouldQueryWebsiteHelpGraph = (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
}): boolean => {
  const normalized = normalizeText(input.latestUserMessage);
  if (!normalized) {
    return false;
  }

  if (WEBSITE_HELP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  return (
    input.context?.focusKind === 'navigation' ||
    input.context?.focusKind === 'home_actions' ||
    input.context?.focusKind === 'library'
  );
};

export const hasSemanticContext = (context: KangurAiTutorConversationContext | undefined): boolean =>
  Boolean(
    context?.surface ||
      context?.focusKind ||
    context?.focusId ||
    context?.contentId ||
    context?.focusLabel ||
    context?.selectedText ||
    context?.title ||
    context?.description ||
    context?.interactionIntent ||
    context?.promptMode
  );

export const resolveGraphQueryMode = (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
}): KangurKnowledgeGraphQueryMode | null => {
  if (shouldQueryWebsiteHelpGraph(input)) {
    return 'website_help';
  }

  const normalized = normalizeText(input.latestUserMessage);
  const semanticContext = hasSemanticContext(input.context);
  if (!normalized && !semanticContext) {
    return null;
  }

  if (SEMANTIC_HELP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'semantic';
  }

  if (semanticContext) {
    return 'semantic';
  }

  // Check if we have enough tokens to justify a semantic search
  const querySeed = [
    input.latestUserMessage,
    input.context?.selectedText,
    input.context?.focusLabel,
    input.context?.title,
    input.context?.description,
  ]
    .filter(Boolean)
    .join(' ');

  return tokenizeQuery(normalizeText(querySeed)).length > 0 ? 'semantic' : null;
};
