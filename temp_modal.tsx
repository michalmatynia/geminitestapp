function ApplicationPackageModal({
  application,
  isMutating,
  jobListing,
  onClose,
  onDelete,
  onActiveArtifactsChange,
  onRemoveLogEntry,
  onStatusChange,
  onAnalysisRunQueued,
}: {
  application: PreparedJobApplication | null;
  isMutating: boolean;
  jobListing: FilemakerJobListing | null;
  onClose: () => void;
  onDelete: (applicationId: string) => void;
  onActiveArtifactsChange: (
    applicationId: string,
    activeArtifacts: FilemakerJobApplicationActiveArtifacts
  ) => void;
  onRemoveLogEntry: (applicationId: string, logEntryId: string) => void;
  onStatusChange: (applicationId: string, status: FilemakerJobApplicationStatus) => void;
  onAnalysisRunQueued?: () => void;
}): React.JSX.Element {
  const { toast } = useToast();
  const [appliedStatusSyncRunId, setAppliedStatusSyncRunId] = useState<string | null>(null);
  const [applyRun, setApplyRun] = useState<FilemakerJobApplicationApplyRun | null>(null);
  const applyRunRequestSeqRef = useRef(0);
  const matchAnalysisRefreshTimeoutsRef = useRef<number[]>([]);
  const toastRef = useRef(toast);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCoverLetterPdf, setIsExportingCoverLetterPdf] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isPreviewingCvPdf, setIsPreviewingCvPdf] = useState(false);
  const applyBrowserMode = useJobApplicationApplyBrowserModeSetting(application !== null);
  const cvVersions = application?.artifactVersions.tailoredCv ?? [];
  const coverLetterVersions = application?.artifactVersions.coverLetter ?? [];
  const applicationEmailVersions = application?.artifactVersions.applicationEmail ?? [];
  const latestCvVersionId = cvVersions[0]?.id ?? '';
  const latestCoverLetterVersionId = coverLetterVersions[0]?.id ?? '';
  const latestApplicationEmailVersionId = applicationEmailVersions[0]?.id ?? '';
  const resolveInitialVersionId = (
    versions: FilemakerJobApplication[],
    preferredVersionId: string | null | undefined,
    fallbackVersionId: string
  ): string =>
    preferredVersionId !== null &&
    preferredVersionId !== undefined &&
    versions.some((version: FilemakerJobApplication): boolean => version.id === preferredVersionId)
      ? preferredVersionId
      : fallbackVersionId;
  const [selectedCvVersionId, setSelectedCvVersionId] = useState('');
  const [selectedCoverLetterVersionId, setSelectedCoverLetterVersionId] = useState('');
  const [selectedApplicationEmailVersionId, setSelectedApplicationEmailVersionId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<FilemakerJobApplicationStatus>('draft');
  const [pendingMatchAnalysisRunId, setPendingMatchAnalysisRunId] = useState<string | null>(null);
  const [matchAnalysisContext, setMatchAnalysisContext] =
    useState<ApplicationMatchAnalysisContextState>(() =>
      createEmptyApplicationMatchAnalysisContextState()
    );

  useEffect(() => {
    if (application === null) {
      setMatchAnalysisContext(createEmptyApplicationMatchAnalysisContextState());
      return undefined;
    }
    const personId = application.personId.trim();
    if (personId.length === 0) {
      setMatchAnalysisContext(createEmptyApplicationMatchAnalysisContextState());
      return undefined;
    }

    let isCancelled = false;
    const controller = new AbortController();
    setMatchAnalysisContext((current: ApplicationMatchAnalysisContextState) => ({
      ...current,
      error: null,
      isLoading: true,
    }));

    const loadMatchAnalysisContext = async (): Promise<void> => {
      try {
        const [personResponse, cvsResponse] = await Promise.all([
          fetch(`/api/filemaker/persons/${encodeURIComponent(personId)}`, {
            signal: controller.signal,
          }),
          fetch(`/api/filemaker/cvs?personId=${encodeURIComponent(personId)}`, {
            signal: controller.signal,
          }),
        ]);
        if (!personResponse.ok) {
          // API request to load person profile returned an error status
          throw new Error(`Failed to load selected person profile (${personResponse.status}).`);
        }
        if (!cvsResponse.ok) {
          // API request to load person CVs returned an error status
          throw new Error(`Failed to load selected person CV records (${cvsResponse.status}).`);
        }
        const personPayload = (await personResponse.json()) as Record<string, unknown>;
        const cvsPayload = (await cvsResponse.json()) as { cvs?: FilemakerCv[] };
        if (isCancelled) return;
        setMatchAnalysisContext({
          cvs: Array.isArray(cvsPayload.cvs) ? cvsPayload.cvs : [],
          error: null,
          isLoading: false,
          personDetail: personPayload,
        });
      } catch (error: unknown) {
        if (isCancelled || controller.signal.aborted) return;
        logClientError(error);
        setMatchAnalysisContext({
          cvs: [],
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load selected person data for match analysis.',
          isLoading: false,
          personDetail: null,
        });
      }
    };

    void loadMatchAnalysisContext();
    return (): void => {
      isCancelled = true;
      controller.abort();
    };
  }, [application?.id, application?.personId]);

  useEffect(() => {
    setSelectedCvVersionId(
      resolveInitialVersionId(
        cvVersions,
        application?.activeArtifacts?.tailoredCvVersionId,
        latestCvVersionId
      )
    );
    setSelectedCoverLetterVersionId(
      resolveInitialVersionId(
        coverLetterVersions,
        application?.activeArtifacts?.coverLetterVersionId,
        latestCoverLetterVersionId
      )
    );
    setSelectedApplicationEmailVersionId(
      resolveInitialVersionId(
        applicationEmailVersions,
        application?.activeArtifacts?.applicationEmailVersionId,
        latestApplicationEmailVersionId
      )
    );
    setSelectedStatus(application?.status ?? 'draft');
  }, [
    application?.activeArtifacts?.applicationEmailVersionId,
    application?.activeArtifacts?.coverLetterVersionId,
    application?.activeArtifacts?.tailoredCvVersionId,
    application?.status,
    application?.id,
    applicationEmailVersions,
    coverLetterVersions,
    cvVersions,
    latestApplicationEmailVersionId,
    latestCoverLetterVersionId,
    latestCvVersionId,
  ]);
  const persistActiveArtifacts = (patch: Partial<FilemakerJobApplicationActiveArtifacts>): void => {
    const applicationIds = application?.applicationIds ?? [];
    const applicationId = applicationIds.length === 1 ? (applicationIds[0] ?? null) : null;
    if (applicationId === null) return;
    onActiveArtifactsChange(applicationId, {
      applicationEmailVersionId:
        selectedApplicationEmailVersionId.length > 0 ? selectedApplicationEmailVersionId : null,
      coverLetterVersionId:
        selectedCoverLetterVersionId.length > 0 ? selectedCoverLetterVersionId : null,
      tailoredCvVersionId: selectedCvVersionId.length > 0 ? selectedCvVersionId : null,
      ...patch,
    });
  };
  const handleCvVersionChange = (value: string): void => {
    setSelectedCvVersionId(value);
  };
  const handleCoverLetterVersionChange = (value: string): void => {
    setSelectedCoverLetterVersionId(value);
  };
  const handleApplicationEmailVersionChange = (value: string): void => {
    setSelectedApplicationEmailVersionId(value);
  };
  const handleSavePreparedApplication = (): void => {
    if (application === null) return;
    persistActiveArtifacts({});
    onStatusChange(application.id, selectedStatus);
  };
  const selectedCvVersion =
    cvVersions.find(
      (version: FilemakerJobApplication): boolean => version.id === selectedCvVersionId
    ) ??
    cvVersions[0] ??
    null;
  const selectedCoverLetterVersion =
    coverLetterVersions.find(
      (version: FilemakerJobApplication): boolean => version.id === selectedCoverLetterVersionId
    ) ??
    coverLetterVersions[0] ??
    null;
  const selectedApplicationEmailVersion =
    applicationEmailVersions.find(
      (version: FilemakerJobApplication): boolean =>
        version.id === selectedApplicationEmailVersionId
    ) ??
    applicationEmailVersions[0] ??
    null;
  const visibleApplication =
    application !== null
      ? createVisiblePreparedApplication({
          application,
          applicationEmailVersion: selectedApplicationEmailVersion,
          coverLetterVersion: selectedCoverLetterVersion,
          tailoredCvVersion: selectedCvVersion,
        })
      : null;
  const totalArtifactVersionCount =
    cvVersions.length + coverLetterVersions.length + applicationEmailVersions.length;
  const applyApplicationId =
    application !== null && application.applicationIds.length === 1
      ? application.applicationIds[0] ?? null
      : null;
  const cvHref = visibleApplication !== null ? cvApplicationHref(visibleApplication) : null;
  const jobHref =
    visibleApplication !== null ? getApplicationJobHref(visibleApplication, jobListing) : null;
  const notes = visibleApplication?.applicationNotes ?? [];
  const missingInformation = visibleApplication?.missingInformation ?? [];
  const skills = visibleApplication?.tailoredCv?.skills ?? [];
  const tailoringPatch = visibleApplication?.tailoredCv?.tailoringPatch ?? null;
  const tailoredProfessionalSummary =
    tailoringPatch?.professionalSummary ?? visibleApplication?.tailoredCv?.professionalSummary;
  const coreStrengths = tailoringPatch?.coreStrengths ?? visibleApplication?.tailoredCv?.coreStrengths ?? [];
  const selectedTechnicalEnvironment =
    tailoringPatch?.selectedTechnicalEnvironment ??
    visibleApplication?.tailoredCv?.selectedTechnicalEnvironment ??
    [];
  const experienceHighlightPatches =
    tailoringPatch?.experienceHighlightPatches ??
    visibleApplication?.tailoredCv?.experienceHighlightPatches ??
    [];
  const tailoredCvAllowedSections = visibleApplication?.tailoredCv?.tailoringScope?.allowedSections ?? [];
  const tailoredCvCanonicalPatchField =
    visibleApplication?.tailoredCv?.tailoringScope?.canonicalPatchField ?? 'tailoringPatch';
  const tailoredCvRenderedBodyMode =
    visibleApplication?.tailoredCv?.tailoringScope?.renderedBodyMode ?? 'ai_rendered_full_cv';
  const tailoredCvSourceTitle = visibleApplication?.tailoredCv?.sourceCvTitle?.trim() ?? '';
  const tailoredCvSourceId = visibleApplication?.tailoredCv?.sourceCvRecordId?.trim() ?? '';
  const tailoredCvSourceHref =
    visibleApplication !== null &&
    tailoredCvSourceId.length > 0 &&
    tailoredCvSourceId !== 'profile-fields-only' &&
    tailoredCvSourceId !== visibleApplication.tailoredCvId
      ? `/admin/filemaker/persons/${encodeURIComponent(
          visibleApplication.personId
        )}/cvs/${encodeURIComponent(tailoredCvSourceId)}`
      : null;
  const visibleApplicationForEmail =
    visibleApplication !== null && hasApplicationEmailArtifact(visibleApplication)
      ? visibleApplication
      : null;
  const canExportPdf =
    visibleApplication?.tailoredCvId !== null &&
    visibleApplication?.tailoredCvId !== undefined &&
    visibleApplication.tailoredCvId.trim().length > 0;
  const applyButtonLabel = resolveApplicationApplyButtonLabel(applyRun, isApplying);
  const applyActionHref = resolveStepSequencerActionHref(applyBrowserMode.action?.id);
  const matchAnalysis = visibleApplication?.matchAnalysis ?? null;
  const matchAnalysisHistory = visibleApplication?.matchAnalysisHistory ?? [];
  const visibleMatchAnalysisHistory = matchAnalysisHistory.slice(-4).reverse();
  const matchAnalysisStatus = visibleApplication?.matchAnalysisStatus ?? null;
  const displayedMatchAnalysisStatus =
    pendingMatchAnalysisRunId !== null ? 'queued' : matchAnalysisStatus;
  const matchAnalysisUpdatedAtMs = Date.parse(visibleApplication?.matchAnalysisUpdatedAt ?? '');
  const visibleApplicationUpdatedAtMs = Date.parse(visibleApplication?.updatedAt ?? '');
  const latestMatchAnalysisApplicationSnapshotMs = Date.parse(
    matchAnalysisHistory[matchAnalysisHistory.length - 1]?.applicationUpdatedAtSnapshot ?? ''
  );
  const visibleApplicationMatchAnalysisUpdatedAt = visibleApplication?.matchAnalysisUpdatedAt ?? null;
  const visibleApplicationMatchAnalysisSourceEntityId = visibleApplication?.matchAnalysisSourceEntityId ?? null;
  const matchAnalysisFreshnessBaselineMs = Number.isFinite(latestMatchAnalysisApplicationSnapshotMs)
    ? latestMatchAnalysisApplicationSnapshotMs
    : matchAnalysisUpdatedAtMs;
  const isMatchAnalysisStale =
    matchAnalysis !== null &&
    Number.isFinite(matchAnalysisFreshnessBaselineMs) &&
    Number.isFinite(visibleApplicationUpdatedAtMs) &&
    visibleApplicationUpdatedAtMs > matchAnalysisFreshnessBaselineMs + 60_000;
  const matchAnalysisFreshnessLabel = isMatchAnalysisStale
    ? 'Stale - rerun Analyze Match before relying on this recommendation'
    : 'Current';
  const matchAnalysisSnapshotLabel = Number.isFinite(matchAnalysisFreshnessBaselineMs)
    ? formatTimestamp(new Date(matchAnalysisFreshnessBaselineMs).toISOString())
    : null;
  const visibleApplicationUpdatedLabel = Number.isFinite(visibleApplicationUpdatedAtMs)
    ? formatTimestamp(new Date(visibleApplicationUpdatedAtMs).toISOString())
    : null;
  const canRunMatchAnalysis =
    visibleApplication !== null &&
    jobListing !== null &&
    matchAnalysisContext.isLoading === false &&
    matchAnalysisContext.error === null;
  const matchAnalysisCvCount = matchAnalysisContext.cvs.length;
  const matchAnalysisContextStatus = (() => {
    if (matchAnalysisContext.isLoading) return 'Loading CV context';
    if (matchAnalysisContext.error !== null) return 'Context unavailable';
    const suffix = matchAnalysisCvCount === 1 ? '' : 's';
    return `${matchAnalysisCvCount} CV record${suffix} loaded`;
  })();
  const matchAnalysisDisabledReason = (() => {
    if (visibleApplication === null) return 'Open a prepared application before running match analysis.';
    if (jobListing === null) return 'Job listing context is missing.';
    if (matchAnalysisContext.isLoading) return 'Selected person profile and CV records are still loading.';
    return matchAnalysisContext.error;
  })();
  const matchAnalysisScore = matchAnalysis?.score ?? null;
  const matchAnalysisReadinessLabel = (() => {
    if (matchAnalysisScore === null) return 'Not analyzed';
    if (matchAnalysisScore >= 90) return 'Excellent fit';
    if (matchAnalysisScore >= 75) return 'Strong fit';
    if (matchAnalysisScore >= 60) return 'Workable fit';
    if (matchAnalysisScore >= 40) return 'Partial fit';
    return 'Weak fit';
  })();
  const matchAnalysisReadinessHint = (() => {
    if (matchAnalysisScore === null) return 'Run analysis to estimate application readiness.';
    if (matchAnalysisScore >= 75)
      return 'This application looks worth prioritising. Focus on sharpening evidence and interview talking points.';
    if (matchAnalysisScore >= 60)
      return 'This application may be viable, but the gaps should be addressed before applying.';
    return 'This application needs focused preparation or a stronger evidence story before applying.';
  })();
  const matchAnalysisReadinessClassName = (() => {
    if (matchAnalysisScore === null) return 'border-border/50 bg-background/35 text-gray-300';
    if (matchAnalysisScore >= 75) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
    if (matchAnalysisScore >= 60) return 'border-blue-500/30 bg-blue-500/10 text-blue-100';
    if (matchAnalysisScore >= 40) return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
    return 'border-red-500/30 bg-red-500/10 text-red-100';
  })();
  const previousMatchAnalysisScore =
    matchAnalysisHistory.length > 1
      ? matchAnalysisHistory[matchAnalysisHistory.length - 2]?.payload?.score ?? null
      : null;
  const previousMatchAnalysisDecision =
    matchAnalysisHistory.length > 1
      ? matchAnalysisHistory[matchAnalysisHistory.length - 2]?.payload?.recommendedDecision ?? null
      : null;
  const matchAnalysisScoreDelta =
    matchAnalysisScore !== null && previousMatchAnalysisScore !== null
      ? matchAnalysisScore - previousMatchAnalysisScore
      : null;
  const matchAnalysisScoreDeltaLabel = (() => {
    if (matchAnalysisScoreDelta === null) return null;
    if (matchAnalysisScoreDelta > 0) return `+${matchAnalysisScoreDelta} vs previous`;
    return `${matchAnalysisScoreDelta} vs previous`;
  })();
  const matchAnalysisPrepWorkloadScore =
    (matchAnalysis?.gaps.length ?? 0) +
    (matchAnalysis?.attentionAreas.length ?? 0) +
    (matchAnalysis?.riskFlags.length ?? 0);
  const matchAnalysisPrepWorkloadLabel = (() => {
    if (matchAnalysis === null) return 'Unknown prep workload';
    if (matchAnalysisPrepWorkloadScore <= 3) return 'Low prep workload';
    if (matchAnalysisPrepWorkloadScore <= 7) return 'Medium prep workload';
    return 'High prep workload';
  })();
  const fallbackMatchAnalysisDecisionLabel = (() => {
    if (matchAnalysisScore === null) return 'Analyze before deciding';
    if (matchAnalysisScore >= 75 && matchAnalysisPrepWorkloadScore <= 7) return 'Apply now';
    if (matchAnalysisScore >= 60) return 'Prepare before applying';
    return 'Deprioritise or rebuild evidence';
  })();
  const fallbackMatchAnalysisDecisionHint = (() => {
    if (matchAnalysisScore === null)
      return 'Run Analyze Match to turn the job/CV comparison into an application decision.';
    if (matchAnalysisScore >= 75 && matchAnalysisPrepWorkloadScore <= 7) {
      return 'The fit is strong enough to move forward. Review risks and tailor talking points.';
    }
    if (matchAnalysisScore >= 60) {
      return 'The fit is plausible, but address the listed gaps before sending the application.';
    }
    return 'The current evidence is weak for this posting. Apply only if there is a strategic reason.';
  })();
  const matchAnalysisDecisionLabel =
    matchAnalysis?.recommendedDecision ?? fallbackMatchAnalysisDecisionLabel;
  const matchAnalysisDecisionHint =
    matchAnalysis?.recommendedDecisionReason ?? fallbackMatchAnalysisDecisionHint;
  const matchAnalysisDecisionSource =
    matchAnalysis?.recommendedDecision !== null && matchAnalysis?.recommendedDecision !== undefined
      ? 'AI recommendation'
      : 'Derived from score';
  const matchAnalysisDecisionChanged =
    previousMatchAnalysisDecision !== null &&
    matchAnalysisDecisionLabel !== previousMatchAnalysisDecision;
  const matchAnalysisDecisionClassName = (() => {
    if (matchAnalysisDecisionLabel === 'Apply now')
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
    if (matchAnalysisDecisionLabel === 'Prepare before applying')
      return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
    if (matchAnalysisDecisionLabel === 'Deprioritise or rebuild evidence')
      return 'border-red-500/30 bg-red-500/10 text-red-100';
    if (matchAnalysisScore === null) return 'border-border/50 bg-background/35 text-gray-300';
    if (matchAnalysisScore >= 75 && matchAnalysisPrepWorkloadScore <= 7)
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
    if (matchAnalysisScore >= 60) return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
    return 'border-red-500/30 bg-red-500/10 text-red-100';
  })();

