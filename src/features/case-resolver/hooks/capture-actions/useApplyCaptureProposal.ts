'use client';

import { useState, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import type {
  CaseResolverCaptureProposalState,
  CaseResolverCaptureProposal,
} from '@/features/case-resolver-capture/proposals';
import { stripAcceptedCaptureContentFromTextWithReport } from '@/features/case-resolver-capture/proposals';
import { deriveDocumentContentSync, toStorageDocumentValue } from '@/features/document-editor';
import type { FilemakerDatabase } from '@/shared/contracts/filemaker';
import { FILEMAKER_DATABASE_KEY, normalizeFilemakerDatabase } from '@/features/filemaker/settings';
import type { CaseResolverFile, CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { useToast } from '@/shared/ui';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  applyCaseResolverFileMutationAndRebaseDraft,
  resolveCaptureTargetFile,
  type CaseResolverFileMutationStage,
} from '../useCaseResolverState.helpers';
import {
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
} from '../../workspace-persistence';
import {
  buildFileEditDraft,
  createCaseResolverHistorySnapshotEntry,
} from '@/features/case-resolver/utils/caseResolverUtils';
import { upsertFilemakerCaptureCandidate } from '@/features/case-resolver-capture/filemaker-upsert';
import { resolveCaptureMappingApplyGuardReason } from '../../capture-mapping-apply-guard';
import { type CaseResolverFileEditDraft, type CaseResolverStateValue } from '../../types';

const readCaptureApplyNowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const resolveCaptureApplyDurationMs = (startAtMs: number | null): number | null => {
  if (startAtMs === null) return null;
  const now = readCaptureApplyNowMs();
  return Math.round(now - startAtMs);
};

export function useApplyCaptureProposal(args: {
  workspaceRef: React.MutableRefObject<CaseResolverWorkspace>;
  filemakerDatabase: FilemakerDatabase;
  isPromptExploderPartyProposalOpen: boolean;
  setIsPromptExploderPartyProposalOpen: (val: boolean) => void;
  promptExploderPartyProposal: CaseResolverCaptureProposalState | null;
  setPromptExploderPartyProposal: (val: CaseResolverCaptureProposalState | null) => void;
  setIsApplyingPromptExploderPartyProposal: (val: boolean) => void;
  editingDocumentDraft: CaseResolverFileEditDraft | null;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  updateWorkspace: CaseResolverStateValue['updateWorkspace'];
  refetchSettingsStore: () => void;
  setEditorContentRevisionSeed: React.Dispatch<React.SetStateAction<number>>;
  promptExploderProposalDraft: CaseResolverCaptureProposalState | null;
  setPromptExploderProposalDraft: (val: CaseResolverCaptureProposalState | null) => void;
  captureMappingDismissedRef: React.MutableRefObject<boolean>;
}) {
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();
  const captureApplyInFlightRef = useRef(false);

  const [captureApplyDiagnostics, setCaptureApplyDiagnostics] = useState<{
    status: 'idle' | 'success' | 'failed';
    stage: 'precheck' | 'mutation' | 'rebase' | null;
    message: string;
    targetFileId: string | null;
    resolvedTargetFileId: string | null;
    workspaceRevision: number;
    attempts: number;
    at: string;
    cleanupDurationMs?: number | null;
    mutationDurationMs?: number | null;
    totalDurationMs?: number | null;
  } | null>(null);

  const handleApplyPromptExploderProposal = useCallback((): void => {
    const applyGuardReason = resolveCaptureMappingApplyGuardReason({
      modalOpen: args.isPromptExploderPartyProposalOpen,
      dismissed: args.captureMappingDismissedRef.current,
      hasDraft: Boolean(args.promptExploderProposalDraft),
      inFlight: captureApplyInFlightRef.current,
    });
    if (applyGuardReason) {
      if (applyGuardReason === 'modal_closed' || applyGuardReason === 'dismissed') {
        logCaseResolverWorkspaceEvent({
          source: 'capture_mapping_apply',
          action: 'capture_mapping_apply_blocked',
          message: JSON.stringify({
            reason: applyGuardReason,
            targetFileId: args.promptExploderProposalDraft?.targetFileId ?? null,
          }),
        });
      }
      return;
    }
    if (!args.promptExploderProposalDraft) {
      args.setIsPromptExploderPartyProposalOpen(false);
      return;
    }
    captureApplyInFlightRef.current = true;
    args.captureMappingDismissedRef.current = false;

    void (async (): Promise<void> => {
      args.setIsApplyingPromptExploderPartyProposal(true);
      try {
        const applyStartedAtMs = readCaptureApplyNowMs();
        let cleanupDurationMs: number | null = null;
        let mutationDurationMs: number | null = null;
        const requestedTargetFileId = args.promptExploderProposalDraft!.targetFileId;
        const workspaceSnapshot = args.workspaceRef.current;

        const targetResolution = resolveCaptureTargetFile({
          workspaceFiles: workspaceSnapshot.files,
          proposalTargetFileId: requestedTargetFileId,
          contextFileId: null,
          editingDraftFileId: null,
        });

        const resolvedTargetFile = targetResolution.file;
        if (!resolvedTargetFile) {
          const precheckRevision = getCaseResolverWorkspaceRevision(workspaceSnapshot);
          setCaptureApplyDiagnostics({
            status: 'failed',
            stage: 'precheck',
            message: 'Capture target is missing before mutation.',
            targetFileId: requestedTargetFileId,
            resolvedTargetFileId: null,
            workspaceRevision: precheckRevision,
            attempts: 1,
            at: new Date().toISOString(),
            cleanupDurationMs,
            mutationDurationMs,
            totalDurationMs: resolveCaptureApplyDurationMs(applyStartedAtMs),
          });
          logCaseResolverWorkspaceEvent({
            source: 'capture_mapping_apply',
            action: 'capture_target_missing_precheck',
            message: JSON.stringify({
              requestedTargetFileId,
              proposalTargetFileId: args.promptExploderProposalDraft!.targetFileId,
              editingDraftFileId: args.editingDocumentDraft?.id ?? null,
              activeFileId: workspaceSnapshot.activeFileId ?? null,
              workspaceRevision: precheckRevision,
            }),
          });
          toast('Capture mapping failed: target file missing (precheck).', {
            variant: 'warning',
          });
          return;
        }
        if (resolvedTargetFile.isLocked) {
          const workspaceRevision = getCaseResolverWorkspaceRevision(workspaceSnapshot);
          setCaptureApplyDiagnostics({
            status: 'failed',
            stage: 'precheck',
            message: 'Capture target is locked before mutation.',
            targetFileId: requestedTargetFileId,
            resolvedTargetFileId: resolvedTargetFile.id,
            workspaceRevision,
            attempts: 1,
            at: new Date().toISOString(),
            cleanupDurationMs,
            mutationDurationMs,
            totalDurationMs: resolveCaptureApplyDurationMs(applyStartedAtMs),
          });
          toast('Document is locked. Unlock it in Case Resolver before applying capture mapping.', {
            variant: 'warning',
          });
          return;
        }
        const targetFileId = resolvedTargetFile.id;
        let nextDatabase = args.filemakerDatabase;
        let shouldPersistFilemakerDatabase = false;
        let nextProposalState: CaseResolverCaptureProposalState = {
          targetFileId,
          addresser: args.promptExploderProposalDraft!.addresser
            ? ({
              ...args.promptExploderProposalDraft!.addresser,
              candidate: { ...args.promptExploderProposalDraft!.addresser.candidate },
              existingReference: args.promptExploderProposalDraft!.addresser.existingReference
                ? { ...(args.promptExploderPartyProposal?.addresser?.existingReference ?? null) }
                : null,
            } as CaseResolverCaptureProposal)
            : null,
          addressee: args.promptExploderProposalDraft!.addressee
            ? ({
              ...args.promptExploderProposalDraft!.addressee,
              candidate: { ...args.promptExploderProposalDraft!.addressee.candidate },
              existingReference: args.promptExploderProposalDraft!.addressee.existingReference
                ? { ...(args.promptExploderPartyProposal?.addressee?.existingReference ?? null) }
                : null,
            } as CaseResolverCaptureProposal)
            : null,
          documentDate: args.promptExploderProposalDraft!.documentDate
            ? {
              ...args.promptExploderProposalDraft!.documentDate,
            }
            : null,
        };
        const rolePatches: {
          addresser?: { kind: 'person' | 'organization'; id: string } | null;
          addressee?: { kind: 'person' | 'organization'; id: string } | null;
        } = {};
        const failedRoles: string[] = [];
        const acceptedRoles: string[] = [];

        const applyRole = (role: 'addresser' | 'addressee'): void => {
          const proposal = nextProposalState[role];
          if (!proposal) return;

          if (proposal.action === 'ignore' || proposal.action === 'keepText') {
            return;
          }

          const roleLabel = role === 'addresser' ? 'Addresser' : 'Addressee';
          const proposalSupportsMatchedReference =
            proposal.matchKind === 'party' || proposal.matchKind === 'party_and_address';

          if (proposal.action === 'useMatched') {
            if (!proposalSupportsMatchedReference) {
              failedRoles.push(`${roleLabel} (no matched Filemaker party reference)`);
              return;
            }
            rolePatches[role] = proposal.existingReference ?? null;
            acceptedRoles.push(roleLabel);
            return;
          }

          if (proposal.action !== 'createInFilemaker') {
            return;
          }

          const upsertResult = upsertFilemakerCaptureCandidate(nextDatabase, proposal.candidate);
          nextDatabase = upsertResult.database;
          if (upsertResult.createdAddress || upsertResult.createdParty) {
            shouldPersistFilemakerDatabase = true;
          }
          if (!upsertResult.reference) {
            failedRoles.push(`${roleLabel} (insufficient data to create Filemaker record)`);
            return;
          }

          rolePatches[role] = upsertResult.reference;
          acceptedRoles.push(roleLabel);
          const nextRoleProposal = nextProposalState[role];
          if (!nextRoleProposal) return;
          const nextMatchKind = upsertResult.addressId ? 'party_and_address' : 'party';
          nextProposalState = {
            ...nextProposalState,
            [role]: {
              ...nextRoleProposal,
              existingReference: upsertResult.reference,
              existingAddressId: upsertResult.addressId ?? nextRoleProposal.existingAddressId,
              matchKind: nextMatchKind,
              action: 'useMatched',
            },
          };
        };

        applyRole('addresser');
        applyRole('addressee');

        if (shouldPersistFilemakerDatabase) {
          try {
            await updateSetting.mutateAsync({
              key: FILEMAKER_DATABASE_KEY,
              value: JSON.stringify(normalizeFilemakerDatabase(nextDatabase)),
            });
            args.refetchSettingsStore();
          } catch (_error: unknown) {
            toast(
              _error instanceof Error
                ? _error.message
                : 'Failed to save Filemaker records for capture mapping.',
              { variant: 'error' }
            );
            return;
          }
        }

        const targetFile = resolvedTargetFile;
        const normalizeRolePatchReference = (
          reference: { kind: string; id: string } | null | undefined
        ): { kind: 'person' | 'organization'; id: string } | null => {
          if (!reference) return null;
          const normalizedId = reference.id.trim();
          if (!normalizedId) return null;
          return {
            kind: reference.kind as 'person' | 'organization',
            id: normalizedId,
          };
        };
        const areRolePatchReferencesEqual = (
          left: { kind: string; id: string } | null | undefined,
          right: { kind: string; id: string } | null | undefined
        ): boolean => {
          const normalizedLeft = normalizeRolePatchReference(left);
          const normalizedRight = normalizeRolePatchReference(right);
          if (!normalizedLeft && !normalizedRight) return true;
          if (!normalizedLeft || !normalizedRight) return false;
          return (
            normalizedLeft.kind === normalizedRight.kind && normalizedLeft.id === normalizedRight.id
          );
        };

        const acceptedAddresser = rolePatches.addresser !== undefined;
        const acceptedAddressee = rolePatches.addressee !== undefined;
        const nextAddresserReference = acceptedAddresser
          ? normalizeRolePatchReference(rolePatches.addresser ?? null)
          : null;
        const nextAddresseeReference = acceptedAddressee
          ? normalizeRolePatchReference(rolePatches.addressee ?? null)
          : null;
        let appliedAddresserReferencePatch = false;
        let appliedAddresseeReferencePatch = false;
        let appliedDocumentDatePatch = false;
        let appliedDocumentCityPatch = false;
        let appliedExplodedCleanupPatch = false;
        const normalizeDocumentDateIso = (value: unknown): string => {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const isoDate = (value as { isoDate?: unknown }).isoDate;
            return typeof isoDate === 'string' ? isoDate.trim() : '';
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
            if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
          }
          return '';
        };
        const normalizeDocumentCity = (value: unknown): string | null => {
          if (typeof value !== 'string') return null;
          const normalized = value.trim();
          return normalized.length > 0 ? normalized : null;
        };

        const dateProposal = nextProposalState.documentDate;
        const shouldAcceptDate =
          dateProposal?.action === 'useDetectedDate' && dateProposal.isoDate.trim().length > 0;
        const acceptedDateValue = shouldAcceptDate ? dateProposal.isoDate.trim() : null;
        const acceptedCityValue = shouldAcceptDate
          ? normalizeDocumentCity(dateProposal?.city ?? dateProposal?.cityHint ?? null)
          : null;
        const acceptedDocumentDateValue =
          acceptedDateValue && dateProposal
            ? {
              ...dateProposal,
              isoDate: acceptedDateValue,
              city: acceptedCityValue ?? dateProposal.city ?? dateProposal.cityHint ?? null,
            }
            : null;

        const cleanupProposalState: CaseResolverCaptureProposalState = {
          ...nextProposalState,
          addresser: acceptedAddresser
            ? nextProposalState.addresser
            : nextProposalState.addresser
              ? { ...nextProposalState.addresser, action: 'keepText' }
              : null,
          addressee: acceptedAddressee
            ? nextProposalState.addressee
            : nextProposalState.addressee
              ? { ...nextProposalState.addressee, action: 'keepText' }
              : null,
          documentDate: shouldAcceptDate
            ? nextProposalState.documentDate
            : nextProposalState.documentDate
              ? { ...nextProposalState.documentDate, action: 'keepText' }
              : null,
        };

        const draftForTargetFile =
          args.editingDocumentDraft?.id === targetFileId ? args.editingDocumentDraft : null;
        const sourceExplodedContent = (() => {
          if (draftForTargetFile) {
            const draftActiveContent =
              typeof draftForTargetFile.documentContent === 'string'
                ? draftForTargetFile.documentContent
                : '';
            const draftExplodedContent =
              typeof draftForTargetFile.explodedDocumentContent === 'string'
                ? draftForTargetFile.explodedDocumentContent
                : '';
            if (
              draftForTargetFile.activeDocumentVersion === 'exploded' &&
              draftActiveContent.trim().length > 0
            ) {
              return draftActiveContent;
            }
            if (draftExplodedContent.trim().length > 0) {
              return draftExplodedContent;
            }
          }
          if (targetFile.explodedDocumentContent?.trim().length) {
            return targetFile.explodedDocumentContent;
          }
          if (targetFile.activeDocumentVersion === 'exploded') {
            return targetFile.documentContent;
          }
          return '';
        })();
        const cleanupStartedAtMs = readCaptureApplyNowMs();
        const hasSourceExplodedContent = (sourceExplodedContent ?? '').trim().length > 0;
        const cleanupResult = hasSourceExplodedContent
          ? stripAcceptedCaptureContentFromTextWithReport(
            sourceExplodedContent ?? '',
            cleanupProposalState
          )
          : {
            text: sourceExplodedContent ?? '',
            report: {
              changed: false,
              sourceWasHtml: false,
              removedAddressLineCount: 0,
              removedAddresserLineCount: 0,
              removedAddresseeLineCount: 0,
              removedDateLineCount: 0,
            },
          };
        cleanupDurationMs = resolveCaptureApplyDurationMs(cleanupStartedAtMs);
        const cleanedExplodedContent = cleanupResult.text;
        const hasExplodedCleanup = cleanupResult.report.changed;

        const cleanedExplodedCanonical = hasExplodedCleanup
          ? deriveDocumentContentSync({
            mode: 'wysiwyg',
            value: cleanedExplodedContent ?? '',
            previousMarkdown:
                draftForTargetFile?.documentContentMarkdown ?? targetFile.documentContentMarkdown,
            previousHtml:
                draftForTargetFile?.documentContentHtml ?? targetFile.documentContentHtml,
          })
          : null;
        const cleanedExplodedStored = cleanedExplodedCanonical
          ? toStorageDocumentValue(cleanedExplodedCanonical)
          : null;

        const shouldAttemptPersistPatch =
          acceptedAddresser ||
          acceptedAddressee ||
          acceptedDateValue !== null ||
          acceptedCityValue !== null ||
          hasExplodedCleanup;
        let captureApplyAttempts = 1;
        let mutationResult: {
          ok: boolean;
          stage: CaseResolverFileMutationStage;
          fileFound: boolean;
          resolvedTargetFileId: string | null;
        } | null = null;
        const mutationStartedAtMs = shouldAttemptPersistPatch ? readCaptureApplyNowMs() : null;

        if (shouldAttemptPersistPatch) {
          const now = new Date().toISOString();
          const runCaptureMutation = ({
            mutationTargetFileId,
            mutationSource,
            mutationPrecheckFiles,
          }: {
            mutationTargetFileId: string;
            mutationSource: string;
            mutationPrecheckFiles: CaseResolverFile[];
          }): {
            ok: boolean;
            stage: CaseResolverFileMutationStage;
            fileFound: boolean;
            resolvedTargetFileId: string | null;
          } => {
            let mutationResultInner!: {
              ok: boolean;
              stage: CaseResolverFileMutationStage;
              fileFound: boolean;
              resolvedTargetFileId: string | null;
            };
            flushSync(() => {
              mutationResultInner = applyCaseResolverFileMutationAndRebaseDraft({
                fileId: mutationTargetFileId,
                updateWorkspace: args.updateWorkspace,
                setEditingDocumentDraft: args.setEditingDocumentDraft,
                fallbackFileOnMissing: null,
                allowFallbackOnMissing: false,
                precheckWorkspaceFiles: mutationPrecheckFiles,
                source: mutationSource,
                persistToast: 'Capture mapping applied.',
                skipNormalization: true,
                mutate: (file): Partial<CaseResolverFile> | null => {
                  if (file.isLocked) return null;
                  const fileShouldPatchAddresser =
                    acceptedAddresser &&
                    !areRolePatchReferencesEqual(file.addresser, nextAddresserReference);
                  const fileShouldPatchAddressee =
                    acceptedAddressee &&
                    !areRolePatchReferencesEqual(file.addressee, nextAddresseeReference);
                  const fileShouldPatchDocumentDate =
                    acceptedDateValue !== null &&
                    normalizeDocumentDateIso(file.documentDate) !== acceptedDateValue;
                  const fileShouldPatchDocumentCity =
                    acceptedCityValue !== null &&
                    normalizeDocumentCity(file.documentCity) !== acceptedCityValue;
                  const fileShouldApplyExplodedCleanup =
                    hasExplodedCleanup &&
                    Boolean(cleanedExplodedCanonical && cleanedExplodedStored);
                  const fileShouldPersistPatch =
                    fileShouldPatchAddresser ||
                    fileShouldPatchAddressee ||
                    fileShouldPatchDocumentDate ||
                    fileShouldPatchDocumentCity ||
                    fileShouldApplyExplodedCleanup;
                  if (!fileShouldPersistPatch) return null;
                  appliedAddresserReferencePatch =
                    appliedAddresserReferencePatch || fileShouldPatchAddresser;
                  appliedAddresseeReferencePatch =
                    appliedAddresseeReferencePatch || fileShouldPatchAddressee;
                  appliedDocumentDatePatch =
                    appliedDocumentDatePatch || fileShouldPatchDocumentDate;
                  appliedDocumentCityPatch =
                    appliedDocumentCityPatch || fileShouldPatchDocumentCity;
                  appliedExplodedCleanupPatch =
                    appliedExplodedCleanupPatch || fileShouldApplyExplodedCleanup;
                  const nextContentVersion = file.documentContentVersion + 1;
                  const currentSnapshot = hasExplodedCleanup
                    ? createCaseResolverHistorySnapshotEntry({
                      savedAt: now,
                      documentContentVersion: file.documentContentVersion,
                      activeDocumentVersion: file.activeDocumentVersion,
                      editorType: file.editorType,
                      documentContent: file.documentContent,
                      documentContentMarkdown: file.documentContentMarkdown,
                      documentContentHtml: file.documentContentHtml,
                      documentContentPlainText: file.documentContentPlainText,
                    })
                    : null;
                  const nextDocumentHistory = currentSnapshot
                    ? [currentSnapshot, ...file.documentHistory].slice(0, 120)
                    : file.documentHistory;
                  return {
                    ...(fileShouldPatchAddresser
                      ? { addresser: rolePatches.addresser ?? null }
                      : {}),
                    ...(fileShouldPatchAddressee
                      ? { addressee: rolePatches.addressee ?? null }
                      : {}),
                    ...(fileShouldPatchDocumentDate && acceptedDocumentDateValue
                      ? { documentDate: acceptedDocumentDateValue }
                      : {}),
                    ...(fileShouldPatchDocumentCity ? { documentCity: acceptedCityValue } : {}),
                    ...(fileShouldApplyExplodedCleanup &&
                    cleanedExplodedCanonical &&
                    cleanedExplodedStored
                      ? {
                        explodedDocumentContent: cleanedExplodedStored,
                        ...(file.activeDocumentVersion === 'exploded'
                          ? {
                            editorType: cleanedExplodedCanonical.mode,
                            documentContentFormatVersion: 1,
                            documentContent: cleanedExplodedStored,
                            documentContentMarkdown: cleanedExplodedCanonical.markdown,
                            documentContentHtml: cleanedExplodedCanonical.html,
                            documentContentPlainText: cleanedExplodedCanonical.plainText,
                            documentConversionWarnings: cleanedExplodedCanonical.warnings,
                            lastContentConversionAt: now,
                          }
                          : {}),
                        documentHistory: nextDocumentHistory,
                      }
                      : {}),
                    documentContentVersion: nextContentVersion,
                    updatedAt: now,
                  } as Partial<CaseResolverFile>;
                },
              });
            });
            return mutationResultInner;
          };

          let mutationTargetFileId = targetFileId;
          mutationResult = runCaptureMutation({
            mutationTargetFileId,
            mutationSource: 'capture_mapping_apply',
            mutationPrecheckFiles: args.workspaceRef.current.files,
          });

          if (!mutationResult.ok && mutationResult.stage === 'mutation') {
            const retryWorkspaceSnapshot = args.workspaceRef.current;

            const retryTargetResolution = resolveCaptureTargetFile({
              workspaceFiles: retryWorkspaceSnapshot.files,
              proposalTargetFileId: mutationTargetFileId,
              contextFileId: null,
              editingDraftFileId: null,
            });

            if (retryTargetResolution.file) {
              captureApplyAttempts = 2;

              mutationTargetFileId = retryTargetResolution.file.id;
              mutationResult = runCaptureMutation({
                mutationTargetFileId,
                mutationSource: 'capture_mapping_apply_retry',
                mutationPrecheckFiles: retryWorkspaceSnapshot.files,
              });
            }
          }

          if (!mutationResult.ok) {
            mutationDurationMs = resolveCaptureApplyDurationMs(mutationStartedAtMs);
            const failureStage = mutationResult.stage ?? 'mutation';
            const workspaceRevision = getCaseResolverWorkspaceRevision(args.workspaceRef.current);
            const failureMessage =
              failureStage === 'precheck'
                ? 'Capture target missing during precheck.'
                : 'Capture target missing during workspace mutation.';
            setCaptureApplyDiagnostics({
              status: 'failed',
              stage: failureStage,
              message: failureMessage,
              targetFileId,
              resolvedTargetFileId: mutationResult.resolvedTargetFileId,
              workspaceRevision,
              attempts: captureApplyAttempts,
              at: new Date().toISOString(),
              cleanupDurationMs,
              mutationDurationMs,
              totalDurationMs: resolveCaptureApplyDurationMs(applyStartedAtMs),
            });
            toast(
              failureStage === 'precheck'
                ? 'Capture mapping failed: target file missing (precheck).'
                : captureApplyAttempts > 1
                  ? 'Capture mapping failed: target file missing during apply (after retry).'
                  : 'Capture mapping failed: target file missing during apply.',
              {
                variant: 'warning',
              }
            );
            return;
          }
          if (!mutationResult.fileFound) {
            mutationDurationMs = resolveCaptureApplyDurationMs(mutationStartedAtMs);
            setCaptureApplyDiagnostics({
              status: 'failed',
              stage: 'rebase',
              message: 'Capture target missing during draft rebase.',
              targetFileId,
              resolvedTargetFileId: mutationResult.resolvedTargetFileId,
              workspaceRevision: getCaseResolverWorkspaceRevision(args.workspaceRef.current),
              attempts: captureApplyAttempts,
              at: new Date().toISOString(),
              cleanupDurationMs,
              mutationDurationMs,
              totalDurationMs: resolveCaptureApplyDurationMs(applyStartedAtMs),
            });
            toast('Capture mapping failed: target file missing during draft rebase.', {
              variant: 'warning',
            });
            return;
          }
          mutationDurationMs = resolveCaptureApplyDurationMs(mutationStartedAtMs);
        }

        const postMutationFile =
          args.workspaceRef.current.files.find((f) => f.id === targetFileId) ?? null;
        if (postMutationFile && postMutationFile.fileType !== 'case') {
          const freshDraft = buildFileEditDraft(postMutationFile);
          args.setEditingDocumentDraft(freshDraft);
          args.setEditorContentRevisionSeed((v) => v + 1);
        }
        args.refetchSettingsStore();

        args.setPromptExploderPartyProposal(nextProposalState);
        args.setPromptExploderProposalDraft(nextProposalState);
        const totalDurationMs = resolveCaptureApplyDurationMs(applyStartedAtMs);
        setCaptureApplyDiagnostics({
          status: 'success',
          stage: null,
          message: 'Capture mapping applied successfully.',
          targetFileId,
          resolvedTargetFileId: targetFileId,
          workspaceRevision: getCaseResolverWorkspaceRevision(args.workspaceRef.current),
          attempts: captureApplyAttempts,
          at: new Date().toISOString(),
          cleanupDurationMs,
          mutationDurationMs,
          totalDurationMs,
        });

        const failedRolesCount = failedRoles.length;
        if (failedRolesCount > 0) {
          toast(`Capture mapping partially applied. Could not apply: ${failedRoles.join(', ')}.`, {
            variant: 'warning',
          });
          return;
        }

        const changedPartyRoles: string[] = [];
        if (appliedAddresserReferencePatch) changedPartyRoles.push('Addresser');
        if (appliedAddresseeReferencePatch) changedPartyRoles.push('Addressee');
        args.setIsPromptExploderPartyProposalOpen(false);
        if (
          changedPartyRoles.length > 0 ||
          appliedDocumentDatePatch ||
          appliedDocumentCityPatch ||
          appliedExplodedCleanupPatch
        ) {
          const successParts: string[] = [];
          if (changedPartyRoles.length > 0) successParts.push('document parties');
          if (appliedDocumentDatePatch) successParts.push('document date');
          if (appliedDocumentCityPatch) successParts.push('city');
          if (appliedExplodedCleanupPatch) successParts.push('reassembled text cleanup');
          toast(`Capture mapping applied to ${successParts.join(', ')}.`, { variant: 'success' });
          return;
        }
        if (acceptedRoles.length > 0) {
          toast('Capture mapping accepted, but document party fields were unchanged.', {
            variant: 'info',
          });
          return;
        }
        if (shouldPersistFilemakerDatabase) {
          toast('Filemaker records created. No document party fields were changed.', {
            variant: 'info',
          });
          return;
        }
        toast('No database mapping selected. Document parties were not changed.', {
          variant: 'info',
        });
      } finally {
        args.setIsApplyingPromptExploderPartyProposal(false);
        captureApplyInFlightRef.current = false;
      }
    })();
  }, [args, toast, updateSetting]);

  return {
    captureApplyDiagnostics,
    handleApplyPromptExploderProposal,
  };
}
