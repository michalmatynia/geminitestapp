'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui/primitives.public';

export type EditorialArticleState = {
  id: string;
  tag: string;
  title: string;
  excerpt: string;
  body: string;
  visible: boolean;
  href: string;
};

export type EditorialArticleAiGenerateInput = {
  draft: Pick<EditorialArticleState, 'body' | 'excerpt' | 'tag' | 'title'>;
  imageUrl?: string;
  prompt: string;
};

export type GeneratedEditorialArticleState = {
  body: string;
  excerpt: string;
  modelId: string | null;
  title: string;
};

export type EditorialArticlesState = {
  articles: EditorialArticleState[];
  updatedAt: string | null;
  updatedBy: string | null;
  cloudConfigured: boolean;
  cloudMirrored?: boolean;
};

type EditorialArticlesResponse = {
  ok: boolean;
  editorialArticles: EditorialArticlesState;
};

type EditorialArticleAiGenerateResponse = {
  article: GeneratedEditorialArticleState;
  ok: boolean;
};

export type EditorialArticlesController = {
  addArticle: (article: EditorialArticleState) => void;
  articles: EditorialArticleState[];
  editorialArticles: EditorialArticlesState | null;
  error: string | null;
  handleRefreshClick: () => void;
  handleSaveClick: () => void;
  isLoading: boolean;
  isSaving: boolean;
  removeArticle: (index: number) => void;
  updateArticle: (index: number, patch: Partial<EditorialArticleState>) => void;
};

const EDITORIAL_ARTICLES_ENDPOINT = '/api/v2/products/pages/editorial-articles';
const EDITORIAL_ARTICLE_GENERATE_ENDPOINT = `${EDITORIAL_ARTICLES_ENDPOINT}/generate`;
const MAX_ARTICLE_COUNT = 12;

const EMPTY_EDITORIAL_ARTICLES_STATE: EditorialArticlesState = {
  articles: [],
  cloudConfigured: false,
  updatedAt: null,
  updatedBy: null,
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const toEditorialArticleSlug = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug.length > 0 ? slug : 'article';
};

export const createBlankEditorialArticle = (
  overrides: Partial<EditorialArticleState> = {}
): EditorialArticleState => {
  const id = `article-${Date.now()}`;
  return {
    id,
    tag: 'Universe Report',
    title: '',
    excerpt: '',
    body: '',
    visible: true,
    href: `/lore-drops/${id}`,
    ...overrides,
  };
};

export const normalizeEditorialArticleDraft = (
  draft: EditorialArticleState
): EditorialArticleState => {
  const title = draft.title.trim();
  const id = draft.id.trim().length > 0
    ? toEditorialArticleSlug(draft.id)
    : toEditorialArticleSlug(title);
  const href = draft.href.trim();
  return {
    ...draft,
    body: draft.body.trim(),
    excerpt: draft.excerpt.trim(),
    href: href.length > 0 && !href.startsWith('#') ? href : `/lore-drops/${id}`,
    id,
    tag: draft.tag.trim(),
    title,
  };
};

const fetchEditorialArticles = async (): Promise<EditorialArticlesState> => {
  const response = await api.get<EditorialArticlesResponse>(EDITORIAL_ARTICLES_ENDPOINT);
  return response.editorialArticles;
};

const saveEditorialArticles = async (
  articles: EditorialArticleState[]
): Promise<EditorialArticlesState> => {
  const response = await api.put<EditorialArticlesResponse>(
    EDITORIAL_ARTICLES_ENDPOINT,
    { articles },
    { timeout: 120_000 }
  );
  return response.editorialArticles;
};

export const generateEditorialArticleFromAiPath = async (
  input: EditorialArticleAiGenerateInput
): Promise<GeneratedEditorialArticleState> => {
  const response = await api.post<EditorialArticleAiGenerateResponse>(
    EDITORIAL_ARTICLE_GENERATE_ENDPOINT,
    input,
    { timeout: 180_000 }
  );
  return response.article;
};

type EditorialArticlesStateSetter = Dispatch<SetStateAction<EditorialArticlesState | null>>;
type ErrorSetter = Dispatch<SetStateAction<string | null>>;

const useEditorialArticlesData = (): {
  editorialArticles: EditorialArticlesState | null;
  error: string | null;
  isLoading: boolean;
  loadArticles: () => Promise<void>;
  setEditorialArticles: EditorialArticlesStateSetter;
  setError: ErrorSetter;
} => {
  const [editorialArticles, setEditorialArticles] =
    useState<EditorialArticlesState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArticles = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      setEditorialArticles(await fetchEditorialArticles());
    } catch (loadError: unknown) {
      setError(toErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles().catch(() => undefined);
  }, [loadArticles]);

  return { editorialArticles, error, isLoading, loadArticles, setEditorialArticles, setError };
};

const useEditorialArticleMutators = (input: {
  editorialArticles: EditorialArticlesState | null;
  setEditorialArticles: EditorialArticlesStateSetter;
  setError: ErrorSetter;
}): Pick<EditorialArticlesController, 'addArticle' | 'removeArticle' | 'updateArticle'> => {
  const updateArticle = useCallback((
    index: number,
    patch: Partial<EditorialArticleState>
  ): void => {
    input.setEditorialArticles((current) => current === null ? current : {
      ...current,
      articles: current.articles.map((article, articleIndex) =>
        articleIndex === index ? { ...article, ...patch } : article
      ),
    });
  }, [input]);

  const addArticle = useCallback((article: EditorialArticleState): void => {
    const current = input.editorialArticles ?? EMPTY_EDITORIAL_ARTICLES_STATE;
    if (current.articles.length >= MAX_ARTICLE_COUNT) {
      input.setError(`Editorial articles can contain at most ${MAX_ARTICLE_COUNT} articles.`);
      return;
    }
    input.setEditorialArticles({ ...current, articles: [...current.articles, article] });
  }, [input]);

  const removeArticle = useCallback((index: number): void => {
    if (input.editorialArticles === null) return;
    input.setEditorialArticles({
      ...input.editorialArticles,
      articles: input.editorialArticles.articles.filter((_, articleIndex) =>
        articleIndex !== index
      ),
    });
  }, [input]);

  return { addArticle, removeArticle, updateArticle };
};

const useEditorialArticlesSaveAction = (input: {
  editorialArticles: EditorialArticlesState | null;
  setEditorialArticles: EditorialArticlesStateSetter;
  setError: ErrorSetter;
}): Pick<EditorialArticlesController, 'handleSaveClick' | 'isSaving'> => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveClick = useCallback((): void => {
    const articles = input.editorialArticles?.articles ?? [];
    setIsSaving(true);
    input.setError(null);
    saveEditorialArticles(articles.map(normalizeEditorialArticleDraft))
      .then((nextArticles) => {
        input.setEditorialArticles(nextArticles);
        toast('Lore & Drops articles saved and mirrored.', { variant: 'success' });
      })
      .catch((saveError: unknown) => {
        const message = toErrorMessage(saveError);
        input.setError(message);
        toast(message, { variant: 'error' });
      })
      .finally(() => setIsSaving(false));
  }, [input, toast]);

  return { handleSaveClick, isSaving };
};

export const useEditorialArticlesController = (): EditorialArticlesController => {
  const data = useEditorialArticlesData();
  const mutators = useEditorialArticleMutators(data);
  const saveAction = useEditorialArticlesSaveAction(data);

  return {
    ...mutators,
    ...saveAction,
    articles: data.editorialArticles?.articles ?? [],
    editorialArticles: data.editorialArticles,
    error: data.error,
    handleRefreshClick: () => {
      data.loadArticles().catch(() => undefined);
    },
    isLoading: data.isLoading,
  };
};
