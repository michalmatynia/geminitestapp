import {
  coerceInput,
  coerceInputArray,
  formatRuntimeValue,
  renderTemplate,
} from "../../utils";
import {
  buildPromptOutput,
  extractImageUrls,
  pollGraphJob,
  resolveJobProductId,
} from "../utils";
import type { NodeHandler } from "@/shared/types/ai-paths-runtime";
import { aiJobsApi, aiGenerationApi } from "../../../api";

export const handleTemplate: NodeHandler = ({ node, nodeInputs }) => {
  const templateConfig = node.config?.template ?? { template: "" };
  const data = { ...nodeInputs };
  const currentValue = coerceInput(nodeInputs.value) ?? "";
  const prompt = templateConfig.template
    ? renderTemplate(
        templateConfig.template,
        data as Record<string, unknown>,
        currentValue
      )
    : Object.entries(nodeInputs)
        .map(([key, value]) => `${key}: ${formatRuntimeValue(value)}`)
        .join("\n");
  return { prompt: prompt || "Prompt: (no template)" };
};

export const handlePrompt: NodeHandler = ({ node, nodeInputs }) => {
  const { promptOutput, imagesValue } = buildPromptOutput(
    node.config?.prompt,
    nodeInputs
  );
  return imagesValue !== undefined
    ? { prompt: promptOutput, images: imagesValue }
    : { prompt: promptOutput };
};

export const handleModel: NodeHandler = async ({ 
  node,
  nodeInputs,
  prevOutputs,
  allOutputs,
  allInputs,
  edges,
  nodes,
  activePathId,
  simulationEntityType,
  simulationEntityId,
  skipAiJobs,
  executed,
  toast,
  reportAiPathsError,
}) => {
  if (skipAiJobs) {
    return prevOutputs;
  }
  const promptInputs = coerceInputArray(nodeInputs.prompt);
  const promptCandidates = edges
    .filter((edge) => edge.to === node.id && edge.toPort === "prompt")
    .map((edge) => ({
      edge,
      fromNode: nodes.find((item) => item.id === edge.from),
      value: allOutputs[edge.from]?.[edge.fromPort ?? "prompt"],
    }))
    .filter((entry) => entry.fromNode?.type === "prompt");
  const promptEdge = promptCandidates.find(
    (entry) =>
      entry.value !== undefined &&
      entry.value !== null &&
      (typeof entry.value !== "string" || entry.value.trim() !== "")
  );
  const promptSourceNode = promptCandidates[0]?.fromNode ?? null;
  const hasMeaningfulValue = (value: unknown) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  };
  if (promptSourceNode) {
    const upstreamEdges = edges.filter((edge) => edge.to === promptSourceNode.id);
    if (upstreamEdges.length > 0) {
      const promptSourceInputs = allInputs[promptSourceNode.id] ?? {};
      const hasInputValue = Object.values(promptSourceInputs).some(
        hasMeaningfulValue
      );
      if (!hasInputValue) {
        return prevOutputs;
      }
    }
  }
  const promptSourceInputs = promptSourceNode
    ? (allInputs[promptSourceNode.id] ?? {})
    : {};
  const derivedPrompt = promptSourceNode
    ? buildPromptOutput(promptSourceNode.config?.prompt, promptSourceInputs)
    : null;
  const promptSourceOutput = promptSourceNode
    ? derivedPrompt?.promptOutput ?? allOutputs[promptSourceNode.id]?.prompt
    : undefined;
  const promptInput =
    promptSourceOutput ??
    promptEdge?.value ??
    [...promptInputs]
      .reverse()
      .find((value) => {
        if (value === undefined || value === null) return false;
        if (typeof value === "string") return Boolean(value.trim());
        return true;
      });
  if (promptInput === undefined || promptInput === null) {
    return prevOutputs;
  }
  if (executed.ai.has(node.id)) return prevOutputs;
  const modelConfig = node.config?.model ?? {
    modelId: "gpt-4o",
    temperature: 0.7,
    maxTokens: 800,
    vision: node.inputs.includes("images"),
  };
  const hasResultConsumers = edges.some(
    (edge) =>
      edge.from === node.id &&
      (edge.fromPort === "result" ||
        (edge.fromPort === undefined && edge.toPort === "result"))
  );
  const hasPollConsumer = edges.some((edge) => {
    if (edge.from !== node.id) return false;
    if (edge.fromPort && edge.fromPort !== "jobId") return false;
    const targetNode = nodes.find((item) => item.id === edge.to);
    return targetNode?.type === "poll";
  });
  const waitPreference = modelConfig.waitForResult;
  let shouldWait = !hasPollConsumer && (waitPreference ?? hasResultConsumers);
  if (!hasPollConsumer && waitPreference === false && hasResultConsumers) {
    shouldWait = true;
  }
  if (waitPreference === true) {
    shouldWait = true;
  }
  const prompt =
    typeof promptInput === "string"
      ? promptInput.trim()
      : formatRuntimeValue(promptInput);
  if (!prompt || prompt === "—") {
    return prevOutputs;
  }
  const imageEdge = edges
    .filter((edge) => edge.to === node.id && edge.toPort === "images")
    .map((edge) => ({
      edge,
      fromNode: nodes.find((item) => item.id === edge.from),
      value: allOutputs[edge.from]?.[edge.fromPort ?? "images"],
    }))
    .find(
      (entry) =>
        entry.fromNode?.type === "prompt" &&
        entry.value !== undefined &&
        entry.value !== null
    );
  const promptImageOutput = promptSourceNode?.id
    ? derivedPrompt?.imagesValue ?? allOutputs[promptSourceNode.id]?.images
    : undefined;
  const imageSource =
    promptImageOutput ??
    imageEdge?.value ??
    nodeInputs.images ??
    nodeInputs.bundle ??
    nodeInputs.context ??
    nodeInputs.entityJson ??
    nodeInputs.value ??
    nodeInputs.result;
  const imageUrls = extractImageUrls(imageSource);
  const payload = {
    prompt,
    imageUrls,
    modelId: modelConfig.modelId,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
    vision: modelConfig.vision,
    source: "ai_paths",
    graph: {
      pathId: activePathId ?? undefined,
      nodeId: node.id,
      nodeTitle: node.title,
    },
  };
  const productId = resolveJobProductId(nodeInputs, simulationEntityType, simulationEntityId, activePathId);
  let enqueuedJobId: string | undefined;
  try {
    const enqueueResult = await aiJobsApi.enqueue({
      productId,
      type: "graph_model",
      payload,
    });
    if (!enqueueResult.ok) {
      throw new Error(enqueueResult.error || "Failed to enqueue AI job.");
    }
    enqueuedJobId = enqueueResult.data.jobId;
    toast("AI model job queued.", { variant: "success" });
    executed.ai.add(node.id);
    if (!shouldWait) {
      return {
        jobId: enqueueResult.data.jobId,
        status: "queued",
        debugPayload: payload,
      };
    }
    const result = await pollGraphJob(enqueueResult.data.jobId);
    return {
      result,
      jobId: enqueueResult.data.jobId,
      status: "completed",
      debugPayload: payload,
    };
  } catch (error) {
    reportAiPathsError(
      error,
      { action: "graphModel", nodeId: node.id },
      "AI model job failed:"
    );
    toast("AI model job failed.", { variant: "error" });
    executed.ai.add(node.id);
    return {
      result: "",
      jobId: enqueuedJobId,
      status: "failed",
      debugPayload: payload,
    };
  }
};

export const handleAiDescription: NodeHandler = async ({ 
  node,
  nodeInputs,
  executed,
  reportAiPathsError,
}) => {
  if (executed.ai.has(node.id)) return {};
  const entityJson = coerceInput(nodeInputs.entityJson) as
    | Record<string, unknown>
    | undefined;
  if (!entityJson) {
    return {};
  }
  const rawImages =
    (coerceInput(nodeInputs.images) as unknown[] | undefined) ??
    (entityJson.imageLinks as unknown[] | undefined) ??
    (entityJson.images as unknown[] | undefined) ??
    [];
  const imageUrls = rawImages
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const url = (item as { url?: string }).url;
        if (typeof url === "string") return url;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
  const body = {
    productData: entityJson,
    imageUrls,
    visionOutputEnabled: node.config?.description?.visionOutputEnabled,
    generationOutputEnabled: node.config?.description?.generationOutputEnabled,
  };
  try {
    const result = await aiGenerationApi.generateDescription(body);
    if (!result.ok) {
      throw new Error("AI description generation failed.");
    }
    executed.ai.add(node.id);
    return { description_en: result.data.description ?? "" };
  } catch (error) {
    reportAiPathsError(
      error,
      { action: "aiDescription", nodeId: node.id },
      "AI description failed:"
    );
    return { description_en: "" };
  }
};

export const handleDescriptionUpdater: NodeHandler = async ({ 
  node,
  nodeInputs,
  executed,
  reportAiPathsError,
}) => {
  if (executed.updater.has(node.id)) return {};
  const productId = nodeInputs.productId as string | undefined;
  const description = nodeInputs.description_en as string | undefined;
  if (!productId || !description) {
    return {};
  }
  const updateResult = await aiGenerationApi.updateProductDescription(productId, description);
  executed.updater.add(node.id);
  if (!updateResult.ok) {
    reportAiPathsError(
      new Error(updateResult.error),
      { action: "updateDescription", productId, nodeId: node.id },
      "Failed to update description:"
    );
  }
  return { description_en: description };
};
