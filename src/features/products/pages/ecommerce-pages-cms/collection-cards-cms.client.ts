'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui/primitives.public';

export type CollectionCardSelectorType = 'all' | 'category' | 'theme' | 'custom';

export type CollectionCardState = {
  id: string;
  label: string;
  sublabel: string;
  tag: string;
  visible: boolean;
  href: string;
  imageUrl: string;
  selectorType: CollectionCardSelectorType;
  selectorValues: string[];
  fallbackCount: number;
};

export type CollectionCardsState = {
  cards: CollectionCardState[];
  updatedAt: string | null;
  updatedBy: string | null;
  cloudConfigured: boolean;
  cloudMirrored?: boolean;
};

type CollectionCardsResponse = {
  ok: boolean;
  collectionCards: CollectionCardsState;
};

type CollectionCardImageUploadResponse = {
  ok: boolean;
  image: {
    filename: string;
    localPublicPath: string;
    mimetype: string;
    remoteUrl: string;
    size: number;
  };
};

export type CollectionCardsController = {
  addCard: (card: CollectionCardState) => void;
  cards: CollectionCardState[];
  collectionCards: CollectionCardsState | null;
  error: string | null;
  handleRefreshClick: () => void;
  handleSaveClick: () => void;
  isLoading: boolean;
  isSaving: boolean;
  removeCard: (index: number) => void;
  updateCard: (index: number, patch: Partial<CollectionCardState>) => void;
  uploadCardImage: (index: number, file: File) => void;
  uploadingIndex: number | null;
};

export const SELECTOR_TYPE_OPTIONS: Array<{
  label: string;
  value: CollectionCardSelectorType;
}> = [
  { label: 'All products', value: 'all' },
  { label: 'Categories', value: 'category' },
  { label: 'Universes / lore', value: 'theme' },
  { label: 'Custom URL', value: 'custom' },
];

const COLLECTION_CARDS_ENDPOINT = '/api/v2/products/pages/collection-cards';
const COLLECTION_CARD_IMAGE_ENDPOINT = '/api/v2/products/pages/collection-cards/image';

const EMPTY_COLLECTION_CARDS_STATE: CollectionCardsState = {
  cards: [],
  cloudConfigured: false,
  updatedAt: null,
  updatedBy: null,
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const splitSelectorValues = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const createBlankCollectionCard = (
  overrides: Partial<CollectionCardState> = {}
): CollectionCardState => ({
  id: `collection-card-${Date.now()}`,
  label: 'New Collection',
  sublabel: '',
  tag: '',
  visible: true,
  href: '/products',
  imageUrl: '',
  selectorType: 'custom',
  selectorValues: [],
  fallbackCount: 0,
  ...overrides,
});

const fetchCollectionCards = async (): Promise<CollectionCardsState> => {
  const response = await api.get<CollectionCardsResponse>(COLLECTION_CARDS_ENDPOINT);
  return response.collectionCards;
};

const saveCollectionCards = async (
  cards: CollectionCardState[]
): Promise<CollectionCardsState> => {
  const response = await api.put<CollectionCardsResponse>(
    COLLECTION_CARDS_ENDPOINT,
    { cards },
    { timeout: 120_000 }
  );
  return response.collectionCards;
};

const uploadCollectionCardImage = async (
  file: File
): Promise<CollectionCardImageUploadResponse['image']> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<CollectionCardImageUploadResponse>(
    COLLECTION_CARD_IMAGE_ENDPOINT,
    formData,
    { timeout: 120_000 }
  );
  return response.image;
};

type CollectionCardsStateSetter = Dispatch<SetStateAction<CollectionCardsState | null>>;
type ErrorSetter = Dispatch<SetStateAction<string | null>>;

const useCollectionCardsData = (): {
  collectionCards: CollectionCardsState | null;
  error: string | null;
  isLoading: boolean;
  loadCards: () => Promise<void>;
  setCollectionCards: CollectionCardsStateSetter;
  setError: ErrorSetter;
} => {
  const [collectionCards, setCollectionCards] = useState<CollectionCardsState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCards = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      setCollectionCards(await fetchCollectionCards());
    } catch (loadError: unknown) {
      setError(toErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards().catch(() => undefined);
  }, [loadCards]);

  return { collectionCards, error, isLoading, loadCards, setCollectionCards, setError };
};

const useCollectionCardMutators = (input: {
  collectionCards: CollectionCardsState | null;
  setCollectionCards: CollectionCardsStateSetter;
  setError: ErrorSetter;
}): Pick<CollectionCardsController, 'addCard' | 'removeCard' | 'updateCard'> => {
  const updateCard = useCallback((index: number, patch: Partial<CollectionCardState>): void => {
    input.setCollectionCards((current) => current === null ? current : {
      ...current,
      cards: current.cards.map((card, cardIndex) =>
        cardIndex === index ? { ...card, ...patch } : card
      ),
    });
  }, [input]);

  const addCard = useCallback((card: CollectionCardState): void => {
    const current = input.collectionCards ?? EMPTY_COLLECTION_CARDS_STATE;
    if (current.cards.length >= 8) {
      input.setError('Collection cards can contain at most 8 cards.');
      return;
    }
    input.setCollectionCards({ ...current, cards: [...current.cards, card] });
  }, [input]);

  const removeCard = useCallback((index: number): void => {
    if (input.collectionCards === null) return;
    if (input.collectionCards.cards.length <= 1) {
      input.setError('At least one collection card is required.');
      return;
    }
    input.setCollectionCards({
      ...input.collectionCards,
      cards: input.collectionCards.cards.filter((_, cardIndex) => cardIndex !== index),
    });
  }, [input]);

  return { addCard, removeCard, updateCard };
};

const useCollectionCardsSaveAction = (input: {
  collectionCards: CollectionCardsState | null;
  setCollectionCards: CollectionCardsStateSetter;
  setError: ErrorSetter;
}): Pick<CollectionCardsController, 'handleSaveClick' | 'isSaving'> => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveClick = useCallback((): void => {
    const cards = input.collectionCards?.cards ?? [];
    setIsSaving(true);
    input.setError(null);
    saveCollectionCards(cards)
      .then((nextCards) => {
        input.setCollectionCards(nextCards);
        if (nextCards.cloudMirrored === true) {
          toast('Collection cards saved and mirrored.', { variant: 'success' });
        } else {
          toast('Collection cards saved locally. Cloud mirror did not complete.', {
            variant: 'warning',
          });
        }
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

const useCollectionCardImageUploadAction = (input: {
  setError: ErrorSetter;
  updateCard: CollectionCardsController['updateCard'];
}): Pick<CollectionCardsController, 'uploadCardImage' | 'uploadingIndex'> => {
  const { toast } = useToast();
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const uploadCardImage = useCallback((index: number, file: File): void => {
    setUploadingIndex(index);
    input.setError(null);
    uploadCollectionCardImage(file)
      .then((image) => {
        input.updateCard(index, { imageUrl: image.remoteUrl });
        toast('Collection image uploaded. Save cards to publish the URL.', { variant: 'success' });
      })
      .catch((uploadError: unknown) => {
        const message = toErrorMessage(uploadError);
        input.setError(message);
        toast(message, { variant: 'error' });
      })
      .finally(() => setUploadingIndex(null));
  }, [input, toast]);

  return { uploadCardImage, uploadingIndex };
};

export const useCollectionCardsController = (): CollectionCardsController => {
  const data = useCollectionCardsData();
  const mutators = useCollectionCardMutators(data);
  const saveAction = useCollectionCardsSaveAction(data);
  const uploadAction = useCollectionCardImageUploadAction({
    setError: data.setError,
    updateCard: mutators.updateCard,
  });

  return {
    ...mutators,
    ...saveAction,
    ...uploadAction,
    cards: data.collectionCards?.cards ?? [],
    collectionCards: data.collectionCards,
    error: data.error,
    handleRefreshClick: () => {
      data.loadCards().catch(() => undefined);
    },
    isLoading: data.isLoading,
  };
};
