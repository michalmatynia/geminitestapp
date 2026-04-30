'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type BaseSyntheticEvent,
  type ComponentType,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import {
  productCreateSchema,
  productUpdateSchema,
} from '@/shared/lib/products/validations/schemas';

import { resolveProductFormDefaultValues } from './ProductFormCoreContext.defaults';
import type {
  ProductFormCoreActionsContextType,
  ProductFormCoreContextType,
  ProductFormCoreProviderProps,
} from './ProductFormCoreContext.types';

type ProductFormRuntimeState = {
  ConfirmationModal: ComponentType;
  generationError: string | null;
  handleSubmitFn: (event?: BaseSyntheticEvent) => Promise<void>;
  hasUnsavedChanges: boolean;
  normalizeNameError: string | null;
  removeNote: (noteId: string) => void;
  selectedNoteIds: string[];
  setConfirmationModal: Dispatch<SetStateAction<ComponentType>>;
  setGenerationError: (error: string | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setNormalizeNameError: (error: string | null) => void;
  setSelectedNoteIds: Dispatch<SetStateAction<string[]>>;
  setUploading: (value: boolean) => void;
  setUploadError: (value: string | null) => void;
  setUploadSuccess: (value: boolean) => void;
  toggleNote: (noteId: string) => void;
  updateConfirmationModal: (component: ComponentType) => void;
  updateHandleSubmit: (fn: (event?: BaseSyntheticEvent) => Promise<void>) => void;
  uploadError: string | null;
  uploadSuccess: boolean;
  uploading: boolean;
};

export type ProductFormCoreProviderValue = {
  actionsValue: ProductFormCoreActionsContextType;
  methods: UseFormReturn<ProductFormData>;
  stateValue: ProductFormCoreContextType;
};

const useProductFormMethods = ({
  draft,
  initialSku,
  product,
  requireSku = true,
}: ProductFormCoreProviderProps): UseFormReturn<ProductFormData> => {
  const formSchema =
    product !== undefined || requireSku === false ? productUpdateSchema : productCreateSchema;
  const defaultValues = useMemo(
    () => resolveProductFormDefaultValues({ product, draft, initialSku }),
    [draft, initialSku, product]
  );
  const defaultValuesSignature = useMemo(
    () =>
      JSON.stringify({
        productId: product?.id ?? null,
        draftId: draft?.id ?? null,
        values: defaultValues,
      }),
    [defaultValues, draft?.id, product?.id]
  );
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(formSchema) as Resolver<ProductFormData>,
    defaultValues,
  });
  const hasAppliedInitialDefaultsRef = useRef(false);
  const latestDefaultValuesRef = useRef(defaultValues);
  latestDefaultValuesRef.current = defaultValues;

  useEffect(() => {
    if (!hasAppliedInitialDefaultsRef.current) {
      hasAppliedInitialDefaultsRef.current = true;
      return;
    }
    methods.reset(latestDefaultValuesRef.current, { keepDirtyValues: true });
  }, [defaultValuesSignature, methods]);

  return methods;
};

const updateNoteSelection = (
  noteId: string,
  updater: (id: string) => (previous: string[]) => string[],
  setSelectedNoteIds: Dispatch<SetStateAction<string[]>>
): void => {
  const id = noteId.trim();
  if (id.length === 0) return;
  setSelectedNoteIds(updater(id));
};

const useProductNoteActions = (
  setSelectedNoteIds: Dispatch<SetStateAction<string[]>>
): Pick<ProductFormRuntimeState, 'removeNote' | 'toggleNote'> => {
  const toggleNote = useCallback((noteId: string): void => {
    updateNoteSelection(
      noteId,
      (id) => (prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]),
      setSelectedNoteIds
    );
  }, [setSelectedNoteIds]);
  const removeNote = useCallback((noteId: string): void => {
    updateNoteSelection(noteId, (id) => (prev) => prev.filter((n) => n !== id), setSelectedNoteIds);
  }, [setSelectedNoteIds]);
  return { removeNote, toggleNote };
};

const useProductFormRuntimeState = ({
  product,
}: ProductFormCoreProviderProps): ProductFormRuntimeState => {
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(() =>
    Array.isArray(product?.noteIds) ? product.noteIds : []
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const handleSubmitRef = useRef<(event?: BaseSyntheticEvent) => Promise<void>>(async () => {});
  const handleSubmitFn = useCallback(
    (event?: BaseSyntheticEvent): Promise<void> => handleSubmitRef.current(event),
    []
  );
  const [ConfirmationModal, setConfirmationModal] = useState<ComponentType>(() => () => null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [normalizeNameError, setNormalizeNameError] = useState<string | null>(null);
  const updateHandleSubmit = useCallback((fn: (event?: BaseSyntheticEvent) => Promise<void>): void => {
    handleSubmitRef.current = fn;
  }, []);
  const updateConfirmationModal = useCallback((component: ComponentType): void => {
    setConfirmationModal((current: ComponentType): ComponentType =>
      current === component ? current : component
    );
  }, []);
  const noteActions = useProductNoteActions(setSelectedNoteIds);

  return {
    ConfirmationModal,
    generationError,
    handleSubmitFn,
    hasUnsavedChanges,
    normalizeNameError,
    selectedNoteIds,
    setConfirmationModal,
    setGenerationError,
    setHasUnsavedChanges,
    setNormalizeNameError,
    setSelectedNoteIds,
    setUploading,
    setUploadError,
    setUploadSuccess,
    updateConfirmationModal,
    updateHandleSubmit,
    uploadError,
    uploadSuccess,
    uploading,
    ...noteActions,
  };
};

const useProductFormStateValue = (
  props: ProductFormCoreProviderProps,
  methods: UseFormReturn<ProductFormData>,
  runtime: ProductFormRuntimeState
): ProductFormCoreContextType =>
  useMemo(
    () => ({
      register: methods.register,
      hasUnsavedChanges: runtime.hasUnsavedChanges,
      errors: methods.formState.errors,
      getValues: methods.getValues,
      selectedNoteIds: runtime.selectedNoteIds,
      generationError: runtime.generationError,
      normalizeNameError: runtime.normalizeNameError,
      product: props.product,
      draft: props.draft,
      ConfirmationModal: runtime.ConfirmationModal,
      methods,
      uploading: runtime.uploading,
      uploadError: runtime.uploadError,
      uploadSuccess: runtime.uploadSuccess,
      validatorSessionKey: props.validatorSessionKey,
    }),
    [methods, props.draft, props.product, props.validatorSessionKey, runtime]
  );

const useProductFormActionsValue = (
  methods: UseFormReturn<ProductFormData>,
  runtime: ProductFormRuntimeState
): ProductFormCoreActionsContextType =>
  useMemo(
    () => ({
      handleSubmit: runtime.handleSubmitFn,
      setValue: methods.setValue,
      toggleNote: runtime.toggleNote,
      removeNote: runtime.removeNote,
      setGenerationError: runtime.setGenerationError,
      setNormalizeNameError: runtime.setNormalizeNameError,
      setHandleSubmit: runtime.updateHandleSubmit,
      setConfirmationModal: runtime.updateConfirmationModal,
      setHasUnsavedChanges: runtime.setHasUnsavedChanges,
      setUploading: runtime.setUploading,
      setUploadError: runtime.setUploadError,
      setUploadSuccess: runtime.setUploadSuccess,
    }),
    [methods.setValue, runtime]
  );

export const useProductFormCoreProviderValue = (
  props: ProductFormCoreProviderProps
): ProductFormCoreProviderValue => {
  const methods = useProductFormMethods(props);
  const runtime = useProductFormRuntimeState(props);
  const stateValue = useProductFormStateValue(props, methods, runtime);
  const actionsValue = useProductFormActionsValue(methods, runtime);
  return { actionsValue, methods, stateValue };
};
