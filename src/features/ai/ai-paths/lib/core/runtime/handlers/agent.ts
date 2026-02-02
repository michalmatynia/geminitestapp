import {
  coerceInput,
  formatRuntimeValue,
  parseJsonSafe,
} from "../../utils";
import { buildPromptOutput, coercePayloadObject } from "../utils";
import type { RuntimePortValues } from "@/shared/types/ai-paths";
import type { NodeHandler, NodeHandlerContext } from "@/shared/types/ai-paths-runtime";
import type { AgentPersona } from "@/features/ai/agentcreator/types";
import {
  AGENT_PERSONA_SETTINGS_KEY,
  DEFAULT_AGENT_PERSONA_SETTINGS,
} from "@/features/ai/agentcreator/constants/personas";
import type { AgentEnqueuePayload } from "../../../api";
import { agentApi, settingsApi } from "../../../api";

type AgentRunRecord = {
  id?: string;
  status?: string;
  errorMessage?: string | null;
  logLines?: string[];
  planState?: unknown;
};

const parseAgentPersonas = (value: unknown): AgentPersona[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value as AgentPersona[];
  }
  if (typeof value === "string") {
    const parsed = parseJsonSafe(value);
    return Array.isArray(parsed) ? (parsed as AgentPersona[]) : [];
  }
  return [];
};

const fetchAgentPersonas = async (): Promise<AgentPersona[]> => {
  const response = await settingsApi.list();
  if (!response.ok) return [];
  const record = response.data.find((item: { key: string }) => item.key === AGENT_PERSONA_SETTINGS_KEY);
  if (!record) return [];
  return parseAgentPersonas(record.value);
};

const pollAgentRun = async (
  runId: string,
  options?: { intervalMs?: number; maxAttempts?: number }
): Promise<{ run?: AgentRunRecord; status?: string }> => {
  const maxAttempts = options?.maxAttempts ?? 60;
  const intervalMs = options?.intervalMs ?? 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await agentApi.poll(runId);
    if (!response.ok) {
      throw new Error(response.error || "Failed to poll agent run.");
    }
    const run = response.data.run as AgentRunRecord | undefined;
    const status = run?.status ?? "";
    if (status === "completed") {
      return { run: run!, status };
    }
    if (status === "failed" || status === "stopped") {
      throw new Error(run?.errorMessage || "Agent run failed.");
    }
    if (status === "waiting_human") {
      return { run: run!, status };
    }
    if (attempt < maxAttempts - 1) {
      await new Promise<void>((resolve: (value: void | PromiseLike<void>) => void) => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error("Agent run timed out.");
};

export const handleAgent: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  skipAiJobs,
  executed,
  toast,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (skipAiJobs) {
    return prevOutputs;
  }
  if (executed.ai.has(node.id)) return prevOutputs;

  const agentConfig = node.config?.agent ?? {
    personaId: "",
    promptTemplate: "",
    waitForResult: true,
  };

  const template = agentConfig.promptTemplate?.trim();
  const promptFromTemplate = template
    ? buildPromptOutput({ template }, nodeInputs).promptOutput
    : "";
  const rawPrompt =
    template?.length
      ? promptFromTemplate
      : coerceInput(nodeInputs.prompt) ??
        coerceInput(nodeInputs.value) ??
        coerceInput(nodeInputs.result) ??
        coerceInput(nodeInputs.bundle) ??
        coerceInput(nodeInputs.context) ??
        coerceInput(nodeInputs.entityJson) ??
        coerceInput(nodeInputs.title) ??
        coerceInput(nodeInputs.content_en);

  const prompt =
    typeof rawPrompt === "string"
      ? rawPrompt.trim()
      : formatRuntimeValue(rawPrompt);

  if (!prompt || prompt === "—") {
    return prevOutputs;
  }

  let personas: AgentPersona[] = [];
  try {
    personas = await fetchAgentPersonas();
  } catch {
    personas = [];
  }
  const persona =
    agentConfig.personaId
      ? personas.find((item: { id: string }) => item.id === agentConfig.personaId)
      : undefined;
  const settings = persona?.settings ?? DEFAULT_AGENT_PERSONA_SETTINGS;

  const payload: AgentEnqueuePayload = {
    prompt,
    ...(settings.executorModel ? { model: settings.executorModel } : {}),
    ...(settings.plannerModel ? { plannerModel: settings.plannerModel } : {}),
    ...(settings.selfCheckModel ? { selfCheckModel: settings.selfCheckModel } : {}),
    ...(settings.extractionValidationModel
      ? { extractionValidationModel: settings.extractionValidationModel }
      : {}),
    ...(settings.toolRouterModel ? { toolRouterModel: settings.toolRouterModel } : {}),
    ...(settings.memoryValidationModel
      ? { memoryValidationModel: settings.memoryValidationModel }
      : {}),
    ...(settings.memorySummarizationModel
      ? { memorySummarizationModel: settings.memorySummarizationModel }
      : {}),
    ...(settings.loopGuardModel ? { loopGuardModel: settings.loopGuardModel } : {}),
    ...(settings.approvalGateModel ? { approvalGateModel: settings.approvalGateModel } : {}),
    ...(settings.selectorInferenceModel
      ? { selectorInferenceModel: settings.selectorInferenceModel }
      : {}),
    ...(settings.outputNormalizationModel
      ? { outputNormalizationModel: settings.outputNormalizationModel }
      : {}),
  };

  let runId: string | undefined;
  try {
    const enqueueResult = await agentApi.enqueue(payload);
    if (!enqueueResult.ok) {
      throw new Error(enqueueResult.error || "Failed to enqueue agent run.");
    }
    runId = enqueueResult.data.runId;
    executed.ai.add(node.id);
    toast("Agent run queued.", { variant: "success" });

    if (agentConfig.waitForResult === false) {
      return {
        jobId: runId,
        status: enqueueResult.data.status ?? "queued",
        bundle: {
          runId,
          status: enqueueResult.data.status ?? "queued",
          personaId: persona?.id ?? null,
          personaName: persona?.name ?? null,
          model: settings.executorModel ?? null,
        },
      };
    }

    const { run, status } = await pollAgentRun(runId);
    const planState =
      run?.planState && typeof run.planState === "object"
        ? (run.planState as Record<string, unknown>)
        : coercePayloadObject(run?.planState) ?? null;
    const checkpointBrief =
      typeof planState?.checkpointBrief === "string"
        ? planState.checkpointBrief
        : "";
    const logLines = Array.isArray(run?.logLines) ? run?.logLines : [];
    const lastLog =
      logLines.length > 0 ? logLines[logLines.length - 1] ?? "" : "";
    const result = checkpointBrief || lastLog || run?.errorMessage || "";

    return {
      result,
      jobId: runId,
      status: status ?? run?.status ?? "completed",
      bundle: {
        runId,
        status: status ?? run?.status ?? "completed",
        personaId: persona?.id ?? null,
        personaName: persona?.name ?? null,
        model: settings.executorModel ?? null,
        run,
      },
    };
  } catch (error) {
    reportAiPathsError(
      error,
      { action: "agentRun", nodeId: node.id },
      "Agent run failed:"
    );
    toast("Agent run failed.", { variant: "error" });
    executed.ai.add(node.id);
    return {
      result: "",
      jobId: runId,
      status: "failed",
      bundle: {
        runId,
        status: "failed",
        personaId: persona?.id ?? null,
        personaName: persona?.name ?? null,
        model: settings.executorModel ?? null,
      },
    };
  }
};
