'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AiPathRunRecord } from '@/shared/types/domain/ai-paths';
import {
  AgentAuditLog,
  AgentBrowserLog,
} from '@/shared/types/domain/chatbot';
import { Button, SectionHeader, SectionPanel, Tabs, TabsContent, TabsList, TabsTrigger, SharedModal, Input } from '@/shared/ui';

import { useAgentRunContext } from '../context/AgentRunContext';


export default function AgentRunsPage(): React.ReactElement {
  const [query, setQuery] = useState('');
  const {
    selectedAgentRunId,
    setSelectedAgentRunId,
    selectedAgentRun: contextSelectedAgentRun,
    agentRuns,
    agentSnapshots,
    agentBrowserLogs,
    agentAuditLogs,
    agentStreamStatus,
    setAgentStreamStatus,
    isLoadingRuns: loading,
    refetchRuns: loadAgentRuns,
  } = useAgentRunContext();

  const [expandedAuditIds, setExpandedAuditIds] = useState<
    Record<string, boolean>
  >({});

  const agentSnapshot = agentSnapshots[0] ?? null;
  const error = null;

  const filteredRuns = useMemo(() => {
    const term = query.trim().toLowerCase();
    const sorted = [...agentRuns].sort(
      (a: AiPathRunRecord, b: AiPathRunRecord): number => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!term) return sorted;
    return sorted.filter((run: AiPathRunRecord) =>
      [run.id, run.status, run.model ?? '', run.prompt ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [agentRuns, query]);

  const selectedAgentRun = contextSelectedAgentRun;
  const sessionContextLogs = useMemo(
    () =>
      agentBrowserLogs.filter((log: AgentBrowserLog) => log.message === 'Captured session context.'),
    [agentBrowserLogs]
  );
  const loginCandidateLogs = useMemo(
    () =>
      agentBrowserLogs.filter((log: AgentBrowserLog) => log.message === 'Inferred login candidates.'),
    [agentBrowserLogs]
  );
  const plannerContextAudits = useMemo(
    () =>
      agentAuditLogs.filter((audit: AgentAuditLog) => audit.metadata?.['type'] === 'planner-context'),
    [agentAuditLogs]
  );
  const planAudits = useMemo(
    () => agentAuditLogs.filter((audit: AgentAuditLog) => audit.metadata?.['type'] === 'plan'),
    [agentAuditLogs]
  );
  const planUpdateAudits = useMemo(
    () =>
      agentAuditLogs.filter((audit: AgentAuditLog) => {
        const auditType =
          typeof audit.metadata?.['type'] === 'string' ? audit.metadata['type'] : '';
        return ['plan', 'plan-update'].includes(auditType);
      }),
    [agentAuditLogs]
  );
  const branchAudits = useMemo(
    () => agentAuditLogs.filter((audit: AgentAuditLog) => audit.metadata?.['type'] === 'plan-branch'),
    [agentAuditLogs]
  );
  const replanAudits = useMemo(
    () =>
      agentAuditLogs.filter((audit: AgentAuditLog) => {
        const auditType =
          typeof audit.metadata?.['type'] === 'string' ? audit.metadata['type'] : '';
        return ['plan-replan', 'plan-adapt', 'self-check-replan'].includes(
          auditType
        );
      }),
    [agentAuditLogs]
  );
  const latestSessionContext = (sessionContextLogs.at(-1)?.metadata as Record<string, unknown> | null) ?? null;
  const latestLoginCandidates = (loginCandidateLogs.at(-1)?.metadata as Record<string, unknown> | null) ?? null;
  const latestPlannerContext = (plannerContextAudits.at(-1)?.metadata as Record<string, unknown> | null) ?? null;
  const latestPlanHierarchy =
    (
      planAudits.at(-1)?.metadata as {
        hierarchy?: { goals?: unknown[] };
      } | null
    )?.hierarchy ?? null;
  const latestPlanSteps = useMemo(() => {
    const latestPlan = planUpdateAudits.find((audit: AgentAuditLog) =>
      Array.isArray((audit.metadata as Record<string, unknown>)?.['steps'])
    );
    return Array.isArray((latestPlan?.metadata as Record<string, unknown>)?.['steps'])
      ? ((latestPlan?.metadata as Record<string, unknown>)?.['steps'] as Array<{
          id?: string;
          title?: string;
          status?: string;
          tool?: string | null;
          expectedObservation?: string | null;
          successCriteria?: string | null;
          phase?: string | null;
        }>)
      : [];
  }, [planUpdateAudits]);
  const planningEventsByStep = useMemo(() => {
    const map = new Map<string, AgentAuditLog[]>();
    [...branchAudits, ...replanAudits].forEach((audit: AgentAuditLog) => {
      const meta = audit.metadata as {
        stepId?: string;
        failedStepId?: string;
        activeStepId?: string;
      } | null;
      const stepId =
        meta?.stepId ?? meta?.failedStepId ?? meta?.activeStepId ?? null;
      if (!stepId) return;
      const list = map.get(stepId) ?? [];
      list.push(audit);
      map.set(stepId, list);
    });
    return map;
  }, [branchAudits, replanAudits]);

  const closeAgentModal = (): void => {
    setSelectedAgentRunId(null);
    setAgentStreamStatus('idle');
  };

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Agent Runs'
        eyebrow={(
          <Link
            href='/admin/agentcreator'
            className='text-blue-300 hover:text-blue-200'
          >
            ← Back to agent creator
          </Link>
        )}
        className='mb-6'
      />
      <SectionPanel className='p-4'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <Input
            className='max-w-sm h-8 text-sm'
            placeholder='Search runs...'
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
          />
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void loadAgentRuns();
              }}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
        {loading ? (
          <p className='text-sm text-gray-400'>Loading runs...</p>
        ) : error ? (
          <p className='text-sm text-red-400'>{error}</p>
        ) : filteredRuns.length === 0 ? (
          <div className='text-center py-8'>
            <p className='text-gray-400'>No runs yet</p>
            <p className='text-sm text-gray-500 mt-1'>Agent runs track the browser automation steps performed by the AI.</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {filteredRuns.map((job: AiPathRunRecord) => (
              <div
                key={job.id}
                className='rounded-md border border-border bg-gray-900 px-4 py-3'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <p className='text-xs uppercase tracking-wide text-gray-500'>
                      Agent run
                    </p>
                    <p className='text-sm text-white'>
                      {job.status.toUpperCase()} ·{' '}
                      {job.model || 'Default model'}
                    </p>
                    <p className='text-xs text-gray-500'>
                      Created {new Date(job.createdAt).toLocaleString()}
                    </p>
                    <div className='mt-2 text-xs text-gray-400'>
                      <p className='text-xs text-gray-300 line-clamp-2'>
                        Prompt: {job.prompt}
                      </p>
                      <p className='text-[11px] text-gray-500'>
                        Run ID: {job.id}
                      </p>
                      Snapshots: {job._count?.['browserSnapshots'] ?? 0} · Logs:{' '}
                      {job._count?.['browserLogs'] ?? 0}
                      {job.requiresHumanIntervention ? ' · needs input' : ''}
                    </div>
                    {job.errorMessage ? (
                      <p className='mt-1 text-xs text-red-300'>
                        {job.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setSelectedAgentRunId(job.id)}
                    >
                      View details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>

      {selectedAgentRunId ? (
        <SharedModal
          open={true}
          onClose={closeAgentModal}
          title='Agent job details'
        >
          <Tabs defaultValue='summary' className='w-full'>
            <TabsList className='grid w-full grid-cols-7'>
              <TabsTrigger value='summary'>Summary</TabsTrigger>
              <TabsTrigger value='preview'>Preview</TabsTrigger>
              <TabsTrigger value='dom'>DOM</TabsTrigger>
              <TabsTrigger value='steps'>Steps</TabsTrigger>
              <TabsTrigger value='logs'>Logs</TabsTrigger>
              <TabsTrigger value='context'>Context</TabsTrigger>
              <TabsTrigger value='elements'>Elements</TabsTrigger>
            </TabsList>
            <TabsContent value='summary' className='mt-4 space-y-3'>
              {selectedAgentRun ? (
                <div className='rounded-md border border-border bg-gray-900 p-3 text-xs text-gray-300'>
                  <p className='text-[11px] text-gray-500'>Run summary</p>
                  <p className='mt-1 text-sm text-white'>
                    {selectedAgentRun.prompt}
                  </p>
                  <div className='mt-2 text-xs text-gray-400'>
                        Status: {selectedAgentRun.status.replace('_', ' ')} ·
                        Model: {selectedAgentRun.model || 'Default'}
                    {selectedAgentRun.requiresHumanIntervention
                      ? ' · needs input'
                      : ''}
                  </div>
                  {selectedAgentRun.checkpointedAt ? (
                    <div className='mt-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-[11px] text-emerald-200'>
                          Checkpoint saved{' '}
                      {new Date(
                        selectedAgentRun.checkpointedAt
                      ).toLocaleString()}
                      {selectedAgentRun.activeStepId ? (
                        <span className='text-emerald-300'>
                          {' '}
                              · Active step {selectedAgentRun.activeStepId}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className='mt-2 text-[11px] text-gray-500'>
                          No checkpoint saved yet.
                    </div>
                  )}
                  {selectedAgentRun.recordingPath ? (
                    <div className='mt-2 text-xs text-gray-400'>
                          Recording:{' '}
                      <a
                        className='text-emerald-300 hover:text-emerald-200'
                        href={`/api/agentcreator/agent/${selectedAgentRun.id}/assets/${selectedAgentRun.recordingPath}`}
                        target='_blank'
                        rel='noreferrer'
                      >
                            View recording
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </TabsContent>
            <TabsContent value='preview' className='mt-4'>
              <div className='rounded-md border border-border bg-card p-3'>
                <div className='flex items-center justify-between text-xs text-gray-400'>
                  <span>Preview</span>
                  <span>
                    {agentStreamStatus === 'live'
                      ? 'Live'
                      : agentStreamStatus === 'connecting'
                        ? 'Connecting...'
                        : agentStreamStatus === 'error'
                          ? 'Fallback'
                          : 'Idle'}
                  </span>
                </div>
                <div className='mt-3 overflow-hidden rounded-md border border-border bg-gray-900'>
                  {agentSnapshot?.screenshotPath ||
                      agentSnapshot?.screenshotData ? (
                      <div className='relative'>
                        <Image
                          src={
                            agentSnapshot.screenshotPath
                              ? `/api/agentcreator/agent/${selectedAgentRunId}/assets/${agentSnapshot.screenshotPath}`
                              : (agentSnapshot.screenshotData ?? '')
                          }
                          alt='Agent preview'
                          className='h-auto w-full'
                          width={agentSnapshot.viewportWidth ?? 1280}
                          height={agentSnapshot.viewportHeight ?? 720}
                          unoptimized
                        />
                        {agentSnapshot.mouseX !== null &&
                          agentSnapshot.mouseY !== null &&
                          agentSnapshot.viewportWidth &&
                          agentSnapshot.viewportHeight ? (
                            <div
                              className='absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                              style={{
                                left: `${
                                  (agentSnapshot.mouseX /
                                    agentSnapshot.viewportWidth) *
                                  100
                                }%`,
                                top: `${
                                  (agentSnapshot.mouseY /
                                    agentSnapshot.viewportHeight) *
                                  100
                                }%`,
                              }}
                            />
                          ) : null}
                      </div>
                    ) : (
                      <div className='flex min-h-[200px] items-center justify-center text-xs text-gray-500'>
                          No preview yet.
                      </div>
                    )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value='dom' className='mt-4'>
              <div className='rounded-md border border-border bg-card p-3 text-xs text-gray-300'>
                <p className='text-[11px] text-gray-500'>DOM snapshot</p>
                <div className='mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                  {agentSnapshot?.domText || 'No DOM captured yet.'}
                </div>
              </div>
            </TabsContent>
            <TabsContent value='steps' className='mt-4'>
              <div className='rounded-md border border-border bg-card p-3 text-xs text-gray-300'>
                <div className='mb-3 flex items-center justify-between text-[11px] text-gray-400'>
                  <span>Checkpoint status</span>
                  {selectedAgentRun?.checkpointedAt ? (
                    <span className='text-emerald-300'>
                      {new Date(
                        selectedAgentRun.checkpointedAt
                      ).toLocaleString()}
                    </span>
                  ) : (
                    <span className='text-gray-500'>None</span>
                  )}
                </div>
                {selectedAgentRun?.checkpointedAt ? (
                  <div className='mb-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-[11px] text-emerald-200'>
                    {selectedAgentRun.activeStepId
                      ? `Active step: ${selectedAgentRun.activeStepId}`
                      : 'Active step: unknown'}
                  </div>
                ) : null}
                <p className='text-[11px] text-gray-500'>Plan hierarchy</p>
                {latestPlanHierarchy?.goals?.length ? (
                  <div className='mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                    {(
                          latestPlanHierarchy.goals as Array<{
                            id?: string;
                            title?: string;
                            successCriteria?: string | null;
                            subgoals?: Array<{
                              id?: string;
                              title?: string;
                              successCriteria?: string | null;
                              steps?: Array<{
                                title?: string;
                                tool?: string | null;
                                expectedObservation?: string | null;
                                successCriteria?: string | null;
                              }>;
                            }>;
                          }>
                    ).map((goal: {
                            id?: string;
                            title?: string;
                            successCriteria?: string | null;
                            subgoals?: Array<{
                              id?: string;
                              title?: string;
                              successCriteria?: string | null;
                              steps?: Array<{
                                title?: string;
                                tool?: string | null;
                                expectedObservation?: string | null;
                                successCriteria?: string | null;
                              }>;
                            }>;
                          }, goalIndex: number) => (
                      <div
                        key={goal.id ?? `goal-${goalIndex}`}
                        className='rounded-md border border-border bg-card p-2'
                      >
                        <p className='text-xs text-slate-200'>
                              Goal {goalIndex + 1}: {goal.title}
                        </p>
                        {goal.successCriteria ? (
                          <p className='mt-1 text-[10px] text-gray-400'>
                                Success: {goal.successCriteria}
                          </p>
                        ) : null}
                        <div className='mt-2 space-y-2 pl-3'>
                          {goal.subgoals?.map((subgoal: {
                                id?: string;
                                title?: string;
                                successCriteria?: string | null;
                                steps?: Array<{
                                  title?: string;
                                  tool?: string | null;
                                  expectedObservation?: string | null;
                                  successCriteria?: string | null;
                                }>;
                              }, subIndex: number) => (
                            <div
                              key={
                                subgoal.id ??
                                    `subgoal-${goalIndex}-${subIndex}`
                              }
                              className='rounded-md border border-border bg-gray-900 p-2'
                            >
                              <p className='text-[11px] text-slate-100'>
                                    Subgoal {goalIndex + 1}.{subIndex + 1}:{' '}
                                {subgoal.title}
                              </p>
                              {subgoal.successCriteria ? (
                                <p className='mt-1 text-[10px] text-gray-400'>
                                      Success: {subgoal.successCriteria}
                                </p>
                              ) : null}
                              <ul className='mt-2 space-y-1 pl-3 text-[10px] text-gray-300'>
                                {subgoal.steps?.map((step: {
                                        title?: string;
                                        tool?: string | null;
                                        expectedObservation?: string | null;
                                        successCriteria?: string | null;
                                      }, stepIndex: number) => (
                                  <li
                                    key={`${goalIndex}-${subIndex}-${stepIndex}`}
                                  >
                                    <span className='text-slate-100'>
                                          Step {goalIndex + 1}.{subIndex + 1}.
                                      {stepIndex + 1}:
                                    </span>{' '}
                                    {step.title}
                                    {step.tool ? (
                                      <span className='ml-2 text-[9px] text-gray-500'>
                                            ({step.tool})
                                      </span>
                                    ) : null}
                                    {step.successCriteria ? (
                                      <div className='mt-1 text-[9px] text-gray-400'>
                                            Success: {step.successCriteria}
                                      </div>
                                    ) : null}
                                    {step.expectedObservation ? (
                                      <div className='mt-1 text-[9px] text-gray-500'>
                                            Expected: {step.expectedObservation}
                                      </div>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )) ?? (
                            <p className='text-[10px] text-gray-500'>
                                  No subgoals captured.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='mt-2 text-gray-500'>
                        No hierarchy captured yet.
                  </p>
                )}
              </div>
              <div className='mt-4 rounded-md border border-border bg-card p-3 text-xs text-gray-300'>
                <p className='text-[11px] text-gray-500'>Plan steps</p>
                {latestPlanSteps.length ? (
                  <div className='mt-2 max-h-56 space-y-2 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                    {latestPlanSteps.map((step: {
                            id?: string;
                            title?: string;
                            status?: string;
                            tool?: string | null;
                            expectedObservation?: string | null;
                            successCriteria?: string | null;
                            phase?: string | null;
                          }, index: number) => {
                      const stepId = step.id ?? `step-${index}`;
                      const events = planningEventsByStep.get(stepId) ?? [];
                      return (
                        <div
                          key={stepId}
                          className='rounded-md border border-border bg-card p-2'
                        >
                          <div className='flex items-center justify-between text-[10px] text-gray-500'>
                            <span>{step.status ?? 'pending'}</span>
                            {step.phase ? (
                              <span className='text-amber-200'>
                                {step.phase}
                              </span>
                            ) : null}
                          </div>
                          <p className='mt-1 text-[11px] text-gray-200'>
                            {step.title || `Step ${index + 1}`}
                          </p>
                          {step.successCriteria ? (
                            <p className='mt-1 text-[10px] text-gray-400'>
                                  Success: {step.successCriteria}
                            </p>
                          ) : null}
                          {step.expectedObservation ? (
                            <p className='mt-1 text-[10px] text-gray-500'>
                                  Expected: {step.expectedObservation}
                            </p>
                          ) : null}
                          {events.length > 0 ? (
                            <div className='mt-2 rounded-md border border-border bg-gray-900 p-2'>
                              <p className='text-[10px] uppercase tracking-wide text-gray-500'>
                                    Planning events
                              </p>
                              <ul className='mt-1 space-y-1 text-[10px] text-gray-300'>
                                {events.map((event: AgentAuditLog) => (
                                  <li key={event.id}>{event.message}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className='mt-2 text-gray-500'>No plan steps found.</p>
                )}
              </div>
              <div className='mt-4 rounded-md border border-border bg-card p-3 text-xs text-gray-300'>
                <div className='flex items-center gap-2'>
                  <span className='rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200'>
                        Branch
                  </span>
                  <p className='text-[11px] text-gray-500'>
                        Recovery branches
                  </p>
                </div>
                {branchAudits.length ? (
                  <div className='mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                    {branchAudits.map((audit: AgentAuditLog, index: number) => {
                      const meta = audit.metadata as {
                            failedStepId?: string;
                            reason?: string;
                            branchSteps?: Array<{
                              id?: string;
                              title?: string;
                              tool?: string | null;
                              expectedObservation?: string | null;
                              successCriteria?: string | null;
                            }>;
                          } | null;
                      return (
                        <div
                          key={audit.id ?? `branch-${index}`}
                          className='rounded-md border border-border bg-card p-2'
                        >
                          <div className='flex items-center justify-between text-[10px] text-gray-500'>
                            <span>
                              {new Date(
                                audit.createdAt
                              ).toLocaleTimeString()}
                            </span>
                            {meta?.reason ? (
                              <span className='text-amber-200'>
                                {meta.reason}
                              </span>
                            ) : null}
                          </div>
                          <p className='mt-1 text-[11px] text-gray-200'>
                            {audit.message}
                          </p>
                          {meta?.failedStepId ? (
                            <p className='mt-1 text-[10px] text-gray-400'>
                                  Failed step: {meta.failedStepId}
                            </p>
                          ) : null}
                          {meta?.branchSteps?.length ? (
                            <ul className='mt-2 space-y-1 pl-3 text-[10px] text-gray-300'>
                              {meta.branchSteps.map((step: {
                                      id?: string;
                                      title?: string;
                                      tool?: string | null;
                                      expectedObservation?: string | null;
                                      successCriteria?: string | null;
                                    }, stepIndex: number) => (
                                <li
                                  key={
                                    step.id ?? `branch-step-${stepIndex}`
                                  }
                                >
                                  <span className='text-slate-100'>
                                        Step {stepIndex + 1}:
                                  </span>{' '}
                                  {step.title}
                                  {step.tool ? (
                                    <span className='ml-2 text-[9px] text-gray-500'>
                                          ({step.tool})
                                    </span>
                                  ) : null}
                                  {step.successCriteria ? (
                                    <div className='mt-1 text-[9px] text-gray-400'>
                                          Success: {step.successCriteria}
                                    </div>
                                  ) : null}
                                  {step.expectedObservation ? (
                                    <div className='mt-1 text-[9px] text-gray-500'>
                                          Expected: {step.expectedObservation}
                                    </div>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className='mt-2 text-[10px] text-gray-500'>
                                  No branch steps captured.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className='mt-2 text-gray-500'>
                        No branches recorded yet.
                  </p>
                )}
              </div>
              <div className='mt-4 rounded-md border border-border bg-card p-3 text-xs text-gray-300'>
                <p className='text-[11px] text-gray-500'>Agent steps</p>
                <div className='mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                  {agentAuditLogs.length === 0 ? (
                    <p className='text-gray-500'>No steps yet.</p>
                  ) : (
                    agentAuditLogs.map((step: AgentAuditLog) => (
                      <div
                        key={step.id}
                        className='rounded-md border border-border px-2 py-1'
                      >
                        <div className='flex items-center justify-between text-[10px] text-gray-500'>
                          <span className='uppercase tracking-wide'>
                            {step.level}
                          </span>
                          <span>
                            {new Date(step.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className='mt-1 text-gray-200'>{step.message}</p>
                        {step.metadata ? (
                          <div className='mt-2'>
                            <Button
                              type='button'
                              className='text-[10px] uppercase tracking-wide text-slate-400 hover:text-slate-200'
                              onClick={() =>
                                setExpandedAuditIds((prev: Record<string, boolean>) => ({
                                  ...prev,
                                  [step.id]: !prev[step.id],
                                }))
                              }
                            >
                              {expandedAuditIds[step.id]
                                ? 'Hide metadata'
                                : 'Show metadata'}
                            </Button>
                            {expandedAuditIds[step.id] ? (
                              <pre className='mt-2 whitespace-pre-wrap rounded-md border border-border bg-gray-900 p-2 text-[10px] text-gray-300'>
                                {JSON.stringify(step.metadata, null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value='logs' className='mt-4'>
              <div className='rounded-md border border-border bg-card p-3 text-xs text-gray-300'>
                <p className='text-[11px] text-gray-500'>Logs</p>
                <div className='mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                  {agentBrowserLogs.length === 0 ? (
                    <p className='text-gray-500'>No logs yet.</p>
                  ) : (
                    agentBrowserLogs.map((log: AgentBrowserLog) => (
                      <p key={log.id}>
                            [{log.level}] {log.message}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value='context' className='mt-4'>
              <div className='rounded-md border border-border bg-card p-3 text-xs text-gray-300'>
                <p className='text-[11px] text-gray-500'>Planner context</p>
                {latestPlannerContext ? (
                  <div className='mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                    <pre className='whitespace-pre-wrap break-words'>
                      {JSON.stringify(latestPlannerContext, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className='mt-2 text-gray-500'>
                        No planner context captured yet.
                  </p>
                )}
              </div>
              <div className='mt-4 rounded-md border border-border bg-card p-3 text-xs text-gray-300'>
                <p className='text-[11px] text-gray-500'>Session context</p>
                {latestSessionContext ? (
                  <div className='mt-2 space-y-3'>
                    <div className='rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                      <p className='text-[10px] uppercase tracking-wide text-gray-500'>
                            Cookies
                      </p>
                      <div className='mt-1 max-h-36 overflow-y-auto'>
                        {(
                              latestSessionContext['cookies'] as
                                | Array<{
                                    name: string;
                                    domain: string;
                                    path: string;
                                    expires: number;
                                    httpOnly: boolean;
                                    secure: boolean;
                                    sameSite: string;
                                    valueLength: number;
                                  }>
                                | undefined
                        )?.map((cookie: {
                                name: string;
                                domain: string;
                                path: string;
                                expires: number;
                                httpOnly: boolean;
                                secure: boolean;
                                sameSite: string;
                                valueLength: number;
                              }, index: number) => (
                          <div
                            key={`${cookie.name}-${index}`}
                            className='mt-1'
                          >
                            <span className='text-slate-100'>
                              {cookie.name}
                            </span>{' '}
                            <span className='text-gray-500'>
                              {cookie.domain}
                            </span>
                            <span className='ml-2 text-gray-500'>
                                  len {cookie.valueLength}
                            </span>
                          </div>
                        )) ?? (
                          <p className='text-gray-500'>
                                No cookies captured.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className='rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                      <p className='text-[10px] uppercase tracking-wide text-gray-500'>
                            Storage keys
                      </p>
                      <div className='mt-1 text-gray-300'>
                        <p>
                              Local:{' '}
                          {(
                                latestSessionContext['storage'] as {
                                  localCount?: number;
                                }
                          )?.localCount ?? 0}
                          {' · '}
                              Session:{' '}
                          {(
                                latestSessionContext['storage'] as {
                                  sessionCount?: number;
                                }
                          )?.sessionCount ?? 0}
                        </p>
                        <div className='mt-1 max-h-20 overflow-y-auto text-[10px] text-gray-400'>
                          {(
                                latestSessionContext['storage'] as {
                                  localKeys?: string[];
                                  sessionKeys?: string[];
                                }
                          )?.localKeys?.join(', ') ||
                                'No localStorage keys.'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className='mt-2 text-gray-500'>
                        No session context captured yet.
                  </p>
                )}
              </div>
            </TabsContent>
            <TabsContent value='elements' className='mt-4'>
              <div className='rounded-md border border-border bg-card p-3 text-xs text-gray-300'>
                <p className='text-[11px] text-gray-500'>
                      Login candidates
                </p>
                {latestLoginCandidates ? (
                  <div className='mt-2 grid gap-3 md:grid-cols-2'>
                    <div className='rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                      <p className='text-[10px] uppercase tracking-wide text-gray-500'>
                            Inputs
                      </p>
                      <div className='mt-1 max-h-36 space-y-1 overflow-y-auto'>
                        {(
                              latestLoginCandidates['inputs'] as
                                | Array<{
                                    tag: string;
                                    id: string | null;
                                    name: string | null;
                                    type: string | null;
                                    placeholder: string | null;
                                    ariaLabel: string | null;
                                    score: number;
                                  }>
                                | undefined
                        )?.map((input: {
                                tag: string;
                                id: string | null;
                                name: string | null;
                                type: string | null;
                                placeholder: string | null;
                                ariaLabel: string | null;
                                score: number;
                              }, index: number) => (
                          <div key={`${input.name}-${index}`}>
                            <span className='text-slate-100'>
                              {input.name ||
                                    input.id ||
                                    input.type ||
                                    'input'}
                            </span>{' '}
                            <span className='text-gray-500'>
                                  score {input.score}
                            </span>
                          </div>
                        )) ?? (
                          <p className='text-gray-500'>
                                No inputs captured.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className='rounded-md border border-border bg-gray-900 p-2 text-[11px] text-gray-200'>
                      <p className='text-[10px] uppercase tracking-wide text-gray-500'>
                            Buttons
                      </p>
                      <div className='mt-1 max-h-36 space-y-1 overflow-y-auto'>
                        {(
                              latestLoginCandidates['buttons'] as
                                | Array<{
                                    tag: string;
                                    id: string | null;
                                    name: string | null;
                                    type: string | null;
                                    text: string | null;
                                    score: number;
                                  }>
                                | undefined
                        )?.map((button: {
                                tag: string;
                                id: string | null;
                                name: string | null;
                                type: string | null;
                                text: string | null;
                                score: number;
                              }, index: number) => (
                          <div key={`${button.text}-${index}`}>
                            <span className='text-slate-100'>
                              {button.text ||
                                    button.id ||
                                    button.name ||
                                    'button'}
                            </span>{' '}
                            <span className='text-gray-500'>
                                  score {button.score}
                            </span>
                          </div>
                        )) ?? (
                          <p className='text-gray-500'>
                                No buttons captured.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className='mt-2 text-gray-500'>
                        No candidate elements captured yet.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SharedModal>
      ) : null}
    </div>
  );
}
