import { useState, type Dispatch, type SetStateAction } from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';

import {
  type AddonFormState,
  type EditorState,
  emptyAddonForm,
  emptyEditorState,
} from '../SocialPublishingPage.Constants';

export type SocialEditorLocalState = {
  activePostId: string | null;
  setActivePostId: Dispatch<SetStateAction<string | null>>;
  editorState: EditorState;
  setEditorState: Dispatch<SetStateAction<EditorState>>;
  scheduledAt: string;
  setScheduledAt: Dispatch<SetStateAction<string>>;
  docReferenceInput: string;
  setDocReferenceInput: Dispatch<SetStateAction<string>>;
  generationNotes: string;
  setGenerationNotes: Dispatch<SetStateAction<string>>;
  draftImageAssets: ImageFileSelection[];
  setDraftImageAssets: Dispatch<SetStateAction<ImageFileSelection[]>>;
  draftImageAddonIds: string[];
  setDraftImageAddonIds: Dispatch<SetStateAction<string[]>>;
  hydratedDraftPostId: string | null;
  setHydratedDraftPostId: Dispatch<SetStateAction<string | null>>;
  addonForm: AddonFormState;
  setAddonForm: Dispatch<SetStateAction<AddonFormState>>;
  showMediaLibrary: boolean;
  setShowMediaLibrary: Dispatch<SetStateAction<boolean>>;
  contextSummary: string | null;
  setContextSummary: Dispatch<SetStateAction<string | null>>;
  setImageAssets: Dispatch<SetStateAction<ImageFileSelection[]>>;
  setImageAddonIds: Dispatch<SetStateAction<string[]>>;
};

export const useSocialEditorLocalState = (): SocialEditorLocalState => {
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(emptyEditorState);
  const [scheduledAt, setScheduledAt] = useState('');
  const [docReferenceInput, setDocReferenceInput] = useState('');
  const [generationNotes, setGenerationNotes] = useState('');
  const [draftImageAssets, setDraftImageAssets] = useState<ImageFileSelection[]>([]);
  const [draftImageAddonIds, setDraftImageAddonIds] = useState<string[]>([]);
  const [hydratedDraftPostId, setHydratedDraftPostId] = useState<string | null>(null);
  const [addonForm, setAddonForm] = useState<AddonFormState>(emptyAddonForm);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [contextSummary, setContextSummary] = useState<string | null>(null);

  return {
    activePostId,
    setActivePostId,
    editorState,
    setEditorState,
    scheduledAt,
    setScheduledAt,
    docReferenceInput,
    setDocReferenceInput,
    generationNotes,
    setGenerationNotes,
    draftImageAssets,
    setDraftImageAssets,
    draftImageAddonIds,
    setDraftImageAddonIds,
    hydratedDraftPostId,
    setHydratedDraftPostId,
    addonForm,
    setAddonForm,
    showMediaLibrary,
    setShowMediaLibrary,
    contextSummary,
    setContextSummary,
    setImageAssets: setDraftImageAssets,
    setImageAddonIds: setDraftImageAddonIds,
  };
};
