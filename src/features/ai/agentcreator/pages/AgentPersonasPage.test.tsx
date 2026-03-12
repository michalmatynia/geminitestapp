/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentPersona } from '@/shared/contracts/agents';

import {
  buildAgentPersonaMood,
  buildAgentPersonaSettings,
} from '../utils/personas';

const {
  useAgentPersonasMock,
  useSaveAgentPersonasMutationMock,
  deletePersonaAvatarMock,
  deletePersonaAvatarThumbnailMock,
  toastMock,
  logClientErrorMock,
} = vi.hoisted(() => ({
  useAgentPersonasMock: vi.fn(),
  useSaveAgentPersonasMutationMock: vi.fn(),
  deletePersonaAvatarMock: vi.fn(),
  deletePersonaAvatarThumbnailMock: vi.fn(),
  toastMock: vi.fn(),
  logClientErrorMock: vi.fn(),
}));

let latestItemLibraryProps: Record<string, unknown> | null = null;

vi.mock('@/features/ai/agentcreator/hooks/useAgentPersonas', () => ({
  useAgentPersonas: useAgentPersonasMock,
  useSaveAgentPersonasMutation: useSaveAgentPersonasMutationMock,
}));

vi.mock('@/features/ai/agentcreator/utils/avatar-input', () => ({
  deletePersonaAvatar: deletePersonaAvatarMock,
  deletePersonaAvatarThumbnail: deletePersonaAvatarThumbnailMock,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

vi.mock('@/features/ai/agentcreator/components/AgentPersonaSettingsForm', () => ({
  AgentPersonaSettingsForm: () => <div data-testid='agent-persona-settings-form' />,
}));

vi.mock('@/shared/ui', () => ({
  ItemLibrary: (props: Record<string, unknown>) => {
    latestItemLibraryProps = props;
    return <div data-testid='item-library' />;
  },
  AdminAgentCreatorBreadcrumbs: ({
    current,
    ...props
  }: {
    current: string;
    className?: string;
  }) => <nav {...props}>{current}</nav>,
  useToast: () => ({ toast: toastMock }),
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

import { AgentPersonasPage } from './AgentPersonasPage';

const buildPersona = (overrides?: Partial<AgentPersona>): AgentPersona => ({
  id: 'persona-1',
  name: 'Helpful Tutor',
  description: 'Persona description',
  defaultMoodId: 'neutral',
  moods: [
    buildAgentPersonaMood('neutral', {
      svgContent: '',
      avatarImageFileId: 'file-old',
      avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/old.png',
    }),
  ],
  settings: buildAgentPersonaSettings(),
  createdAt: '2026-03-07T10:00:00.000Z',
  updatedAt: '2026-03-07T10:00:00.000Z',
  ...overrides,
});

const getItemLibraryProps = (): {
  onSave: (item: Partial<AgentPersona>) => Promise<void>;
  onDelete: (item: AgentPersona) => Promise<void>;
  onEditorClose?: (args: {
    draft: Partial<AgentPersona>;
    originalItem: AgentPersona | null;
    saved: boolean;
  }) => Promise<void> | void;
} => {
  if (!latestItemLibraryProps) {
    throw new Error('Expected ItemLibrary props to be captured.');
  }

  return latestItemLibraryProps as {
    onSave: (item: Partial<AgentPersona>) => Promise<void>;
    onDelete: (item: AgentPersona) => Promise<void>;
    onEditorClose?: (args: {
      draft: Partial<AgentPersona>;
      originalItem: AgentPersona | null;
      saved: boolean;
    }) => Promise<void> | void;
  };
};

describe('AgentPersonasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestItemLibraryProps = null;
    useSaveAgentPersonasMutationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    useAgentPersonasMock.mockReturnValue({
      data: [buildPersona()],
      isLoading: false,
    });
    deletePersonaAvatarMock.mockResolvedValue(undefined);
    deletePersonaAvatarThumbnailMock.mockResolvedValue(undefined);
  });

  it('deletes replaced avatar files only after a successful save', async () => {
    const savePersonasMock = vi.fn().mockResolvedValue(undefined);
    useSaveAgentPersonasMutationMock.mockReturnValue({
      mutateAsync: savePersonasMock,
      isPending: false,
    });
    const existingPersona = buildPersona();
    useAgentPersonasMock.mockReturnValue({
      data: [existingPersona],
      isLoading: false,
    });

    render(<AgentPersonasPage />);
    const props = getItemLibraryProps();

    await props.onSave({
      ...existingPersona,
      moods: [
        buildAgentPersonaMood('neutral', {
          svgContent: '',
          avatarImageFileId: 'file-new',
          avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/new.png',
        }),
      ],
    });

    expect(savePersonasMock).toHaveBeenCalledTimes(1);
    expect(deletePersonaAvatarMock).toHaveBeenCalledTimes(1);
    expect(deletePersonaAvatarMock).toHaveBeenCalledWith('file-old');
    expect(toastMock).toHaveBeenCalledWith('Persona updated.', { variant: 'success' });
  });

  it('keeps existing avatar file refs when saving non-avatar edits', async () => {
    const savePersonasMock = vi.fn().mockResolvedValue(undefined);
    useSaveAgentPersonasMutationMock.mockReturnValue({
      mutateAsync: savePersonasMock,
      isPending: false,
    });
    const existingPersona = buildPersona({
      name: 'Helpful Tutor',
      moods: [
        buildAgentPersonaMood('neutral', {
          svgContent: '',
          avatarImageFileId: 'file-old',
          avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/old.png',
          avatarThumbnailRef: 'thumbnail-old',
        }),
      ],
    });
    useAgentPersonasMock.mockReturnValue({
      data: [existingPersona],
      isLoading: false,
    });

    render(<AgentPersonasPage />);
    const props = getItemLibraryProps();

    await props.onSave({
      ...existingPersona,
      name: 'Helpful Tutor updated',
      description: 'Updated description',
    });

    expect(savePersonasMock).toHaveBeenCalledTimes(1);
    expect(savePersonasMock).toHaveBeenCalledWith({
      personas: [
        expect.objectContaining({
          id: 'persona-1',
          name: 'Helpful Tutor updated',
          description: 'Updated description',
          moods: [
            expect.objectContaining({
              avatarImageFileId: 'file-old',
              avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/old.png',
              avatarThumbnailRef: 'thumbnail-old',
            }),
          ],
        }),
      ],
    });
    expect(deletePersonaAvatarMock).not.toHaveBeenCalled();
    expect(deletePersonaAvatarThumbnailMock).not.toHaveBeenCalled();
  });

  it('preserves embedded avatar thumbnail data in the saved persona payload', async () => {
    const savePersonasMock = vi.fn().mockResolvedValue(undefined);
    useSaveAgentPersonasMutationMock.mockReturnValue({
      mutateAsync: savePersonasMock,
      isPending: false,
    });
    const existingPersona = buildPersona({
      moods: [
        buildAgentPersonaMood('neutral', {
          svgContent: '',
          avatarImageFileId: 'file-old',
          avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/old.png',
          avatarThumbnailRef: 'thumbnail-old',
          avatarThumbnailDataUrl: 'data:image/webp;base64,embedded-old',
          avatarThumbnailMimeType: 'image/webp',
          avatarThumbnailBytes: 2048,
          avatarThumbnailWidth: 96,
          avatarThumbnailHeight: 96,
          useEmbeddedThumbnail: true,
        }),
      ],
    });
    useAgentPersonasMock.mockReturnValue({
      data: [existingPersona],
      isLoading: false,
    });

    render(<AgentPersonasPage />);
    const props = getItemLibraryProps();

    await props.onSave({
      ...existingPersona,
      description: 'Updated description',
    });

    expect(savePersonasMock).toHaveBeenCalledWith({
      personas: [
        expect.objectContaining({
          id: 'persona-1',
          description: 'Updated description',
          moods: [
            expect.objectContaining({
              avatarImageFileId: 'file-old',
              avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/old.png',
              avatarThumbnailRef: 'thumbnail-old',
              avatarThumbnailDataUrl: 'data:image/webp;base64,embedded-old',
              avatarThumbnailMimeType: 'image/webp',
              avatarThumbnailBytes: 2048,
              avatarThumbnailWidth: 96,
              avatarThumbnailHeight: 96,
              useEmbeddedThumbnail: true,
            }),
          ],
        }),
      ],
    });
    expect(deletePersonaAvatarThumbnailMock).not.toHaveBeenCalled();
  });

  it('preserves existing persona settings when the draft omits the settings payload', async () => {
    const savePersonasMock = vi.fn().mockResolvedValue(undefined);
    useSaveAgentPersonasMutationMock.mockReturnValue({
      mutateAsync: savePersonasMock,
      isPending: false,
    });
    const existingPersona = buildPersona({
      settings: buildAgentPersonaSettings({
        customInstructions: 'Stay concise',
        memory: {
          enabled: false,
          defaultSearchLimit: 9,
        },
      }),
    });
    useAgentPersonasMock.mockReturnValue({
      data: [existingPersona],
      isLoading: false,
    });

    render(<AgentPersonasPage />);
    const props = getItemLibraryProps();

    await props.onSave({
      id: existingPersona.id,
      name: 'Helpful Tutor updated',
      description: 'Updated description',
    });

    expect(savePersonasMock).toHaveBeenCalledWith({
      personas: [
        expect.objectContaining({
          id: existingPersona.id,
          name: 'Helpful Tutor updated',
          description: 'Updated description',
          settings: {
            customInstructions: 'Stay concise',
            memory: {
              enabled: false,
              includeChatHistory: true,
              useMoodSignals: true,
              defaultSearchLimit: 9,
            },
          },
        }),
      ],
    });
  });

  it('does not delete saved avatar files when save fails', async () => {
    const savePersonasMock = vi.fn().mockRejectedValue(new Error('Save failed.'));
    useSaveAgentPersonasMutationMock.mockReturnValue({
      mutateAsync: savePersonasMock,
      isPending: false,
    });
    const existingPersona = buildPersona();
    useAgentPersonasMock.mockReturnValue({
      data: [existingPersona],
      isLoading: false,
    });

    render(<AgentPersonasPage />);
    const props = getItemLibraryProps();

    await expect(
      props.onSave({
        ...existingPersona,
        moods: [
          buildAgentPersonaMood('neutral', {
            svgContent: '',
            avatarImageFileId: 'file-new',
            avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/new.png',
          }),
        ],
      })
    ).rejects.toThrow('Save failed.');

    expect(deletePersonaAvatarMock).not.toHaveBeenCalled();
    expect(logClientErrorMock).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith('Save failed.', { variant: 'error' });
  });

  it('deletes replaced avatar thumbnail refs only after a successful save', async () => {
    const savePersonasMock = vi.fn().mockResolvedValue(undefined);
    useSaveAgentPersonasMutationMock.mockReturnValue({
      mutateAsync: savePersonasMock,
      isPending: false,
    });
    const existingPersona = buildPersona({
      moods: [
        buildAgentPersonaMood('neutral', {
          svgContent: '',
          avatarImageFileId: 'file-old',
          avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/old.png',
          avatarThumbnailRef: 'thumbnail-old',
          avatarThumbnailDataUrl: 'data:image/webp;base64,embedded-old',
          avatarThumbnailMimeType: 'image/webp',
          avatarThumbnailBytes: 2048,
          avatarThumbnailWidth: 96,
          avatarThumbnailHeight: 96,
          useEmbeddedThumbnail: true,
        }),
      ],
    });
    useAgentPersonasMock.mockReturnValue({
      data: [existingPersona],
      isLoading: false,
    });

    render(<AgentPersonasPage />);
    const props = getItemLibraryProps();

    await props.onSave({
      ...existingPersona,
      moods: [
        buildAgentPersonaMood('neutral', {
          svgContent: '',
          avatarImageFileId: 'file-new',
          avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/new.png',
          avatarThumbnailRef: 'thumbnail-new',
          avatarThumbnailDataUrl: 'data:image/webp;base64,embedded-new',
          avatarThumbnailMimeType: 'image/webp',
          avatarThumbnailBytes: 2048,
          avatarThumbnailWidth: 96,
          avatarThumbnailHeight: 96,
          useEmbeddedThumbnail: true,
        }),
      ],
    });

    expect(savePersonasMock).toHaveBeenCalledTimes(1);
    expect(deletePersonaAvatarMock).toHaveBeenCalledWith('file-old');
    expect(deletePersonaAvatarThumbnailMock).toHaveBeenCalledTimes(1);
    expect(deletePersonaAvatarThumbnailMock).toHaveBeenCalledWith('thumbnail-old');
  });

  it('cleans up draft-only uploaded avatar files when the editor closes without saving', async () => {
    const existingPersona = buildPersona();
    useAgentPersonasMock.mockReturnValue({
      data: [existingPersona],
      isLoading: false,
    });

    render(<AgentPersonasPage />);
    const props = getItemLibraryProps();

    await props.onEditorClose?.({
      draft: {
        ...existingPersona,
        moods: [
          buildAgentPersonaMood('neutral', {
            svgContent: '',
            avatarImageFileId: 'draft-file-1',
            avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/draft.png',
          }),
        ],
      },
      originalItem: existingPersona,
      saved: false,
    });

    expect(deletePersonaAvatarMock).toHaveBeenCalledTimes(1);
    expect(deletePersonaAvatarMock).toHaveBeenCalledWith('draft-file-1');
  });

  it('skips draft cleanup after a successful save close', async () => {
    const existingPersona = buildPersona();
    useAgentPersonasMock.mockReturnValue({
      data: [existingPersona],
      isLoading: false,
    });

    render(<AgentPersonasPage />);
    const props = getItemLibraryProps();

    await props.onEditorClose?.({
      draft: existingPersona,
      originalItem: existingPersona,
      saved: true,
    });

    expect(deletePersonaAvatarMock).not.toHaveBeenCalled();
  });

  it('deletes all avatar files for a persona after successful deletion', async () => {
    const savePersonasMock = vi.fn().mockResolvedValue(undefined);
    useSaveAgentPersonasMutationMock.mockReturnValue({
      mutateAsync: savePersonasMock,
      isPending: false,
    });
    const persona = buildPersona({
      moods: [
        buildAgentPersonaMood('neutral', {
          svgContent: '',
          avatarImageFileId: 'file-1',
          avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/one.png',
        }),
        buildAgentPersonaMood('thinking', {
          svgContent: '',
          avatarImageFileId: 'file-1',
          avatarImageUrl: '/uploads/agentcreator/personas/persona-1/thinking/dup.png',
        }),
        buildAgentPersonaMood('encouraging', {
          svgContent: '',
          avatarImageFileId: 'file-2',
          avatarImageUrl: '/uploads/agentcreator/personas/persona-1/encouraging/two.png',
        }),
      ],
    });
    useAgentPersonasMock.mockReturnValue({
      data: [persona],
      isLoading: false,
    });

    render(<AgentPersonasPage />);
    const props = getItemLibraryProps();

    await props.onDelete(persona);

    expect(savePersonasMock).toHaveBeenCalledWith({ personas: [] });
    expect(deletePersonaAvatarMock).toHaveBeenCalledTimes(2);
    expect(deletePersonaAvatarMock).toHaveBeenNthCalledWith(1, 'file-1');
    expect(deletePersonaAvatarMock).toHaveBeenNthCalledWith(2, 'file-2');
    expect(toastMock).toHaveBeenCalledWith('Persona deleted.', { variant: 'success' });
  });
});
