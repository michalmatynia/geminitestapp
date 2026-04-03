import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { internalError } from '@/shared/errors/app-error';

export interface NoteFoldersData {
  selectedFolderId: string;
  setSelectedFolderId: (id: string) => void;
  flatFolders: Array<{ id: string; name: string; level: number }>;
}

const { Context: NoteFoldersContext, useStrictContext: useNoteFoldersContext } =
  createStrictContext<NoteFoldersData>({
    hookName: 'useNoteFoldersContext',
    providerName: 'NoteFormProvider',
    displayName: 'NoteFoldersContext',
    errorFactory: internalError,
  });

export { NoteFoldersContext, useNoteFoldersContext };
