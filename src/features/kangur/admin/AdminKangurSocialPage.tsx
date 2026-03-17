'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Sparkles, ImagePlus, Trash2 } from 'lucide-react';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { MediaLibraryPanel } from '@/features/cms/public';
import {
  useIntegrationConnections,
  useIntegrations,
} from '@/features/integrations/hooks/useIntegrationQueries';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import {
  useGenerateKangurSocialPost,
  useKangurSocialPosts,
  usePatchKangurSocialPost,
  usePublishKangurSocialPost,
  useSaveKangurSocialPost,
} from '@/features/kangur/ui/hooks/useKangurSocialPosts';
import {
  useCreateKangurSocialImageAddon,
  useKangurSocialImageAddons,
} from '@/features/kangur/ui/hooks/useKangurSocialImageAddons';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import {
  Badge,
  Button,
  Card,
  FormSection,
  Input,
  ListPanel,
  SelectSimple,
  Textarea,
} from '@/features/kangur/shared/ui';
import {
  buildKangurSocialPostCombinedBody,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { cn } from '@/features/kangur/shared/utils';

const emptyEditorState = {
  titlePl: '',
  titleEn: '',
  bodyPl: '',
  bodyEn: '',
};

const emptyAddonForm = {
  title: '',
  sourceUrl: '',
  selector: '',
  description: '',
  waitForMs: '',
};

const statusLabel: Record<KangurSocialPost['status'], string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
};

const formatDatetimeLocal = (value?: string | null): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 16);
};

const parseDatetimeLocal = (value: string): string | null => {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const buildImageSelection = (filepath: string): ImageFileSelection => {
  const filename = filepath.split('/').pop() ?? filepath;
  return {
    id: filepath,
    filepath,
    url: filepath,
    filename,
  };
};

const resolveImagePreview = (asset: ImageFileSelection): string =>
  asset.url ?? asset.filepath ?? '';

const mergeImageAssets = (
  current: ImageFileSelection[],
  nextAssets: ImageFileSelection[]
): ImageFileSelection[] => {
  const existing = new Set(
    current
      .map((asset) => asset.id || asset.filepath || asset.url)
      .filter((value): value is string => Boolean(value))
  );
  const merged = [...current];
  nextAssets.forEach((asset) => {
    const key = asset.id || asset.filepath || asset.url;
    if (!key || existing.has(key)) return;
    existing.add(key);
    merged.push({
      ...asset,
      id: asset.id || asset.filepath || asset.url || `image-${merged.length}`,
    });
  });
  return merged;
};

const matchesImageAsset = (asset: ImageFileSelection, candidate: ImageFileSelection): boolean => {
  const keys = new Set(
    [asset.id, asset.filepath, asset.url].filter((value): value is string => Boolean(value))
  );
  return [candidate.id, candidate.filepath, candidate.url].some(
    (value) => Boolean(value && keys.has(value))
  );
};

const BRAIN_MODEL_DEFAULT_VALUE = '__brain_default__';

export function AdminKangurSocialPage(): React.JSX.Element {
  const postsQuery = useKangurSocialPosts({ scope: 'admin' });
  const saveMutation = useSaveKangurSocialPost();
  const patchMutation = usePatchKangurSocialPost();
  const publishMutation = usePublishKangurSocialPost();
  const generateMutation = useGenerateKangurSocialPost();
  const addonsQuery = useKangurSocialImageAddons({ limit: 12 });
  const createAddonMutation = useCreateKangurSocialImageAddon();
  const brainModelOptions = useBrainModelOptions({ capability: 'kangur_social.post_generation' });
  const integrationsQuery = useIntegrations();
  const linkedinIntegration = useMemo(
    () => integrationsQuery.data?.find((integration) => integration.slug === 'linkedin') ?? null,
    [integrationsQuery.data]
  );
  const linkedinConnectionsQuery = useIntegrationConnections(linkedinIntegration?.id);
  const linkedinConnections = linkedinConnectionsQuery.data ?? [];

  const posts = postsQuery.data ?? [];
  const recentAddons = addonsQuery.data ?? [];
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const activePost = useMemo(
    () => posts.find((post) => post.id === activePostId) ?? null,
    [activePostId, posts]
  );
  const hasTrackedViewRef = useRef(false);
  const [editorState, setEditorState] = useState(emptyEditorState);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [docReferenceInput, setDocReferenceInput] = useState<string>('');
  const [generationNotes, setGenerationNotes] = useState<string>('');
  const [imageAssets, setImageAssets] = useState<ImageFileSelection[]>([]);
  const [imageAddonIds, setImageAddonIds] = useState<string[]>([]);
  const [addonForm, setAddonForm] = useState(emptyAddonForm);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [linkedinConnectionId, setLinkedinConnectionId] = useState<string | null>(null);
  const [brainModelId, setBrainModelId] = useState<string | null>(null);

  const linkedInOptions = useMemo(
    () =>
      linkedinConnections.map((connection) => ({
        value: connection.id,
        label: connection.name || connection.username || 'LinkedIn connection',
        description: connection.hasLinkedInAccessToken ? 'Connected' : 'Not connected',
        disabled: connection.hasLinkedInAccessToken === false,
      })),
    [linkedinConnections]
  );
  const brainModelSelectOptions = useMemo(() => {
    const defaultDescription = brainModelOptions.effectiveModelId
      ? `Default: ${brainModelOptions.effectiveModelId}`
      : 'Default model not configured';
    const overrideId = brainModelId?.trim() ?? '';
    const hasOverride = Boolean(overrideId);
    const hasOverrideInList = brainModelOptions.models.includes(overrideId);
    const overrideOption =
      hasOverride && !hasOverrideInList
        ? [
          {
            value: overrideId,
            label: overrideId,
            description: 'Custom override',
          },
        ]
        : [];
    return [
      {
        value: BRAIN_MODEL_DEFAULT_VALUE,
        label: 'Use Brain routing',
        description: defaultDescription,
      },
      ...overrideOption,
      ...brainModelOptions.models.map((modelId) => ({
        value: modelId,
        label: modelId,
        description: modelId === brainModelOptions.effectiveModelId ? 'Routing default' : undefined,
      })),
    ];
  }, [brainModelId, brainModelOptions.effectiveModelId, brainModelOptions.models]);
  const brainModelSelectValue = brainModelId?.trim()
    ? brainModelId
    : BRAIN_MODEL_DEFAULT_VALUE;
  const resolvedBrainModelLabel =
    brainModelId?.trim() || brainModelOptions.effectiveModelId || 'Not configured';
  const selectedLinkedInConnection = useMemo(
    () =>
      linkedinConnections.find((connection) => connection.id === linkedinConnectionId) ?? null,
    [linkedinConnections, linkedinConnectionId]
  );
  const linkedInExpiry = selectedLinkedInConnection?.linkedinExpiresAt
    ? new Date(selectedLinkedInConnection.linkedinExpiresAt)
    : null;
  const linkedInExpiryTime = linkedInExpiry ? linkedInExpiry.getTime() : null;
  const linkedInDaysRemaining =
    linkedInExpiryTime !== null
      ? Math.ceil((linkedInExpiryTime - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
  const linkedInExpiryLabel = linkedInExpiry ? linkedInExpiry.toLocaleString() : null;
  const linkedInExpiryStatus =
    linkedInDaysRemaining !== null && linkedInExpiryTime !== null
      ? linkedInExpiryTime <= Date.now()
        ? 'expired'
        : linkedInDaysRemaining <= 7
          ? 'warning'
          : 'ok'
      : null;
  const docsUsed = useMemo(() => {
    const fromPost = activePost?.docReferences ?? [];
    if (fromPost.length > 0) return fromPost;
    return docReferenceInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }, [activePost?.docReferences, docReferenceInput]);
  const selectedAddonSet = useMemo(() => new Set(imageAddonIds), [imageAddonIds]);

  useEffect(() => {
    if (!activePostId && posts.length > 0) {
      setActivePostId(posts[0]?.id ?? null);
    }
  }, [activePostId, posts]);

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    if (postsQuery.isLoading) return;
    hasTrackedViewRef.current = true;
    trackKangurClientEvent('kangur_social_page_view', {
      postCount: posts.length,
      hasLinkedInIntegration: Boolean(linkedinIntegration),
      connectionCount: linkedinConnections.length,
      brainModelId: brainModelId ?? null,
    });
  }, [
    brainModelId,
    linkedinConnections.length,
    linkedinIntegration,
    posts.length,
    postsQuery.isLoading,
  ]);

  useEffect(() => {
    if (!activePost) {
      setEditorState(emptyEditorState);
      setScheduledAt('');
      setDocReferenceInput('');
      setImageAssets([]);
      setImageAddonIds([]);
      setLinkedinConnectionId(null);
      setBrainModelId(null);
      return;
    }
    setEditorState({
      titlePl: activePost.titlePl ?? '',
      titleEn: activePost.titleEn ?? '',
      bodyPl: activePost.bodyPl ?? '',
      bodyEn: activePost.bodyEn ?? '',
    });
    setScheduledAt(formatDatetimeLocal(activePost.scheduledAt));
    setDocReferenceInput(activePost.docReferences?.join(', ') ?? '');
    setLinkedinConnectionId(activePost.linkedinConnectionId ?? null);
    setBrainModelId(activePost.brainModelId ?? null);
    setImageAddonIds(activePost.imageAddonIds ?? []);
    setImageAssets(
      (activePost.imageAssets ?? []).map((asset, index) => ({
        ...asset,
        id: asset.id || asset.filepath || asset.url || `image-${index}`,
      }))
    );
  }, [activePost]);

  useEffect(() => {
    if (!activePost) return;
    if (activePost.linkedinConnectionId) return;
    if (linkedinConnectionId) return;
    const fallback =
      linkedinConnections.find((connection) => connection.hasLinkedInAccessToken) ??
      linkedinConnections[0];
    if (fallback) {
      setLinkedinConnectionId(fallback.id);
    }
  }, [activePost, linkedinConnections, linkedinConnectionId]);

  const handleAddImages = (filepaths: string[]): void => {
    const nextAssets = filepaths
      .filter((filepath): filepath is string => Boolean(filepath))
      .map((filepath) => buildImageSelection(filepath));
    if (nextAssets.length === 0) return;
    setImageAssets((prev) => mergeImageAssets(prev, nextAssets));
  };

  const handleSelectAddon = (addon: KangurSocialImageAddon): void => {
    setImageAddonIds((prev) => (prev.includes(addon.id) ? prev : [...prev, addon.id]));
    if (addon.imageAsset) {
      setImageAssets((prev) => mergeImageAssets(prev, [addon.imageAsset]));
    }
  };

  const handleRemoveAddon = (addonId: string): void => {
    const addon = recentAddons.find((entry) => entry.id === addonId) ?? null;
    setImageAddonIds((prev) => prev.filter((id) => id !== addonId));
    if (addon?.imageAsset) {
      setImageAssets((prev) =>
        prev.filter((asset) => !matchesImageAsset(asset, addon.imageAsset))
      );
    }
  };

  const handleCreateAddon = async (): Promise<void> => {
    const title = addonForm.title.trim();
    const sourceUrl = addonForm.sourceUrl.trim();
    if (!title || !sourceUrl) return;
    const waitForMsRaw = Number(addonForm.waitForMs);
    const waitForMs = Number.isFinite(waitForMsRaw) ? Math.max(0, waitForMsRaw) : undefined;
    trackKangurClientEvent(
      'kangur_social_addon_capture_attempt',
      buildSocialContext({ addonTitleLength: title.length })
    );
    try {
      const created = await createAddonMutation.mutateAsync({
        title,
        sourceUrl,
        description: addonForm.description.trim() || undefined,
        selector: addonForm.selector.trim() || undefined,
        ...(waitForMs !== undefined ? { waitForMs } : {}),
      });
      setAddonForm(emptyAddonForm);
      handleSelectAddon(created);
      trackKangurClientEvent(
        'kangur_social_addon_capture_success',
        buildSocialContext({ addonId: created.id })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'createAddon',
        ...buildSocialContext({ error: true }),
      });
      trackKangurClientEvent(
        'kangur_social_addon_capture_failed',
        buildSocialContext({ error: true })
      );
    }
  };

  const resolveDocReferences = (): string[] =>
    docReferenceInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  const buildSocialContext = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
    postId: activePost?.id ?? null,
    status: activePost?.status ?? null,
    scheduledAt: parseDatetimeLocal(scheduledAt),
    imageCount: imageAssets.length,
    imageAddonCount: imageAddonIds.length,
    docReferenceCount: resolveDocReferences().length,
    notesLength: generationNotes.trim().length,
    hasLinkedInConnection: Boolean(linkedinConnectionId),
    brainModelId: brainModelId ?? null,
    ...overrides,
  });

  const handleBrainModelChange = (value: string): void => {
    const nextValue = value === BRAIN_MODEL_DEFAULT_VALUE ? null : value;
    setBrainModelId(nextValue);
    trackKangurClientEvent('kangur_social_post_model_select', {
      ...buildSocialContext({ nextModelId: nextValue }),
    });
  };

  const handleLinkedInConnectionChange = (value: string): void => {
    setLinkedinConnectionId(value);
    trackKangurClientEvent('kangur_social_post_connection_select', {
      ...buildSocialContext({ nextConnectionId: value }),
    });
  };

  const handleRemoveImage = (id: string): void => {
    setImageAssets((prev) => prev.filter((asset) => asset.id !== id));
    const matchedAddon = recentAddons.find((addon) => {
      const asset = addon.imageAsset;
      if (!asset) return false;
      return asset.id === id || asset.filepath === id || asset.url === id;
    });
    if (matchedAddon) {
      setImageAddonIds((prev) => prev.filter((addonId) => addonId !== matchedAddon.id));
    }
  };

  const handleCreateDraft = async (): Promise<void> => {
    trackKangurClientEvent('kangur_social_post_create_attempt', buildSocialContext());
    try {
      const created = await saveMutation.mutateAsync({});
      setActivePostId(created.id);
      trackKangurClientEvent(
        'kangur_social_post_create_success',
        buildSocialContext({ postId: created.id })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'createDraft',
        ...buildSocialContext(),
      });
      trackKangurClientEvent(
        'kangur_social_post_create_failed',
        buildSocialContext({ error: true })
      );
    }
  };

  const handleSave = async (nextStatus: KangurSocialPost['status']): Promise<void> => {
    if (!activePost) return;
    const combinedBody = buildKangurSocialPostCombinedBody(
      editorState.bodyPl,
      editorState.bodyEn
    );
    trackKangurClientEvent(
      'kangur_social_post_save_attempt',
      buildSocialContext({ nextStatus })
    );
    try {
      await patchMutation.mutateAsync({
        id: activePost.id,
        updates: {
          ...editorState,
          combinedBody,
          status: nextStatus,
          scheduledAt: nextStatus === 'scheduled' ? parseDatetimeLocal(scheduledAt) : null,
          imageAssets,
          imageAddonIds,
          docReferences: resolveDocReferences(),
          linkedinConnectionId: linkedinConnectionId ?? null,
          brainModelId: brainModelId ?? null,
          publishError: null,
        },
      });
      trackKangurClientEvent(
        'kangur_social_post_save_success',
        buildSocialContext({ nextStatus })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'savePost',
        ...buildSocialContext({ nextStatus }),
      });
      trackKangurClientEvent(
        'kangur_social_post_save_failed',
        buildSocialContext({ nextStatus, error: true })
      );
    }
  };

  const handleGenerate = async (): Promise<void> => {
    if (!activePost) return;
    trackKangurClientEvent(
      'kangur_social_post_generate_attempt',
      buildSocialContext()
    );
    try {
      await generateMutation.mutateAsync({
        postId: activePost.id,
        docReferences: resolveDocReferences(),
        notes: generationNotes,
        modelId: brainModelId ?? undefined,
        imageAddonIds,
      });
      trackKangurClientEvent(
        'kangur_social_post_generate_success',
        buildSocialContext()
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'generatePost',
        ...buildSocialContext(),
      });
      trackKangurClientEvent(
        'kangur_social_post_generate_failed',
        buildSocialContext({ error: true })
      );
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!activePost) return;
    const combinedBody = buildKangurSocialPostCombinedBody(
      editorState.bodyPl,
      editorState.bodyEn
    );
    trackKangurClientEvent(
      'kangur_social_post_publish_attempt',
      buildSocialContext()
    );
    let stage: 'prepare' | 'publish' = 'prepare';
    try {
      await patchMutation.mutateAsync({
        id: activePost.id,
        updates: {
          ...editorState,
          combinedBody,
          scheduledAt: parseDatetimeLocal(scheduledAt),
          imageAssets,
          imageAddonIds,
          docReferences: resolveDocReferences(),
          linkedinConnectionId: linkedinConnectionId ?? null,
          brainModelId: brainModelId ?? null,
          publishError: null,
        },
      });
      stage = 'publish';
      await publishMutation.mutateAsync(activePost.id);
      trackKangurClientEvent(
        'kangur_social_post_publish_success',
        buildSocialContext()
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'publishPost',
        stage,
        ...buildSocialContext(),
      });
      trackKangurClientEvent(
        'kangur_social_post_publish_failed',
        buildSocialContext({ stage, error: true })
      );
    }
  };

  return (
    <KangurAdminContentShell
      title='Kangur Social'
      description='Prepare LinkedIn updates for Kangur and StudiQ improvements.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Social' },
      ]}
      headerActions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button variant='outline' size='sm' onClick={handleCreateDraft}>
            New draft
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/brain?tab=routing'>AI Brain routing</Link>
          </Button>
        </div>
      }
    >
      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]'>
        <ListPanel
          header={
            <div>
              <div className='text-sm font-semibold text-foreground'>Social posts</div>
              <div className='text-sm text-muted-foreground'>
                Drafts, scheduled posts, and published LinkedIn updates.
              </div>
            </div>
          }
          className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          contentClassName='space-y-2'
        >
          {posts.length === 0 ? (
            <Card
              variant='subtle'
              padding='md'
              className='rounded-2xl border-border/60 bg-background/30 text-sm text-muted-foreground'
            >
              No social posts yet. Create a new draft to start.
            </Card>
          ) : (
            posts.map((post) => (
              <button
                key={post.id}
                type='button'
                onClick={() => setActivePostId(post.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-left text-sm transition hover:bg-background/70',
                  activePostId === post.id && 'border-primary/50 bg-primary/5'
                )}
              >
                <div>
                  <div className='font-semibold text-foreground'>
                    {post.titlePl || post.titleEn || 'Untitled update'}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {post.status === 'scheduled'
                      ? `Scheduled: ${formatDatetimeLocal(post.scheduledAt) || '—'}`
                      : post.publishedAt
                        ? `Published: ${formatDatetimeLocal(post.publishedAt)}`
                        : 'Draft'}
                  </div>
                </div>
                <Badge variant={post.status === 'published' ? 'secondary' : 'outline'}>
                  {statusLabel[post.status]}
                </Badge>
              </button>
            ))
          )}
        </ListPanel>

        <div className='space-y-6'>
          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Brain model</div>
                <div className='text-sm text-muted-foreground'>
                  Capability: Kangur Social Post Generation
                </div>
              </div>
              <Badge variant='outline'>{resolvedBrainModelLabel}</Badge>
            </div>
            <div className='mt-3 space-y-2'>
              <SelectSimple
                value={brainModelSelectValue}
                onValueChange={handleBrainModelChange}
                options={brainModelSelectOptions}
                placeholder='Select model override'
                size='sm'
                ariaLabel='Brain model override'
                title='Brain model override'
                disabled={brainModelOptions.isLoading}
              />
              {brainModelId ? (
                <div className='text-xs text-muted-foreground'>
                  Using per-post model override.
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>
                  Using Brain routing defaults.
                </div>
              )}
              {brainModelOptions.sourceWarnings.length > 0 ? (
                <div className='text-xs text-amber-500'>
                  {brainModelOptions.sourceWarnings.join(' ')}
                </div>
              ) : null}
            </div>
          </Card>

          {activePost?.status === 'failed' && activePost.publishError ? (
            <Card
              variant='subtle'
              padding='md'
              className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
            >
              <div className='space-y-2'>
                <div className='text-sm font-semibold text-foreground'>Publish error</div>
                <div className='text-sm text-muted-foreground whitespace-pre-wrap'>
                  {activePost.publishError}
                </div>
              </div>
            </Card>
          ) : null}

          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <div className='space-y-4'>
              <div className='text-sm font-semibold text-foreground'>Post editor</div>

              <FormSection title='Polish' className='space-y-3'>
                <Input
                  placeholder='Polish title'
                  value={editorState.titlePl}
                  onChange={(event) =>
                    setEditorState((prev) => ({ ...prev, titlePl: event.target.value }))
                  }
                />
                <Textarea
                  placeholder='Polish body'
                  rows={5}
                  value={editorState.bodyPl}
                  onChange={(event) =>
                    setEditorState((prev) => ({ ...prev, bodyPl: event.target.value }))
                  }
                />
              </FormSection>

              <FormSection title='English' className='space-y-3'>
                <Input
                  placeholder='English title'
                  value={editorState.titleEn}
                  onChange={(event) =>
                    setEditorState((prev) => ({ ...prev, titleEn: event.target.value }))
                  }
                />
                <Textarea
                  placeholder='English body'
                  rows={5}
                  value={editorState.bodyEn}
                  onChange={(event) =>
                    setEditorState((prev) => ({ ...prev, bodyEn: event.target.value }))
                  }
                />
              </FormSection>

              <FormSection title='Recent image add-ons' className='space-y-3'>
                <div className='grid gap-3 lg:grid-cols-2'>
                  <Input
                    placeholder='Add-on title'
                    value={addonForm.title}
                    onChange={(event) =>
                      setAddonForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                  <Input
                    placeholder='Source URL'
                    value={addonForm.sourceUrl}
                    onChange={(event) =>
                      setAddonForm((prev) => ({ ...prev, sourceUrl: event.target.value }))
                    }
                  />
                  <Input
                    placeholder='CSS selector (optional)'
                    value={addonForm.selector}
                    onChange={(event) =>
                      setAddonForm((prev) => ({ ...prev, selector: event.target.value }))
                    }
                  />
                  <Input
                    type='number'
                    min={0}
                    placeholder='Wait (ms)'
                    value={addonForm.waitForMs}
                    onChange={(event) =>
                      setAddonForm((prev) => ({ ...prev, waitForMs: event.target.value }))
                    }
                  />
                </div>
                <Textarea
                  placeholder='Describe the visual (optional, helps Brain)'
                  rows={2}
                  value={addonForm.description}
                  onChange={(event) =>
                    setAddonForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleCreateAddon}
                    disabled={
                      createAddonMutation.isPending ||
                      !addonForm.title.trim() ||
                      !addonForm.sourceUrl.trim()
                    }
                  >
                    {createAddonMutation.isPending ? 'Capturing...' : 'Capture with Playwright'}
                  </Button>
                  <div className='text-xs text-muted-foreground'>
                    Captures a screenshot of the URL. Use a selector to focus on a specific section.
                  </div>
                </div>
                {addonsQuery.isLoading ? (
                  <div className='text-xs text-muted-foreground'>Loading add-ons...</div>
                ) : recentAddons.length === 0 ? (
                  <div className='text-xs text-muted-foreground'>No image add-ons yet.</div>
                ) : (
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {recentAddons.map((addon) => {
                      const preview = resolveImagePreview(addon.imageAsset);
                      const isSelected = selectedAddonSet.has(addon.id);
                      return (
                        <div
                          key={addon.id}
                          className='rounded-xl border border-border/60 bg-background/40 p-2'
                        >
                          {preview ? (
                            <div className='overflow-hidden rounded-lg border border-border/50'>
                              <img
                                src={preview}
                                alt={addon.title || 'Kangur social add-on'}
                                className='h-32 w-full object-cover'
                                loading='lazy'
                              />
                            </div>
                          ) : (
                            <div className='flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground'>
                              Preview unavailable
                            </div>
                          )}
                          <div className='mt-2 flex items-start justify-between gap-2 text-xs text-muted-foreground'>
                            <div className='min-w-0 space-y-1'>
                              <div className='font-semibold text-foreground'>
                                {addon.title || 'Untitled add-on'}
                              </div>
                              {addon.description ? (
                                <div className='text-muted-foreground'>{addon.description}</div>
                              ) : null}
                              {addon.sourceUrl ? (
                                <a
                                  href={addon.sourceUrl}
                                  target='_blank'
                                  rel='noreferrer'
                                  className='text-[11px] text-muted-foreground underline'
                                >
                                  Source
                                </a>
                              ) : null}
                            </div>
                            <Button
                              type='button'
                              size='xs'
                              variant={isSelected ? 'ghost' : 'outline'}
                              onClick={() =>
                                isSelected ? handleRemoveAddon(addon.id) : handleSelectAddon(addon)
                              }
                            >
                              {isSelected ? 'Added' : 'Add'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </FormSection>

              <FormSection title='Images' className='space-y-3'>
                {imageAssets.length === 0 ? (
                  <div className='text-xs text-muted-foreground'>
                    No images selected yet.
                  </div>
                ) : (
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {imageAssets.map((asset) => {
                      const preview = resolveImagePreview(asset);
                      return (
                        <div
                          key={asset.id}
                          className='rounded-xl border border-border/60 bg-background/40 p-2'
                        >
                          {preview ? (
                            <div className='overflow-hidden rounded-lg border border-border/50'>
                              <img
                                src={preview}
                                alt={asset.filename ?? asset.id ?? 'Kangur social image'}
                                className='h-32 w-full object-cover'
                                loading='lazy'
                              />
                            </div>
                          ) : (
                            <div className='flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground'>
                              Preview unavailable
                            </div>
                          )}
                          <div className='mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground'>
                            <span className='truncate'>
                              {asset.filename ?? asset.filepath ?? asset.id}
                            </span>
                            <Button
                              type='button'
                              size='xs'
                              variant='ghost'
                              onClick={() => handleRemoveImage(asset.id)}
                              aria-label='Remove image'
                              title='Remove image'
                            >
                              <Trash2 className='h-3 w-3' />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setShowMediaLibrary(true)}
                  className='inline-flex items-center gap-2'
                >
                  <ImagePlus className='h-4 w-4' />
                  Add images
                </Button>
                <MediaLibraryPanel
                  open={showMediaLibrary}
                  onOpenChange={setShowMediaLibrary}
                  selectionMode='multiple'
                  onSelect={handleAddImages}
                  title='Select Kangur social images'
                />
              </FormSection>

              <FormSection title='LinkedIn connection' className='space-y-3'>
              <SelectSimple
                value={linkedinConnectionId ?? undefined}
                onValueChange={handleLinkedInConnectionChange}
                options={linkedInOptions}
                placeholder={
                  linkedinIntegration
                    ? 'Select LinkedIn connection'
                      : 'Create LinkedIn integration first'
                  }
                  disabled={!linkedinIntegration || linkedInOptions.length === 0}
                  size='sm'
                  ariaLabel='LinkedIn connection'
                  title='LinkedIn connection'
                />
                {!linkedinIntegration ? (
                  <div className='text-xs text-muted-foreground'>
                    Create the LinkedIn integration in Admin &gt; Integrations to enable publishing.
                  </div>
                ) : linkedInOptions.length === 0 ? (
                  <div className='text-xs text-muted-foreground'>
                    Add a LinkedIn connection in Admin &gt; Integrations to select it here.
                  </div>
                ) : selectedLinkedInConnection && !selectedLinkedInConnection.hasLinkedInAccessToken ? (
                  <div className='text-xs text-red-500'>
                    Selected connection is not authorized. Reconnect in Admin &gt; Integrations.
                  </div>
                ) : linkedInExpiryStatus === 'expired' ? (
                  <div className='text-xs text-red-500'>
                    LinkedIn token expired{linkedInExpiryLabel ? ` on ${linkedInExpiryLabel}` : ''}.
                  </div>
                ) : linkedInExpiryStatus === 'warning' ? (
                  <div className='text-xs text-amber-500'>
                    LinkedIn token expires in {linkedInDaysRemaining} day
                    {linkedInDaysRemaining === 1 ? '' : 's'}
                    {linkedInExpiryLabel ? ` (${linkedInExpiryLabel})` : ''}.
                  </div>
                ) : null}
              </FormSection>

              <FormSection title='Scheduling' className='space-y-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  <CalendarClock className='h-4 w-4 text-muted-foreground' />
                  <Input
                    type='datetime-local'
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </div>
              </FormSection>

              <FormSection title='Documentation references' className='space-y-3'>
                <Input
                  placeholder='e.g. overview, settings-and-narration'
                  value={docReferenceInput}
                  onChange={(event) => setDocReferenceInput(event.target.value)}
                />
                <Textarea
                  placeholder='Notes for the Brain generator'
                  rows={3}
                  value={generationNotes}
                  onChange={(event) => setGenerationNotes(event.target.value)}
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleGenerate}
                  disabled={!activePost}
                  className='inline-flex items-center gap-2'
                >
                  <Sparkles className='h-4 w-4' />
                  Generate PL/EN draft
                </Button>
                <div className='space-y-2 rounded-xl border border-border/60 bg-background/40 p-3'>
                  <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                    Docs used
                  </div>
                  {docsUsed.length > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                      {docsUsed.map((doc) => (
                        <Badge key={doc} variant='outline'>
                          {doc}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className='text-xs text-muted-foreground'>
                      No documentation references selected yet.
                    </div>
                  )}
                  {activePost?.generatedSummary ? (
                    <Textarea
                      value={activePost.generatedSummary}
                      rows={4}
                      readOnly
                      className='text-xs'
                    />
                  ) : (
                    <div className='text-xs text-muted-foreground'>
                      Generate a draft to preview the documentation summary.
                    </div>
                  )}
                </div>
              </FormSection>

              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => handleSave('draft')}
                  disabled={!activePost}
                >
                  Save draft
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => handleSave('scheduled')}
                  disabled={!activePost || !scheduledAt}
                >
                  Schedule
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handlePublish}
                  disabled={!activePost}
                >
                  Publish to LinkedIn
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </KangurAdminContentShell>
  );
}
