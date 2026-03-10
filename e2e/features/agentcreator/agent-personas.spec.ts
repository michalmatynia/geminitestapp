import { expect, test, type Page } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s2g9n0AAAAASUVORK5CYII=';
const PNG_BASE64 = PNG_DATA_URL.replace(/^data:image\/png;base64,/, '');

type StoredPersona = {
  id: string;
  name: string;
  description?: string | null;
  defaultMoodId?: string;
  settings?: {
    customInstructions?: string;
    memory?: {
      enabled?: boolean;
      includeChatHistory?: boolean;
      useMoodSignals?: boolean;
      defaultSearchLimit?: number;
    };
  };
  moods?: Array<{
    id: string;
    label: string;
    svgContent: string;
    avatarImageUrl?: string | null;
    avatarImageFileId?: string | null;
    avatarThumbnailRef?: string | null;
    useEmbeddedThumbnail?: boolean;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

async function readAgentPersonas(page: Page): Promise<StoredPersona[]> {
  return await page.evaluate(async () => {
    const response = await fetch('/api/settings?scope=heavy&fresh=1&key=agent_personas', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to read agent personas (${response.status}).`);
    }

    const payload = (await response.json()) as Array<{ key: string; value: string }>;
    const rawValue = Array.isArray(payload) && typeof payload[0]?.value === 'string'
      ? payload[0].value
      : '[]';
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredPersona[]) : [];
  });
}

async function writeAgentPersonas(page: Page, personas: StoredPersona[]): Promise<void> {
  await page.evaluate(async (nextPersonas) => {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        key: 'agent_personas',
        value: JSON.stringify(nextPersonas),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to write agent personas (${response.status}).`);
    }
  }, personas);
}

async function deleteUploadedAvatarAssets(
  page: Page,
  options: {
    fileId?: string | null;
    thumbnailRef?: string | null;
  }
): Promise<void> {
  await page.evaluate(async ({ fileId, thumbnailRef }) => {
    const deleteIfPresent = async (url: string): Promise<void> => {
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) {
        throw new Error(`Cleanup failed for ${url} (${response.status}).`);
      }
    };

    if (typeof fileId === 'string' && fileId.trim()) {
      await deleteIfPresent(`/api/files/${encodeURIComponent(fileId.trim())}`);
    }

    if (typeof thumbnailRef === 'string' && thumbnailRef.trim()) {
      await deleteIfPresent(
        `/api/agentcreator/personas/avatar?thumbnailRef=${encodeURIComponent(thumbnailRef.trim())}`
      );
    }
  }, options);
}

async function openPersonaEditor(page: Page, personaName: string) {
  const personaHeading = page.getByRole('heading', {
    level: 3,
    name: personaName,
    exact: true,
  });
  await expect(personaHeading).toBeVisible();

  const personaCard = personaHeading.locator('xpath=ancestor::*[.//button[@title="Edit"]][1]');
  await personaCard.getByTitle('Edit').click();
  const editor = page.getByRole('dialog', { name: 'Edit Persona' }).last();
  await expect(editor).toBeVisible();
  return editor;
}

async function expectPersonaMemorySettings(
  page: Page,
  expected: {
    memoryEnabled: boolean;
    includeChatHistory: boolean;
    useMoodSignals: boolean;
    defaultSearchLimit: string;
  }
): Promise<void> {
  const memoryEnabled = page.getByLabel('Memory enabled');
  const includeChatHistory = page.getByLabel('Include chat history');
  const useMoodSignals = page.getByLabel('Use mood signals');
  const defaultSearchLimit = page.getByLabel('Default search limit');

  await expect(memoryEnabled).toHaveAttribute(
    'aria-checked',
    expected.memoryEnabled ? 'true' : 'false'
  );
  await expect(includeChatHistory).toHaveAttribute(
    'aria-checked',
    expected.includeChatHistory ? 'true' : 'false'
  );
  await expect(useMoodSignals).toHaveAttribute(
    'aria-checked',
    expected.useMoodSignals ? 'true' : 'false'
  );
  await expect(defaultSearchLimit).toHaveValue(expected.defaultSearchLimit);
}

test.describe('Agent Personas', () => {
  test('retains persona name, avatar, and memory settings after editing and reload', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await ensureAdminSession(page, '/admin');

    const personaId = `e2e-persona-${Date.now().toString(36)}`;
    const personaName = `E2E Persona ${personaId.slice(-6)}`;
    const updatedPersonaName = `${personaName} Updated`;
    const seededPersona: StoredPersona = {
      id: personaId,
      name: personaName,
      description: 'Temporary e2e persona',
      defaultMoodId: 'neutral',
      settings: {
        customInstructions: 'Hidden instruction should survive.',
        memory: {
          enabled: false,
          includeChatHistory: false,
          useMoodSignals: false,
          defaultSearchLimit: 9,
        },
      },
      moods: [
        {
          id: 'neutral',
          label: 'Neutral',
          svgContent: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>',
        },
      ],
      createdAt: '2026-03-09T00:00:00.000Z',
      updatedAt: '2026-03-09T00:00:00.000Z',
    };

    const previousPersonas = await readAgentPersonas(page);
    const seededPersonas = [...previousPersonas.filter((persona) => persona.id !== personaId), seededPersona];
    let uploadedAvatarFileId: string | null = null;
    let uploadedAvatarThumbnailRef: string | null = null;

    await writeAgentPersonas(page, seededPersonas);

    try {
      await page.goto('/admin/agentcreator/personas', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: 'Agent Personas' })).toBeVisible();

      const editor = await openPersonaEditor(page, personaName);
      await expectPersonaMemorySettings(page, {
        memoryEnabled: false,
        includeChatHistory: false,
        useMoodSignals: false,
        defaultSearchLimit: '9',
      });

      const nameInput = editor.getByPlaceholder('Enter persona name');
      await nameInput.fill(updatedPersonaName);
      await expect(nameInput).toHaveValue(updatedPersonaName);

      const avatarUploadResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/api/agentcreator/personas/avatar')
      );
      await editor
        .getByPlaceholder(/data:image\/png;base64/i)
        .fill(PNG_DATA_URL);
      await editor.getByRole('button', { name: 'Import pasted avatar' }).click();

      const avatarUploadResponse = await avatarUploadResponsePromise;
      expect(avatarUploadResponse.ok()).toBe(true);
      const uploadedAvatar = (await avatarUploadResponse.json()) as {
        id?: string;
        filepath?: string;
        thumbnail?: { ref?: string | null } | null;
      };
      uploadedAvatarFileId =
        typeof uploadedAvatar.id === 'string' && uploadedAvatar.id.trim()
          ? uploadedAvatar.id
          : null;
      uploadedAvatarThumbnailRef =
        typeof uploadedAvatar.thumbnail?.ref === 'string' && uploadedAvatar.thumbnail.ref.trim()
          ? uploadedAvatar.thumbnail.ref
          : null;

      const neutralPreviewImage = editor.getByTestId('agent-persona-mood-preview-neutral').locator('img');
      await expect(neutralPreviewImage).toHaveAttribute(
        'src',
        uploadedAvatar.filepath ?? /\/uploads\/agentcreator\/personas\//
      );

      const defaultSearchLimitInput = page.getByLabel('Default search limit');
      await defaultSearchLimitInput.fill('12');
      await expect(defaultSearchLimitInput).toHaveValue('12');
      await defaultSearchLimitInput.press('Tab');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByRole('dialog', { name: 'Edit Persona' })).toHaveCount(0);
      await expect(
        page.getByRole('heading', { level: 3, name: updatedPersonaName, exact: true })
      ).toBeVisible();

      const savedPersonas = await readAgentPersonas(page);
      const savedPersona = savedPersonas.find((persona) => persona.id === personaId) ?? null;
      const savedNeutralMood =
        savedPersona?.moods?.find((mood) => mood.id === 'neutral') ?? null;

      expect(savedPersona?.name).toBe(updatedPersonaName);
      expect(savedPersona?.settings?.customInstructions).toBe('Hidden instruction should survive.');
      expect(savedPersona?.settings?.memory).toMatchObject({
        enabled: false,
        includeChatHistory: false,
        useMoodSignals: false,
        defaultSearchLimit: 12,
      });
      expect(savedNeutralMood?.avatarImageFileId).toBe(uploadedAvatarFileId);
      expect(savedNeutralMood?.avatarImageUrl).toBe(uploadedAvatar.filepath ?? null);
      if (uploadedAvatarThumbnailRef) {
        expect(savedNeutralMood?.avatarThumbnailRef).toBe(uploadedAvatarThumbnailRef);
      }

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: 'Agent Personas' })).toBeVisible();

      const reloadedEditor = await openPersonaEditor(page, updatedPersonaName);
      await expectPersonaMemorySettings(page, {
        memoryEnabled: false,
        includeChatHistory: false,
        useMoodSignals: false,
        defaultSearchLimit: '12',
      });
      await expect(reloadedEditor.getByPlaceholder('Enter persona name')).toHaveValue(
        updatedPersonaName
      );
      await expect(
        reloadedEditor.getByTestId('agent-persona-mood-preview-neutral').locator('img')
      ).toHaveAttribute('src', savedNeutralMood?.avatarImageUrl ?? /\/uploads\/agentcreator\/personas\//);
    } finally {
      await writeAgentPersonas(page, previousPersonas);
      if (uploadedAvatarFileId || uploadedAvatarThumbnailRef) {
        await deleteUploadedAvatarAssets(page, {
          fileId: uploadedAvatarFileId,
          thumbnailRef: uploadedAvatarThumbnailRef,
        });
      }
    }
  });

  test('retains persona name and avatar after file upload and reload', async ({ page }) => {
    test.setTimeout(120_000);

    await ensureAdminSession(page, '/admin');

    const personaId = `e2e-upload-${Date.now().toString(36)}`;
    const personaName = `Upload Persona ${personaId.slice(-6)}`;
    const updatedPersonaName = `${personaName} Renamed`;
    const seededPersona: StoredPersona = {
      id: personaId,
      name: personaName,
      description: 'Temporary uploaded-avatar persona',
      defaultMoodId: 'neutral',
      settings: {
        customInstructions: 'Upload path should survive.',
      },
      moods: [
        {
          id: 'neutral',
          label: 'Neutral',
          svgContent: '<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="28" /></svg>',
        },
      ],
      createdAt: '2026-03-09T00:00:00.000Z',
      updatedAt: '2026-03-09T00:00:00.000Z',
    };

    const previousPersonas = await readAgentPersonas(page);
    const seededPersonas = [
      ...previousPersonas.filter((persona) => persona.id !== personaId),
      seededPersona,
    ];
    let uploadedAvatarFileId: string | null = null;
    let uploadedAvatarThumbnailRef: string | null = null;

    await writeAgentPersonas(page, seededPersonas);

    try {
      await page.goto('/admin/agentcreator/personas', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: 'Agent Personas' })).toBeVisible();

      const editor = await openPersonaEditor(page, personaName);
      await editor.getByPlaceholder('Enter persona name').fill(updatedPersonaName);

      const avatarUploadResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/api/agentcreator/personas/avatar')
      );
      await editor.locator('input[type="file"]').setInputFiles({
        name: 'persona-avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from(PNG_BASE64, 'base64'),
      });

      const avatarUploadResponse = await avatarUploadResponsePromise;
      expect(avatarUploadResponse.ok()).toBe(true);
      const uploadedAvatar = (await avatarUploadResponse.json()) as {
        id?: string;
        filepath?: string;
        thumbnail?: { ref?: string | null } | null;
      };
      uploadedAvatarFileId =
        typeof uploadedAvatar.id === 'string' && uploadedAvatar.id.trim()
          ? uploadedAvatar.id
          : null;
      uploadedAvatarThumbnailRef =
        typeof uploadedAvatar.thumbnail?.ref === 'string' && uploadedAvatar.thumbnail.ref.trim()
          ? uploadedAvatar.thumbnail.ref
          : null;

      await expect(
        editor.getByTestId('agent-persona-mood-preview-neutral').locator('img')
      ).toHaveAttribute('src', uploadedAvatar.filepath ?? /\/uploads\/agentcreator\/personas\//);

      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByRole('dialog', { name: 'Edit Persona' })).toHaveCount(0);
      await expect(
        page.getByRole('heading', { level: 3, name: updatedPersonaName, exact: true })
      ).toBeVisible();

      const savedPersonas = await readAgentPersonas(page);
      const savedPersona = savedPersonas.find((persona) => persona.id === personaId) ?? null;
      const savedNeutralMood =
        savedPersona?.moods?.find((mood) => mood.id === 'neutral') ?? null;

      expect(savedPersona?.name).toBe(updatedPersonaName);
      expect(savedPersona?.settings?.customInstructions).toBe('Upload path should survive.');
      expect(savedNeutralMood?.avatarImageFileId).toBe(uploadedAvatarFileId);
      expect(savedNeutralMood?.avatarImageUrl).toBe(uploadedAvatar.filepath ?? null);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: 'Agent Personas' })).toBeVisible();

      const reloadedEditor = await openPersonaEditor(page, updatedPersonaName);
      await expect(reloadedEditor.getByPlaceholder('Enter persona name')).toHaveValue(
        updatedPersonaName
      );
      await expect(
        reloadedEditor.getByTestId('agent-persona-mood-preview-neutral').locator('img')
      ).toHaveAttribute('src', savedNeutralMood?.avatarImageUrl ?? /\/uploads\/agentcreator\/personas\//);
    } finally {
      await writeAgentPersonas(page, previousPersonas);
      if (uploadedAvatarFileId || uploadedAvatarThumbnailRef) {
        await deleteUploadedAvatarAssets(page, {
          fileId: uploadedAvatarFileId,
          thumbnailRef: uploadedAvatarThumbnailRef,
        });
      }
    }
  });
});
