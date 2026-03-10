/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentPersonaMood } from '@/shared/contracts/agents';
import { ToastProvider } from '@/shared/ui';

import { buildAgentPersonaMood, buildDefaultAgentPersonaMoods } from '../utils/personas';
import { AgentPersonaMoodEditor } from './AgentPersonaMoodEditor';

const { uploadPersonaAvatarMock, deletePersonaAvatarMock } = vi.hoisted(() => ({
  uploadPersonaAvatarMock: vi.fn(),
  deletePersonaAvatarMock: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    fill: _fill,
    unoptimized: _unoptimized,
    sizes: _sizes,
    ...rest
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    src: string;
    unoptimized?: boolean;
    sizes?: string;
  }) => <img alt={alt} src={src} {...rest} />,
}));

vi.mock('@/features/ai/agentcreator/utils/avatar-input', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/ai/agentcreator/utils/avatar-input')>(
      '@/features/ai/agentcreator/utils/avatar-input'
    );

  return {
    ...actual,
    uploadPersonaAvatar: uploadPersonaAvatarMock,
    deletePersonaAvatar: deletePersonaAvatarMock,
  };
});

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s2g9n0AAAAASUVORK5CYII=';

type RenderEditorOptions = {
  moods?: AgentPersonaMood[];
  originalMoods?: AgentPersonaMood[] | null;
};

function renderEditor(options: RenderEditorOptions = {}) {
  const changes: Array<{
    moods: AgentPersonaMood[];
    defaultMoodId: string;
  }> = [];

  function Harness(): React.JSX.Element {
    const [moods, setMoods] = React.useState<AgentPersonaMood[]>(
      options.moods ?? buildDefaultAgentPersonaMoods()
    );

    return (
      <ToastProvider>
        <AgentPersonaMoodEditor
          moods={moods}
          originalMoods={options.originalMoods ?? null}
          personaId='persona-test'
          onChange={({ moods: nextMoods, defaultMoodId }) => {
            changes.push({ moods: nextMoods, defaultMoodId });
            setMoods(nextMoods);
          }}
        />
      </ToastProvider>
    );
  }

  render(<Harness />);

  return {
    changes,
    getLatestMood(): AgentPersonaMood {
      const latest = changes.at(-1)?.moods[0];
      if (!latest) {
        throw new Error('No mood changes were emitted.');
      }
      return latest;
    },
  };
}

describe('AgentPersonaMoodEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadPersonaAvatarMock.mockResolvedValue({
      id: 'uploaded-file-1',
      filename: 'avatar.png',
      filepath: '/uploads/agentcreator/personas/persona-test/neutral/avatar.png',
      mimetype: 'image/png',
      size: 68,
    });
    deletePersonaAvatarMock.mockResolvedValue(undefined);
  });

  it('imports raw base64 input as an uploaded avatar', async () => {
    const runtime = renderEditor({
      originalMoods: buildDefaultAgentPersonaMoods(),
    });

    fireEvent.change(screen.getByPlaceholderText(/data:image\/png;base64/i), {
      target: { value: PNG_BASE64 },
    });
    fireEvent.click(screen.getByRole('button', { name: /import pasted avatar/i }));

    await waitFor(() => expect(uploadPersonaAvatarMock).toHaveBeenCalledTimes(1));

    expect(uploadPersonaAvatarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: 'persona-test',
        moodId: 'neutral',
        file: expect.any(File),
      })
    );
    expect(uploadPersonaAvatarMock.mock.calls[0]?.[0].file.type).toBe('image/png');
    expect(uploadPersonaAvatarMock.mock.calls[0]?.[0].file.name).toBe('persona-neutral.png');

    expect(runtime.getLatestMood()).toMatchObject({
      id: 'neutral',
      svgContent: '',
      avatarImageFileId: 'uploaded-file-1',
      avatarImageUrl: '/uploads/agentcreator/personas/persona-test/neutral/avatar.png',
    });
    expect(
      screen
        .getByTestId('agent-persona-mood-preview-neutral')
        .querySelector('img')
        ?.getAttribute('src')
    ).toBe('/uploads/agentcreator/personas/persona-test/neutral/avatar.png');
    expect(screen.getByPlaceholderText(/data:image\/png;base64/i)).toHaveValue('');
  });

  it('uploads clipboard image files through the upload button paste handler', async () => {
    renderEditor({
      originalMoods: buildDefaultAgentPersonaMoods(),
    });

    const file = new File(['clipboard-image'], 'clipboard.png', { type: 'image/png' });
    const uploadButton = screen.getByRole('button', { name: /upload or paste image/i });

    fireEvent.paste(uploadButton, {
      clipboardData: {
        files: [file],
        items: [{ kind: 'file', getAsFile: () => file }],
      },
    });

    await waitFor(() => expect(uploadPersonaAvatarMock).toHaveBeenCalledTimes(1));
    expect(uploadPersonaAvatarMock).toHaveBeenCalledWith({
      file,
      personaId: 'persona-test',
      moodId: 'neutral',
    });
  });

  it('uploads image files selected through the hidden file input', async () => {
    const runtime = renderEditor({
      originalMoods: buildDefaultAgentPersonaMoods(),
    });

    const file = new File(['selected-image'], 'selected.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('Expected hidden file input to be rendered.');
    }

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    await waitFor(() => expect(uploadPersonaAvatarMock).toHaveBeenCalledTimes(1));
    expect(uploadPersonaAvatarMock).toHaveBeenCalledWith({
      file,
      personaId: 'persona-test',
      moodId: 'neutral',
    });
    expect(runtime.getLatestMood()).toMatchObject({
      id: 'neutral',
      avatarImageFileId: 'uploaded-file-1',
      avatarImageUrl: '/uploads/agentcreator/personas/persona-test/neutral/avatar.png',
    });
  });

  it('switches uploaded draft avatars back to inline SVG and deletes the draft file', async () => {
    const draftMood = buildAgentPersonaMood('neutral', {
      svgContent: '',
      avatarImageFileId: 'draft-upload-1',
      avatarImageUrl: '/uploads/agentcreator/personas/draft/neutral/avatar.png',
    });

    const runtime = renderEditor({
      moods: [draftMood],
      originalMoods: buildDefaultAgentPersonaMoods(),
    });

    fireEvent.change(screen.getByPlaceholderText(/Neutral avatar/), {
      target: {
        value: '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff" /></svg>',
      },
    });

    await waitFor(() => expect(deletePersonaAvatarMock).toHaveBeenCalledWith('draft-upload-1'));
    expect(runtime.getLatestMood()).toMatchObject({
      id: 'neutral',
      avatarImageFileId: null,
      avatarImageUrl: null,
    });
    expect(runtime.getLatestMood().svgContent).toContain('<svg');
  });

  it('does not delete an originally saved avatar file while editing back to inline SVG', async () => {
    const savedMood = buildAgentPersonaMood('neutral', {
      svgContent: '',
      avatarImageFileId: 'saved-file-1',
      avatarImageUrl: '/uploads/agentcreator/personas/persona-test/neutral/saved.png',
    });

    const runtime = renderEditor({
      moods: [savedMood],
      originalMoods: [savedMood],
    });

    fireEvent.change(screen.getByPlaceholderText(/Neutral avatar/), {
      target: {
        value: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" fill="#fff" /></svg>',
      },
    });

    expect(deletePersonaAvatarMock).not.toHaveBeenCalled();
    expect(runtime.getLatestMood()).toMatchObject({
      id: 'neutral',
      avatarImageFileId: null,
      avatarImageUrl: null,
    });
  });
});
