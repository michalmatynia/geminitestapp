'use client';

import React from 'react';

import { DocumentWysiwygEditor } from '@/shared/lib/document-editor/public';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignContentGroup,
  FilemakerEmailCampaignContentGroupRegistry,
  FilemakerEmailCampaignContentVariant,
} from '@/shared/contracts/filemaker';
import { Badge, Button, Checkbox, Input, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, useToast } from '@/shared/ui/primitives.public';
import { FormField, FormSection, MultiSelect, SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { EmailLayerPanel } from '../components/email-builder/EmailLayerPanel';
import { EmailBlockPicker } from '../components/email-builder/EmailBlockPicker';
import { EmailBlockSettingsPanel } from '../components/email-builder/EmailBlockSettingsPanel';
import { compileBlocksToHtml, compileBlocksToPlainText } from '../components/email-builder/compile-blocks';
import { normalizeEmailBlocks, type EmailBlock } from '../components/email-builder/block-model';
import {
  createFilemakerEmailCampaignContentGroup,
  createFilemakerEmailCampaignContentGroupFromCampaign,
  createFilemakerEmailCampaignContentVariant,
  createCampaignContentVariantId,
  resolveFilemakerCampaignContentForRecipient,
  resolveFilemakerEmailCampaignDefaultContentVariant,
} from '../settings';

import { AudienceSourceSection } from './campaign-edit-sections/AudienceSourceSection';
export { DeliveryGovernanceSection } from './campaign-edit-sections/DeliveryGovernanceSection';
export {
  CampaignAnalyticsSection,
  RecentRunsSection,
} from './campaign-edit-sections/CampaignInsightsSections';
import {
  CAMPAIGN_STATUS_OPTIONS,
  EMAIL_STATUS_OPTIONS,
  formatCommaSeparatedValues,
  parseCommaSeparatedValues,
  LAUNCH_MODE_OPTIONS,
  RECURRING_FREQUENCY_OPTIONS,
  WEEKDAY_OPTIONS,
} from './AdminFilemakerCampaignEditPage.utils';

import { useCampaignEditContext } from './AdminFilemakerCampaignEditPage.context';

/* eslint-disable
   @typescript-eslint/consistent-type-assertions,
   @typescript-eslint/explicit-function-return-type,
   @typescript-eslint/strict-boolean-expressions,
   complexity,
   eqeqeq,
   max-lines,
   max-lines-per-function,
   no-nested-ternary
 */

type CampaignDraftSetter = React.Dispatch<React.SetStateAction<FilemakerEmailCampaign>>;

const SHARED_DELIVERY_OPTION_VALUE = '__shared__';

const defaultRecurringRule = () => ({
  frequency: 'weekly' as const,
  interval: 1,
  weekdays: [1, 2, 3, 4, 5],
  hourStart: null,
  hourEnd: null,
});

const updateCampaignDraft = (
  setDraft: CampaignDraftSetter,
  update: (draft: FilemakerEmailCampaign) => FilemakerEmailCampaign
): void => {
  setDraft((current) => update(current));
};

const DIRECT_CAMPAIGN_CONTENT_VALUE = '__direct_campaign_content__';

const upsertContentGroup = (
  registry: FilemakerEmailCampaignContentGroupRegistry,
  group: FilemakerEmailCampaignContentGroup
): FilemakerEmailCampaignContentGroupRegistry => ({
  version: registry.version,
  groups: registry.groups
    .filter((entry) => entry.id !== group.id)
    .concat(group)
    .sort((left, right) => left.name.localeCompare(right.name)),
});

const replaceGroupVariant = (
  group: FilemakerEmailCampaignContentGroup,
  variant: FilemakerEmailCampaignContentVariant
): FilemakerEmailCampaignContentGroup =>
  createFilemakerEmailCampaignContentGroup({
    ...group,
    variants: group.variants.map((entry) => (entry.id === variant.id ? variant : entry)),
    defaultLanguageCode:
      group.defaultVariantId === variant.id ? variant.languageCode : group.defaultLanguageCode,
  });

const removeGroupVariant = (
  group: FilemakerEmailCampaignContentGroup,
  variantId: string
): FilemakerEmailCampaignContentGroup => {
  const variants = group.variants.filter((variant) => variant.id !== variantId);
  const defaultVariantId =
    group.defaultVariantId === variantId
      ? variants.find((variant) => variant.languageCode === group.defaultLanguageCode)?.id ??
        variants[0]?.id ??
        null
      : group.defaultVariantId;
  const defaultLanguageCode =
    variants.find((variant) => variant.id === defaultVariantId)?.languageCode ??
    group.defaultLanguageCode;
  return createFilemakerEmailCampaignContentGroup({
    ...group,
    defaultVariantId,
    defaultLanguageCode,
    variants,
  });
};

const resolveSelectedVariant = (
  group: FilemakerEmailCampaignContentGroup | null,
  selectedVariantId: string | null
): FilemakerEmailCampaignContentVariant | null => {
  if (!group) return null;
  return (
    group.variants.find((variant) => variant.id === selectedVariantId) ??
    resolveFilemakerEmailCampaignDefaultContentVariant({
      campaign: {
        contentGroupId: group.id,
        defaultContentVariantId: group.defaultVariantId,
      } as FilemakerEmailCampaign,
      group,
    }) ??
    null
  );
};

export function CampaignDetailsSection(): React.JSX.Element {
  const { draft, setDraft, mailAccountOptions, selectedMailAccount } = useCampaignEditContext();
  const mailAccountId = draft.mailAccountId ?? '';
  
  const selectedMailAccountSummary = selectedMailAccount !== null
    ? `${selectedMailAccount.name} <${selectedMailAccount.emailAddress}>`
    : null;
  const isMissingMailAccount = mailAccountId.length > 0 && selectedMailAccount === null;
  const isMailAccountUnassigned = mailAccountId.length === 0;

  return (
    <FormSection title='Campaign Details' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField label='Campaign name'>
          <Input
            value={draft.name}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                name: event.target.value,
              }));
            }}
          />
        </FormField>
        <FormField label='Status'>
          <SelectSimple
            ariaLabel='Campaign status'
            value={draft.status}
            onValueChange={(value) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                status: value as FilemakerEmailCampaign['status'],
              }));
            }}
            options={CAMPAIGN_STATUS_OPTIONS}
          />
        </FormField>
        <FormField label='Subject'>
          <Input
            value={draft.subject}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                subject: event.target.value,
              }));
            }}
          />
        </FormField>
        <FormField label='Preview text'>
          <Input
            value={draft.previewText ?? ''}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                previewText: event.target.value || null,
              }));
            }}
          />
        </FormField>
        <FormField
          label='Sender email account'
          description={
            isMissingMailAccount
              ? `This campaign references a missing mail account (${draft.mailAccountId}). Select a valid account before launch.`
              : selectedMailAccount !== null
              ? selectedMailAccount.status === 'active'
                ? `Campaign delivery uses ${selectedMailAccountSummary} for SMTP and sender defaults.`
                : `${selectedMailAccountSummary} is paused. Live sends will fail until this account is reactivated.`
              : 'Required. Select the mailbox that will send this campaign and receive replies.'
          }
        >
          <SelectSimple
            ariaLabel='Campaign mail account'
            value={draft.mailAccountId ?? SHARED_DELIVERY_OPTION_VALUE}
            onValueChange={(value) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                mailAccountId: value === SHARED_DELIVERY_OPTION_VALUE ? null : value,
              }));
            }}
            options={mailAccountOptions}
          />
        </FormField>
        {isMailAccountUnassigned ? (
          <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 md:col-span-2'>
            Assign an email account before sending tests or launching this campaign.
          </div>
        ) : null}
        <FormField
          label='From name override'
          description={
            selectedMailAccount !== null
              ? 'Optional. Leave blank to use the selected mail account default sender name.'
              : 'Optional. Override the campaign sender display name.'
          }
        >
          <Input
            aria-label='Campaign from name override'
            value={draft.fromName ?? ''}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                fromName: event.target.value || null,
              }));
            }}
          />
        </FormField>
        <FormField
          label='Reply-to override'
          description={
            selectedMailAccount !== null
              ? 'Optional. Leave blank to use the selected mail account reply-to address.'
              : 'Optional. Override the reply-to address used for campaign deliveries.'
          }
        >
          <Input
            aria-label='Campaign reply-to override'
            value={draft.replyToEmail ?? ''}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                replyToEmail: event.target.value || null,
              }));
            }}
          />
        </FormField>
      </div>
      <FormField label='Internal description'>
        <Textarea
          rows={3}
          value={draft.description ?? ''}
          onChange={(event) => {
            updateCampaignDraft(setDraft, (current) => ({
              ...current,
              description: event.target.value || null,
            }));
          }}
        />
      </FormField>
    </FormSection>
  );
}

export function ContentSection(): React.JSX.Element {
  const {
    draft,
    setDraft,
    database,
    preview,
    contentGroupRegistry,
    persistContentGroupRegistry,
    countries,
    countryOptions,
  } = useCampaignEditContext();
  const { toast } = useToast();
  const selectedPersistedGroup = React.useMemo(
    () => contentGroupRegistry.groups.find((group) => group.id === draft.contentGroupId) ?? null,
    [contentGroupRegistry.groups, draft.contentGroupId]
  );
  const [groupDraft, setGroupDraft] =
    React.useState<FilemakerEmailCampaignContentGroup | null>(selectedPersistedGroup);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(
    selectedPersistedGroup?.defaultVariantId ?? null
  );
  const [isSavingGroup, setIsSavingGroup] = React.useState(false);

  React.useEffect(() => {
    setGroupDraft(selectedPersistedGroup);
    setSelectedVariantId(
      selectedPersistedGroup?.defaultVariantId ?? selectedPersistedGroup?.variants[0]?.id ?? null
    );
  }, [selectedPersistedGroup]);

  const activeGroup = groupDraft;
  const activeVariant = React.useMemo(
    () => resolveSelectedVariant(activeGroup, selectedVariantId),
    [activeGroup, selectedVariantId]
  );
  const editingGroupContent = Boolean(activeGroup && activeVariant);
  const blocks = React.useMemo<EmailBlock[]>(
    () => normalizeEmailBlocks(editingGroupContent ? activeVariant?.bodyBlocks : draft.bodyBlocks),
    [activeVariant?.bodyBlocks, draft.bodyBlocks, editingGroupContent]
  );
  const activeBodyHtml = editingGroupContent ? activeVariant?.bodyHtml ?? null : draft.bodyHtml;
  const activeBodyText = editingGroupContent ? activeVariant?.bodyText ?? null : draft.bodyText;
  const initialMode: 'builder' | 'html' = blocks.length > 0 || !activeBodyHtml ? 'builder' : 'html';
  const [mode, setMode] = React.useState<'builder' | 'html'>(initialMode);
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null);
  const [showHtmlPreview, setShowHtmlPreview] = React.useState(false);

  const updateActiveGroupVariant = React.useCallback(
    (update: (variant: FilemakerEmailCampaignContentVariant) => FilemakerEmailCampaignContentVariant): void => {
      setGroupDraft((current) => {
        const currentVariant = resolveSelectedVariant(current, selectedVariantId);
        if (!current || !currentVariant) return current;
        return replaceGroupVariant(current, update(currentVariant));
      });
    },
    [selectedVariantId]
  );

  const handleBlocksChange = React.useCallback(
    (next: EmailBlock[]): void => {
      const compiledHtml = next.length > 0 ? compileBlocksToHtml(next) : null;
      if (editingGroupContent) {
        updateActiveGroupVariant((variant) =>
          createFilemakerEmailCampaignContentVariant({
            ...variant,
            bodyBlocks: next.length > 0 ? next : null,
            bodyHtml: compiledHtml,
          })
        );
        return;
      }
      updateCampaignDraft(setDraft, (current) => ({
        ...current,
        bodyBlocks: next.length > 0 ? next : null,
        bodyHtml: compiledHtml,
      }));
    },
    [editingGroupContent, setDraft, updateActiveGroupVariant]
  );

  const previewHtml = React.useMemo(
    () => (blocks.length > 0 ? compileBlocksToHtml(blocks) : ''),
    [blocks]
  );
  const contentGroupOptions = React.useMemo(() => {
    const options = contentGroupRegistry.groups.map((group) => ({
      value: group.id,
      label: group.name,
    }));
    return [
      { value: DIRECT_CAMPAIGN_CONTENT_VALUE, label: 'Direct campaign content' },
      ...options,
    ];
  }, [contentGroupRegistry.groups]);
  const variantOptions = React.useMemo(
    () =>
      (activeGroup?.variants ?? []).map((variant) => ({
        value: variant.id,
        label: `${variant.label} (${variant.languageCode})`,
      })),
    [activeGroup?.variants]
  );
  const routingSummary = React.useMemo(() => {
    if (!activeGroup) return [];
    const registry = upsertContentGroup(contentGroupRegistry, activeGroup);
    const counts = new Map<
      string,
      { label: string; count: number; fallbackCount: number; countryNames: Set<string> }
    >();
    preview.recipients.forEach((recipient) => {
      const content = resolveFilemakerCampaignContentForRecipient({
        campaign: draft,
        contentGroupRegistry: registry,
        database,
        partyKind: recipient.partyKind,
        partyId: recipient.partyId,
        countries,
      });
      const key = content.contentVariantId ?? 'direct';
      const label = content.languageCode ?? content.reason;
      const entry =
        counts.get(key) ?? {
          label,
          count: 0,
          fallbackCount: 0,
          countryNames: new Set<string>(),
        };
      entry.count += 1;
      if (content.usedFallbackContent) entry.fallbackCount += 1;
      if (content.resolvedCountryName) entry.countryNames.add(content.resolvedCountryName);
      counts.set(key, entry);
    });
    return Array.from(counts.values()).sort((left, right) => right.count - left.count);
  }, [activeGroup, contentGroupRegistry, countries, database, draft, preview.recipients]);

  const handleCreateContentGroup = React.useCallback(async (): Promise<void> => {
    const group = createFilemakerEmailCampaignContentGroupFromCampaign({
      campaign: draft,
      languageCode: 'en',
    });
    const registry = upsertContentGroup(contentGroupRegistry, group);
    setIsSavingGroup(true);
    try {
      await persistContentGroupRegistry(registry);
      setGroupDraft(group);
      setSelectedVariantId(group.defaultVariantId);
      updateCampaignDraft(setDraft, (current) => ({
        ...current,
        contentGroupId: group.id,
        defaultContentVariantId: group.defaultVariantId,
      }));
      toast('Email content group created.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to create email content group.', {
        variant: 'error',
      });
    } finally {
      setIsSavingGroup(false);
    }
  }, [contentGroupRegistry, draft, persistContentGroupRegistry, setDraft, toast]);

  const handleSaveGroup = React.useCallback(async (): Promise<void> => {
    if (!activeGroup) return;
    const normalizedGroup = createFilemakerEmailCampaignContentGroup({
      ...activeGroup,
      updatedAt: new Date().toISOString(),
    });
    const registry = upsertContentGroup(contentGroupRegistry, normalizedGroup);
    setIsSavingGroup(true);
    try {
      await persistContentGroupRegistry(registry);
      setGroupDraft(normalizedGroup);
      updateCampaignDraft(setDraft, (current) => ({
        ...current,
        contentGroupId: normalizedGroup.id,
        defaultContentVariantId: normalizedGroup.defaultVariantId,
      }));
      toast('Email content group saved.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save email content group.', {
        variant: 'error',
      });
    } finally {
      setIsSavingGroup(false);
    }
  }, [activeGroup, contentGroupRegistry, persistContentGroupRegistry, setDraft, toast]);

  return (
    <FormSection title='Campaign Content' className='space-y-4 p-4'>
      <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Email group'>
            <SelectSimple
              ariaLabel='Email content group'
              value={draft.contentGroupId ?? DIRECT_CAMPAIGN_CONTENT_VALUE}
              onValueChange={(value) => {
                const group =
                  value === DIRECT_CAMPAIGN_CONTENT_VALUE
                    ? null
                    : contentGroupRegistry.groups.find((entry) => entry.id === value) ?? null;
                setGroupDraft(group);
                setSelectedVariantId(group?.defaultVariantId ?? group?.variants[0]?.id ?? null);
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  contentGroupId: group?.id ?? null,
                  defaultContentVariantId: group?.defaultVariantId ?? null,
                  translatedSendingEnabled: group ? current.translatedSendingEnabled : false,
                }));
              }}
              options={contentGroupOptions}
            />
          </FormField>
          <FormField label='Active language variant'>
            <SelectSimple
              ariaLabel='Active email language variant'
              value={activeVariant?.id ?? ''}
              onValueChange={setSelectedVariantId}
              options={variantOptions}
              disabled={!activeGroup || variantOptions.length === 0}
            />
          </FormField>
          <FormField label='Translated sending'>
            <div className='flex min-h-10 items-center gap-2 rounded-md border border-border/60 px-3'>
              <Checkbox
                aria-label='Send translated emails by organiser country'
                checked={draft.translatedSendingEnabled}
                disabled={!activeGroup}
                onCheckedChange={(checked) => {
                  updateCampaignDraft(setDraft, (current) => ({
                    ...current,
                    translatedSendingEnabled: checked === true,
                  }));
                }}
              />
              <span className='text-sm'>Route by organiser country</span>
            </div>
          </FormField>
          <FormField label='Default language'>
            <SelectSimple
              ariaLabel='Default email language'
              value={activeGroup?.defaultVariantId ?? ''}
              disabled={!activeGroup || variantOptions.length === 0}
              onValueChange={(value) => {
                setGroupDraft((current) => {
                  const variant = current?.variants.find((entry) => entry.id === value);
                  if (!current || !variant) return current;
                  return createFilemakerEmailCampaignContentGroup({
                    ...current,
                    defaultVariantId: variant.id,
                    defaultLanguageCode: variant.languageCode,
                  });
                });
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  defaultContentVariantId: value,
                }));
              }}
              options={variantOptions}
            />
          </FormField>
        </div>
        <div className='flex flex-wrap items-end justify-start gap-2 lg:justify-end'>
          <Button
            type='button'
            variant='outline'
            disabled={isSavingGroup}
            onClick={() => {
              void handleCreateContentGroup();
            }}
          >
            Create Group From Campaign
          </Button>
          <Button
            type='button'
            disabled={!activeGroup || isSavingGroup}
            onClick={() => {
              void handleSaveGroup();
            }}
          >
            {isSavingGroup ? 'Saving Group...' : 'Save Email Group'}
          </Button>
        </div>
      </div>
      {activeGroup ? (
        <div className='space-y-4 rounded-md border border-border/60 p-3'>
          <div className='grid gap-3 md:grid-cols-2'>
            <FormField label='Group name'>
              <Input
                value={activeGroup.name}
                onChange={(event) => {
                  setGroupDraft((current) =>
                    current
                      ? createFilemakerEmailCampaignContentGroup({
                          ...current,
                          name: event.target.value,
                        })
                      : current
                  );
                }}
              />
            </FormField>
            <FormField label='Group description'>
              <Input
                value={activeGroup.description ?? ''}
                onChange={(event) => {
                  setGroupDraft((current) =>
                    current
                      ? createFilemakerEmailCampaignContentGroup({
                          ...current,
                          description: event.target.value || null,
                        })
                      : current
                  );
                }}
              />
            </FormField>
          </div>
          <div className='flex flex-wrap gap-2'>
            {activeGroup.variants.map((variant) => (
              <Button
                key={variant.id}
                type='button'
                variant={variant.id === activeVariant?.id ? 'default' : 'outline'}
                size='sm'
                onClick={() => {
                  setSelectedVariantId(variant.id);
                }}
              >
                {variant.label || variant.languageCode}
              </Button>
            ))}
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                setGroupDraft((current) => {
                  if (!current) return current;
                  const languageCode = `lang-${current.variants.length + 1}`;
                  const variant = createFilemakerEmailCampaignContentVariant({
                    id: createCampaignContentVariantId({
                      groupId: current.id,
                      languageCode,
                      label: `Language ${current.variants.length + 1}`,
                    }),
                    groupId: current.id,
                    languageCode,
                    label: `Language ${current.variants.length + 1}`,
                    subject: draft.subject,
                    bodyHtml: draft.bodyHtml,
                    bodyText: draft.bodyText,
                    bodyBlocks: draft.bodyBlocks,
                  });
                  setSelectedVariantId(variant.id);
                  return createFilemakerEmailCampaignContentGroup({
                    ...current,
                    variants: current.variants.concat(variant),
                  });
                });
              }}
            >
              Add Language
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!activeVariant || activeGroup.variants.length <= 1}
              onClick={() => {
                if (!activeVariant) return;
                setGroupDraft((current) =>
                  current ? removeGroupVariant(current, activeVariant.id) : current
                );
              }}
            >
              Remove Language
            </Button>
          </div>
          {activeVariant ? (
            <div className='grid gap-3 md:grid-cols-2'>
              <FormField label='Language code'>
                <Input
                  value={activeVariant.languageCode}
                  onChange={(event) => {
                    updateActiveGroupVariant((variant) =>
                      createFilemakerEmailCampaignContentVariant({
                        ...variant,
                        languageCode: event.target.value,
                      })
                    );
                  }}
                />
              </FormField>
              <FormField label='Variant label'>
                <Input
                  value={activeVariant.label}
                  onChange={(event) => {
                    updateActiveGroupVariant((variant) =>
                      createFilemakerEmailCampaignContentVariant({
                        ...variant,
                        label: event.target.value,
                      })
                    );
                  }}
                />
              </FormField>
              <FormField label='Variant subject'>
                <Input
                  value={activeVariant.subject}
                  onChange={(event) => {
                    updateActiveGroupVariant((variant) =>
                      createFilemakerEmailCampaignContentVariant({
                        ...variant,
                        subject: event.target.value,
                      })
                    );
                  }}
                />
              </FormField>
              <FormField label='Variant preview text'>
                <Input
                  value={activeVariant.previewText ?? ''}
                  onChange={(event) => {
                    updateActiveGroupVariant((variant) =>
                      createFilemakerEmailCampaignContentVariant({
                        ...variant,
                        previewText: event.target.value || null,
                      })
                    );
                  }}
                />
              </FormField>
              <div className='md:col-span-2'>
                <MultiSelect
                  label='Directed countries'
                  ariaLabel='Directed countries'
                  options={countryOptions}
                  selected={activeVariant.countryIds}
                  onChange={(values) => {
                    updateActiveGroupVariant((variant) =>
                      createFilemakerEmailCampaignContentVariant({
                        ...variant,
                        countryIds: values,
                      })
                    );
                  }}
                  placeholder='Select countries'
                  searchPlaceholder='Search countries...'
                />
              </div>
            </div>
          ) : null}
          {routingSummary.length > 0 ? (
            <div className='flex flex-wrap gap-2 text-[10px]'>
              {routingSummary.map((row) => (
                <Badge key={row.label} variant='outline'>
                  {row.label}: {row.count}
                  {row.fallbackCount > 0 ? ` (${row.fallbackCount} fallback)` : ''}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <Tabs
        value={mode}
        onValueChange={(value: string): void => {
          setMode(value === 'html' ? 'html' : 'builder');
        }}
      >
        <TabsList>
          <TabsTrigger value='builder'>Builder</TabsTrigger>
          <TabsTrigger value='html'>Raw HTML</TabsTrigger>
        </TabsList>
        <TabsContent value='builder' className='space-y-4'>
          {blocks.length === 0 && activeBodyHtml ? (
            <div className='rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200'>
              This campaign has raw HTML that was not authored with the builder. Adding blocks
              will overwrite the current HTML on save.
            </div>
          ) : null}
          <EmailBlockPicker
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onChange={handleBlocksChange}
            onSelectBlock={setSelectedBlockId}
          />
          <div className='grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_320px]'>
            <EmailLayerPanel
              blocks={blocks}
              onChange={handleBlocksChange}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              className='rounded-md border border-border/60 bg-card/20 p-2'
            />
            <div className='rounded-md border border-border/60 bg-card/20 p-2'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                Preview
              </div>
              {previewHtml ? (
                <iframe
                  title='Email preview'
                  srcDoc={previewHtml}
                  className='h-[640px] w-full rounded border border-border/40 bg-white'
                />
              ) : (
                <div className='flex h-[640px] items-center justify-center rounded border border-dashed border-border/40 text-xs text-gray-500'>
                  Add a section to start your email.
                </div>
              )}
            </div>
            <EmailBlockSettingsPanel
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onChange={handleBlocksChange}
              onSelectBlock={setSelectedBlockId}
            />
          </div>
        </TabsContent>
        <TabsContent value='html' className='space-y-4'>
          {blocks.length > 0 ? (
            <div className='rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200'>
              Editing raw HTML while builder blocks exist will not affect the blocks. The
              builder remains the source of truth and will recompile HTML on save.
            </div>
          ) : null}
          <div className='flex items-center justify-end'>
            <Button
              type='button'
              size='sm'
              variant={showHtmlPreview ? 'default' : 'outline'}
              onClick={(): void => { setShowHtmlPreview((prev) => !prev); }}
            >
              {showHtmlPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>
          <div className={showHtmlPreview ? 'grid gap-4 lg:grid-cols-2' : undefined}>
            <DocumentWysiwygEditor
              engineInstance='filemaker_email'
              showBrand
              value={activeBodyHtml ?? ''}
              onChange={(value) => {
                if (editingGroupContent) {
                  updateActiveGroupVariant((variant) =>
                    createFilemakerEmailCampaignContentVariant({
                      ...variant,
                      bodyHtml: value || null,
                    })
                  );
                  return;
                }
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  bodyHtml: value || null,
                }));
              }}
              placeholder='Write your campaign email...'
            />
            {showHtmlPreview ? (
              <div className='rounded-md border border-border/60 bg-card/20 p-2'>
                <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                  Preview
                </div>
                {activeBodyHtml ? (
                  <iframe
                    title='HTML email preview'
                    srcDoc={activeBodyHtml}
                    className='h-[640px] w-full rounded border border-border/40 bg-white'
                  />
                ) : (
                  <div className='flex h-[640px] items-center justify-center rounded border border-dashed border-border/40 text-xs text-gray-500'>
                    Add HTML content to see a preview.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
      <FormField
        label='Campaign plain-text override'
        description={
          blocks.length > 0
            ? 'Optional. Leave blank to derive plain text from the builder blocks during delivery.'
            : 'Optional. Leave blank to derive plain text from the HTML body during delivery.'
        }
      >
        <Textarea
          rows={4}
          aria-label='Campaign plain-text override'
          value={activeBodyText ?? ''}
          onChange={(event) => {
            if (editingGroupContent) {
              updateActiveGroupVariant((variant) =>
                createFilemakerEmailCampaignContentVariant({
                  ...variant,
                  bodyText: event.target.value || null,
                })
              );
              return;
            }
            updateCampaignDraft(setDraft, (current) => ({
              ...current,
              bodyText: event.target.value || null,
            }));
          }}
          placeholder={
            blocks.length > 0 ? compileBlocksToPlainText(blocks).slice(0, 200) : undefined
          }
        />
      </FormField>
    </FormSection>
  );
}

export function CampaignTestSendSection(): React.JSX.Element {
  const {
    testRecipientEmailDraft,
    setTestRecipientEmailDraft,
    handleSendTestEmail,
    isTestSendPending,
    selectedMailAccount,
  } = useCampaignEditContext();

  return (
    <FormSection title='Test Delivery' className='space-y-4 p-4'>
      <div className='space-y-2 text-sm text-gray-400'>
        <div>
          Send the current draft to a single inbox without creating a run. Unsaved subject and body
          changes are included.
        </div>
        <div>
          Tracking placeholders are rendered in preview-safe mode, so test clicks do not create
          campaign events or unsubscribe records.
        </div>
      </div>
      <div className='flex flex-wrap gap-2 text-[10px]'>
        <Badge variant='outline'>
          Sender route:{' '}
          {selectedMailAccount !== null
            ? `${selectedMailAccount.name} <${selectedMailAccount.emailAddress}>`
            : 'No sender account assigned'}
        </Badge>
        <Badge variant='outline'>
          Reply-to default:{' '}
          {selectedMailAccount?.replyToEmail ?? 'Campaign override / selected account'}
        </Badge>
      </div>
      <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end'>
        <FormField
          label='Recipient email'
          description='Use a real inbox you control to verify rendering, sender identity, and plain-text output.'
        >
          <Input
            aria-label='Campaign test recipient email'
            value={testRecipientEmailDraft}
            onChange={(event) => {
              setTestRecipientEmailDraft(event.target.value);
            }}
          />
        </FormField>
        <Button
          type='button'
          className='md:mb-1'
          disabled={
            isTestSendPending ||
            testRecipientEmailDraft.trim().length === 0 ||
            selectedMailAccount === null
          }
          onClick={(): void => {
            void handleSendTestEmail();
          }}
        >
          {isTestSendPending ? 'Sending Test Email...' : 'Send Test Email'}
        </Button>
      </div>
    </FormSection>
  );
}

export function AudienceSection(): React.JSX.Element {
  const { draft, setDraft, organizationOptions, eventOptions, partyOptions } = useCampaignEditContext();

  const excludeManualIds = draft.audience.excludePartyReferences
    .filter((ref) => ref.kind === (draft.audience.partyKinds[0] ?? 'person'))
    .map((ref) => ref.id);

  return (
    <div className='space-y-4'>
      <AudienceSourceSection />
      <FormSection title='Audience Segments' className='space-y-4 p-4'>
        <div className='flex flex-wrap gap-2 text-[10px]'>
          <Badge variant='outline'>Organizations: {organizationOptions.length}</Badge>
          <Badge variant='outline'>Events: {eventOptions.length}</Badge>
          <Badge variant='outline'>Parties: {partyOptions.length}</Badge>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='md:col-span-2'>
            <MultiSelect
              label='Organizations'
              ariaLabel='Filter by organizations'
              options={organizationOptions}
              selected={draft.audience.organizationIds}
              onChange={(values) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: { ...current.audience, organizationIds: values },
                }));
              }}
              placeholder='All organizations (no filter)'
              searchPlaceholder='Search organizations...'
            />
          </div>
          <div className='md:col-span-2'>
            <MultiSelect
              label='Events'
              ariaLabel='Filter by events'
              options={eventOptions}
              selected={draft.audience.eventIds}
              onChange={(values) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: { ...current.audience, eventIds: values },
                }));
              }}
              placeholder='All events (no filter)'
              searchPlaceholder='Search events...'
            />
          </div>
          <div className='md:col-span-2'>
            <MultiSelect
              label='Email statuses'
              ariaLabel='Filter by email status'
              options={EMAIL_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              selected={draft.audience.emailStatuses}
              onChange={(values) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: { ...current.audience, emailStatuses: values as FilemakerEmailCampaign['audience']['emailStatuses'] },
                }));
              }}
              placeholder='All statuses (active + inactive + unverified)'
              searchPlaceholder='Search statuses...'
            />
          </div>
          <FormField label='Countries (comma-separated codes)'>
            <Input
              value={formatCommaSeparatedValues(draft.audience.countries)}
              onChange={(event) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: { ...current.audience, countries: parseCommaSeparatedValues(event.target.value) },
                }));
              }}
            />
          </FormField>
          <FormField label='Cities (comma-separated)'>
            <Input
              value={formatCommaSeparatedValues(draft.audience.cities)}
              onChange={(event) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: { ...current.audience, cities: parseCommaSeparatedValues(event.target.value) },
                }));
              }}
            />
          </FormField>
          <FormField
            label='Exclude party IDs (comma-separated)'
            description='Recipients in this list will be removed from the audience even if they otherwise qualify.'
          >
            <Input
              placeholder='e.g. 123, 456'
              value={formatCommaSeparatedValues(excludeManualIds)}
              onChange={(event) => {
                const ids = parseCommaSeparatedValues(event.target.value);
                const kind = draft.audience.partyKinds[0] ?? 'person';
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: {
                    ...current.audience,
                    excludePartyReferences: ids.map((id) => ({ id, kind })),
                  },
                }));
              }}
            />
          </FormField>
          <FormField label='Audience limit'>
            <Input
              type='number'
              value={draft.audience.limit == null ? '' : String(draft.audience.limit)}
              onChange={(event) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: {
                    ...current.audience,
                    limit:
                      event.target.value.trim() === ''
                        ? null
                        : Number.parseInt(event.target.value, 10) || null,
                  },
                }));
              }}
            />
          </FormField>
          <FormField
            label='Deduplicate by email'
            description='When enabled, each email address appears at most once in the audience even if it is linked to multiple records.'
          >
            <div className='flex min-h-10 items-center gap-2 rounded-md border border-border/60 px-3'>
              <Checkbox
                aria-label='Deduplicate audience by email address'
                checked={draft.audience.dedupeByEmail}
                onCheckedChange={(checked) => {
                  updateCampaignDraft(setDraft, (current) => ({
                    ...current,
                    audience: { ...current.audience, dedupeByEmail: checked === true },
                  }));
                }}
              />
              <span className='text-sm'>Dedupe by email</span>
            </div>
          </FormField>
        </div>
      </FormSection>
    </div>
  );
}

export function LaunchSection(): React.JSX.Element {
  const { draft, setDraft } = useCampaignEditContext();
  const isRecurring = draft.launch.mode === 'recurring';

  return (
    <FormSection title='Launch Rules' className='space-y-4 p-4'>
      {/* Mode + scheduling */}
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField label='Launch mode'>
          <SelectSimple
            ariaLabel='Launch mode'
            value={draft.launch.mode}
            onValueChange={(value) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  mode: value as FilemakerEmailCampaign['launch']['mode'],
                  recurring:
                    value === 'recurring'
                      ? current.launch.recurring ?? defaultRecurringRule()
                      : value === 'scheduled'
                        ? null
                        : current.launch.recurring,
                },
              }));
            }}
            options={LAUNCH_MODE_OPTIONS}
          />
        </FormField>
        <FormField label='Scheduled at'>
          <Input
            type='datetime-local'
            value={draft.launch.scheduledAt ?? ''}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: { ...current.launch, scheduledAt: event.target.value || null },
              }));
            }}
          />
        </FormField>
        <FormField label='Minimum audience size'>
          <Input
            type='number'
            value={String(draft.launch.minAudienceSize)}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  minAudienceSize: Number.parseInt(event.target.value, 10) || 0,
                },
              }));
            }}
          />
        </FormField>
        <FormField label='Timezone'>
          <Input
            value={draft.launch.timezone ?? ''}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: { ...current.launch, timezone: event.target.value || null },
              }));
            }}
          />
        </FormField>
      </div>

      {/* Approval + weekday guards */}
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField
          label='Require approval before launch'
          description='When enabled, a campaign must be explicitly approved before it can be dispatched.'
        >
          <div className='flex min-h-10 items-center gap-2 rounded-md border border-border/60 px-3'>
            <Checkbox
              aria-label='Require approval before launch'
              checked={draft.launch.requireApproval}
              onCheckedChange={(checked) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  launch: { ...current.launch, requireApproval: checked === true },
                }));
              }}
            />
            <span className='text-sm'>Require approval</span>
          </div>
        </FormField>
        <FormField
          label='Only weekdays'
          description='Restrict automated launches to Monday – Friday regardless of any other time windows.'
        >
          <div className='flex min-h-10 items-center gap-2 rounded-md border border-border/60 px-3'>
            <Checkbox
              aria-label='Only launch on weekdays'
              checked={draft.launch.onlyWeekdays}
              onCheckedChange={(checked) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  launch: { ...current.launch, onlyWeekdays: checked === true },
                }));
              }}
            />
            <span className='text-sm'>Weekdays only</span>
          </div>
        </FormField>
      </div>

      {/* Global delivery time window */}
      <div className='grid gap-4 md:grid-cols-4'>
        <FormField label='Allowed hour start'>
          <Input
            type='number'
            min={0}
            max={23}
            value={draft.launch.allowedHourStart == null ? '' : String(draft.launch.allowedHourStart)}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  allowedHourStart:
                    event.target.value.trim() === ''
                      ? null
                      : Number.parseInt(event.target.value, 10) || null,
                },
              }));
            }}
          />
        </FormField>
        <FormField label='Allowed hour end'>
          <Input
            type='number'
            min={0}
            max={23}
            value={draft.launch.allowedHourEnd == null ? '' : String(draft.launch.allowedHourEnd)}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  allowedHourEnd:
                    event.target.value.trim() === ''
                      ? null
                      : Number.parseInt(event.target.value, 10) || null,
                },
              }));
            }}
          />
        </FormField>
        <FormField label='Pause on bounce %'>
          <Input
            type='number'
            min={0}
            max={100}
            value={
              draft.launch.pauseOnBounceRatePercent == null
                ? ''
                : String(draft.launch.pauseOnBounceRatePercent)
            }
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  pauseOnBounceRatePercent:
                    event.target.value.trim() === ''
                      ? null
                      : Number.parseFloat(event.target.value) || null,
                },
              }));
            }}
          />
        </FormField>
      </div>

      {/* Recurring rule */}
      {isRecurring && (
        <div className='space-y-3 rounded-md border border-border/60 bg-card/20 p-3'>
          <div className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
            Recurring Schedule
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            <FormField label='Frequency'>
              <SelectSimple
                ariaLabel='Recurring frequency'
                value={draft.launch.recurring?.frequency ?? 'weekly'}
                onValueChange={(value) => {
                  updateCampaignDraft(setDraft, (current) => ({
                    ...current,
                    launch: {
                      ...current.launch,
                      recurring: {
                        ...(current.launch.recurring ?? defaultRecurringRule()),
                        frequency: value as 'daily' | 'weekly' | 'monthly',
                      },
                    },
                  }));
                }}
                options={RECURRING_FREQUENCY_OPTIONS}
              />
            </FormField>
            <FormField label='Interval' description='Run every N occurrences (e.g. every 2 weeks).'>
              <Input
                type='number'
                min={1}
                value={String(draft.launch.recurring?.interval ?? 1)}
                onChange={(event) => {
                  updateCampaignDraft(setDraft, (current) => ({
                    ...current,
                    launch: {
                      ...current.launch,
                      recurring: {
                        ...(current.launch.recurring ?? defaultRecurringRule()),
                        interval: Number.parseInt(event.target.value, 10) || 1,
                      },
                    },
                  }));
                }}
              />
            </FormField>
            <div className='md:col-span-2'>
              <MultiSelect
                label='Weekdays'
                ariaLabel='Recurring weekdays'
                options={WEEKDAY_OPTIONS}
                selected={(draft.launch.recurring?.weekdays ?? []).map(String)}
                onChange={(values) => {
                  updateCampaignDraft(setDraft, (current) => ({
                    ...current,
                    launch: {
                      ...current.launch,
                      recurring: {
                        ...(current.launch.recurring ?? defaultRecurringRule()),
                        weekdays: values
                          .map((v) => Number.parseInt(v, 10))
                          .filter((v) => v >= 0 && v <= 6),
                      },
                    },
                  }));
                }}
                placeholder='All weekdays'
                searchPlaceholder='Search days...'
              />
            </div>
            <FormField label='Recurring hour start' description='Start of the send window within each recurrence.'>
              <Input
                type='number'
                min={0}
                max={23}
                value={draft.launch.recurring?.hourStart == null ? '' : String(draft.launch.recurring.hourStart)}
                onChange={(event) => {
                  updateCampaignDraft(setDraft, (current) => ({
                    ...current,
                    launch: {
                      ...current.launch,
                      recurring: {
                        ...(current.launch.recurring ?? defaultRecurringRule()),
                        hourStart:
                          event.target.value.trim() === ''
                            ? null
                            : Number.parseInt(event.target.value, 10) || null,
                      },
                    },
                  }));
                }}
              />
            </FormField>
            <FormField label='Recurring hour end' description='End of the send window within each recurrence.'>
              <Input
                type='number'
                min={0}
                max={23}
                value={draft.launch.recurring?.hourEnd == null ? '' : String(draft.launch.recurring.hourEnd)}
                onChange={(event) => {
                  updateCampaignDraft(setDraft, (current) => ({
                    ...current,
                    launch: {
                      ...current.launch,
                      recurring: {
                        ...(current.launch.recurring ?? defaultRecurringRule()),
                        hourEnd:
                          event.target.value.trim() === ''
                            ? null
                            : Number.parseInt(event.target.value, 10) || null,
                      },
                    },
                  }));
                }}
              />
            </FormField>
          </div>
        </div>
      )}
    </FormSection>
  );
}

const CSV_HEADERS = ['email', 'name', 'partyKind', 'partyId', 'emailStatus', 'country', 'city', 'emailId'];

const escapeCsvCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
};

const buildAudienceCsv = (recipients: ReturnType<typeof useCampaignEditContext>['preview']['recipients']): string => {
  const rows = recipients.map((r) =>
    [r.email, r.partyName, r.partyKind, r.partyId, r.emailStatus, r.country, r.city, r.emailId]
      .map((v) => escapeCsvCell(String(v ?? '')))
      .join(',')
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n');
};

const downloadCsv = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export function AudiencePreviewSection(): React.JSX.Element {
  const { draft, preview, launchEvaluation } = useCampaignEditContext();

  const handleExport = React.useCallback((): void => {
    const csv = buildAudienceCsv(preview.recipients);
    const safeName = draft.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'campaign';
    downloadCsv(csv, `audience-${safeName}.csv`);
  }, [draft.name, preview.recipients]);

  return (
    <FormSection title='Audience Preview' className='space-y-4 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex flex-wrap gap-2 text-[10px]'>
          <Badge variant='outline'>Recipients: {preview.recipients.length}</Badge>
          <Badge variant='outline'>Excluded: {preview.excludedCount}</Badge>
          <Badge variant='outline'>Suppressed: {preview.suppressedCount}</Badge>
          <Badge variant='outline'>Deduped: {preview.dedupedCount}</Badge>
          <Badge variant='outline'>Linked emails: {preview.totalLinkedEmailCount}</Badge>
        </div>
        {preview.recipients.length > 0 ? (
          <Button type='button' variant='outline' size='sm' onClick={handleExport}>
            Export CSV ({preview.recipients.length})
          </Button>
        ) : null}
      </div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-300'>
        {launchEvaluation.isEligible ? (
          <span className='text-emerald-300'>Campaign is eligible for launch.</span>
        ) : (
          <div className='space-y-1'>
            <div className='text-amber-300'>Campaign is not launchable yet.</div>
            {launchEvaluation.blockers.map((blocker) => (
              <div key={blocker} className='text-xs text-gray-400'>
                {blocker}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className='space-y-2'>
        <div className='text-xs font-semibold text-gray-400'>Sample recipients</div>
        {preview.sampleRecipients.length === 0 ? (
          <div className='text-sm text-gray-500'>No recipients available for preview.</div>
        ) : (
          <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-3'>
            {preview.sampleRecipients.map((recipient) => (
              <div
                key={`${recipient.partyKind}-${recipient.partyId}-${recipient.emailId}`}
                className='rounded-md border border-border/60 bg-card/25 p-3 text-xs text-gray-300'
              >
                <div className='font-medium text-white'>{recipient.partyName}</div>
                <div>{recipient.email}</div>
                <div className='text-gray-500'>
                  {recipient.partyKind} • {recipient.country || 'No country'} •{' '}
                  {recipient.city || 'No city'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormSection>
  );
}
