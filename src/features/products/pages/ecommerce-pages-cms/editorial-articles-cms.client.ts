/* eslint-disable max-lines */
'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { api } from '@/shared/lib/api-client';
import type { SingleQuery } from '@/shared/contracts/ui/queries';
import { createMutationV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { useToast } from '@/shared/ui/primitives.public';

export type EditorialArticleState = {
  id: string;
  tag: string;
  title: string;
  excerpt: string;
  body: string;
  imageUrl: string;
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

type EditorialArticleImageUploadResponse = {
  ok: boolean;
  image: {
    filename: string;
    localPublicPath: string;
    mimetype: string;
    remoteUrl: string;
    size: number;
  };
};

type EditorialArticleImage = EditorialArticleImageUploadResponse['image'];

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
  uploadArticleImage: (index: number, file: File) => void;
  uploadingIndex: number | null;
};

const EDITORIAL_ARTICLES_ENDPOINT = '/api/v2/products/pages/editorial-articles';
const EDITORIAL_ARTICLE_GENERATE_ENDPOINT = `${EDITORIAL_ARTICLES_ENDPOINT}/generate`;
const EDITORIAL_ARTICLE_IMAGE_ENDPOINT = `${EDITORIAL_ARTICLES_ENDPOINT}/image`;
const EDITORIAL_ARTICLES_QUERY_KEY = [
  'products',
  'ecommerce-pages-cms',
  'editorial-articles',
] as const;
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
    imageUrl: '',
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
    imageUrl: draft.imageUrl.trim(),
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

const uploadEditorialArticleImage = async (
  file: File
): Promise<EditorialArticleImage> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<EditorialArticleImageUploadResponse>(
    EDITORIAL_ARTICLE_IMAGE_ENDPOINT,
    formData,
    { timeout: 120_000 }
  );
  return response.image;
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

const useEditorialArticlesQuery = (): SingleQuery<EditorialArticlesState> =>
  createSingleQueryV2({
    id: 'ecommerce-pages-editorial-articles',
    queryKey: EDITORIAL_ARTICLES_QUERY_KEY,
    queryFn: fetchEditorialArticles,
    meta: {
      source: 'products.ecommercePagesCms.editorialArticles.load',
      operation: 'detail',
      resource: 'products.ecommerce-pages-cms.editorial-articles',
    },
  });

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
  const [error, setError] = useState<string | null>(null);
  const editorialArticlesQuery = useEditorialArticlesQuery();

  const loadArticles = useCallback(async (): Promise<void> => {
    setError(null);
    await editorialArticlesQuery.refetch();
  }, [editorialArticlesQuery]);

  useEffect(() => {
    if (editorialArticlesQuery.data === undefined) return;
    setEditorialArticles(editorialArticlesQuery.data);
  }, [editorialArticlesQuery.data]);

  return {
    editorialArticles,
    error: error ?? (editorialArticlesQuery.error ? toErrorMessage(editorialArticlesQuery.error) : null),
    isLoading: editorialArticlesQuery.isLoading,
    loadArticles,
    setEditorialArticles,
    setError,
  };
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
  const saveMutation = createMutationV2<EditorialArticlesState, EditorialArticleState[]>({
    mutationKey: ['products', 'ecommerce-pages-cms', 'editorial-articles', 'save'],
    mutationFn: (articles: EditorialArticleState[]): Promise<EditorialArticlesState> =>
      saveEditorialArticles(articles.map(normalizeEditorialArticleDraft)),
    onSuccess: (nextArticles: EditorialArticlesState): void => {
      input.setEditorialArticles(nextArticles);
      toast('Lore & Drops articles saved and mirrored.', { variant: 'success' });
    },
    onError: (saveError: Error): void => {
      const message = toErrorMessage(saveError);
      input.setError(message);
      toast(message, { variant: 'error' });
    },
    invalidateKeys: [EDITORIAL_ARTICLES_QUERY_KEY],
    meta: {
      source: 'products.ecommercePagesCms.editorialArticles.save',
      operation: 'update',
      resource: 'products.ecommerce-pages-cms.editorial-articles',
      errorPresentation: 'toast',
    },
  });

  const handleSaveClick = useCallback((): void => {
    const articles = input.editorialArticles?.articles ?? [];
    input.setError(null);
    saveMutation.mutate(articles);
  }, [input, saveMutation]);

  return { handleSaveClick, isSaving: saveMutation.isPending };
};

const useEditorialArticleImageUploadAction = (input: {
  setError: ErrorSetter;
  updateArticle: EditorialArticlesController['updateArticle'];
}): Pick<EditorialArticlesController, 'uploadArticleImage' | 'uploadingIndex'> => {
  const { toast } = useToast();
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const uploadMutation = createMutationV2<
    EditorialArticleImage,
    { file: File; index: number }
  >({
    mutationKey: ['products', 'ecommerce-pages-cms', 'editorial-articles', 'image', 'upload'],
    mutationFn: ({ file }: { file: File; index: number }): Promise<EditorialArticleImage> =>
      uploadEditorialArticleImage(file),
    onSuccess: (
      image: EditorialArticleImage,
      variables: { file: File; index: number }
    ): void => {
      input.updateArticle(variables.index, { imageUrl: image.remoteUrl });
      toast('Lore article image uploaded. Save articles to publish the URL.', { variant: 'success' });
    },
    onError: (uploadError: Error): void => {
      const message = toErrorMessage(uploadError);
      input.setError(message);
      toast(message, { variant: 'error' });
    },
    onSettled: (): void => {
      setUploadingIndex(null);
    },
    meta: {
      source: 'products.ecommercePagesCms.editorialArticles.image.upload',
      operation: 'update',
      resource: 'products.ecommerce-pages-cms.editorial-article-image',
      errorPresentation: 'toast',
    },
  });

  const uploadArticleImage = useCallback((index: number, file: File): void => {
    setUploadingIndex(index);
    input.setError(null);
    uploadMutation.mutate({ file, index });
  }, [input, uploadMutation]);

  return { uploadArticleImage, uploadingIndex };
};

export const useEditorialArticlesController = (): EditorialArticlesController => {
  const data = useEditorialArticlesData();
  const mutators = useEditorialArticleMutators(data);
  const saveAction = useEditorialArticlesSaveAction(data);
  const uploadAction = useEditorialArticleImageUploadAction({
    setError: data.setError,
    updateArticle: mutators.updateArticle,
  });

  return {
    ...mutators,
    ...saveAction,
    ...uploadAction,
    articles: data.editorialArticles?.articles ?? [],
    editorialArticles: data.editorialArticles,
    error: data.error,
    handleRefreshClick: () => {
      data.loadArticles().catch(() => undefined);
    },
    isLoading: data.isLoading,
  };
};
