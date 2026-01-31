import {
  cloneValue,
  coerceInput,
  getValueAtMappingPath,
  normalizeMappingPath,
  renderTemplate,
  setValueAtMappingPath,
} from "../../utils";
import { buildFallbackEntity, resolveContextPayload } from "../utils";
import type { NodeHandler, NodeHandlerContext } from "@/shared/types/ai-paths-runtime";
import type { RuntimePortValues } from "@/shared/types/ai-paths";

export const handleContext: NodeHandler = async ({
  node,
  nodeInputs,
  fetchEntityCached,
  now,
  simulationEntityId,
  simulationEntityType,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const rawContext = coerceInput(nodeInputs.context);
  const inputContext =
    rawContext && typeof rawContext === "object"
      ? (rawContext as Record<string, unknown>)
      : null;
  const payload = await resolveContextPayload(
    node.config?.context ?? { role: "entity" },
    inputContext,
    simulationEntityType,
    simulationEntityId,
    now,
    fetchEntityCached
  );
  const resolvedContext = {
    ...payload.context,
    source: (payload.context?.source as string | undefined) ?? node.title,
  };
  return {
    context: resolvedContext,
    entityId: payload.entityId,
    entityType: payload.entityType,
    entityJson: payload.scopedEntity,
  };
};

export const handleParser: NodeHandler = ({
  node,
  nodeInputs,
  resolvedEntity,
  fallbackEntityId,
}: NodeHandlerContext): RuntimePortValues => {
  const contextInput = coerceInput(nodeInputs.context);
  const contextEntity =
    contextInput && typeof contextInput === "object"
      ? ((contextInput as Record<string, unknown>).entity as
          | Record<string, unknown>
          | undefined) ??
        ((contextInput as Record<string, unknown>).entityJson as
          | Record<string, unknown>
          | undefined) ??
        ((contextInput as Record<string, unknown>).product as
          | Record<string, unknown>
          | undefined)
      : undefined;
  const source =
    (coerceInput(nodeInputs.entityJson) as Record<string, unknown> | undefined) ??
    contextEntity ??
    (resolvedEntity ?? undefined) ??
    (fallbackEntityId ? buildFallbackEntity(fallbackEntityId) : undefined);

  if (!source) {
    return {};
  }
  const parserConfig = node.config?.parser;
  const mappings = parserConfig?.mappings ?? {};
  const outputMode = parserConfig?.outputMode ?? "individual";
  const hasMappings = Object.keys(mappings).some((key: string): boolean => !!key.trim());
  const isEmptyValue = (value: unknown): boolean =>
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
  
  const fallbackForKey = (key: string): unknown => {
    const normalized = key.trim().toLowerCase();
    if (normalized === "title" || normalized === "name") {
      return (
        source["title"] ??
        source["name"] ??
        source["name_en"] ??
        source["name_pl"] ??
        source["label"] ??
        source["productName"]
      );
    }
    if (normalized === "images" || normalized === "imageurls") {
      return (
        source["images"] ??
        source["imageLinks"] ??
        source["media"] ??
        source["gallery"] ??
        source["imageFiles"] ??
        source["photos"]
      );
    }
    if (
      normalized === "productid" ||
      normalized === "entityid" ||
      normalized === "id"
    ) {
      return (
        source["id"] ??
        source["_id"] ??
        source["productId"] ??
        source["entityId"]
      );
    }
    if (normalized === "content_en" || normalized === "description_en") {
      return (
        source["content_en"] ??
        source["description_en"] ??
        source["description"] ??
        source["content"]
      );
    }
    return undefined;
  };

  const parsed: RuntimePortValues = {};
  Object.keys(mappings).forEach((output: string): void => {
    const key = output.trim();
    if (!key) return;
    const mapping = mappings[output]?.trim() ?? "";
    const value = mapping
      ? getValueAtMappingPath(source, mapping)
      : source[key];
    const resolved =
      isEmptyValue(value) ? fallbackForKey(key) ?? value : value;
    if (resolved !== undefined) {
      parsed[key] = resolved;
    }
  });

  if (outputMode === "bundle") {
    if (!hasMappings || Object.keys(parsed).length === 0) {
      const fullBundle =
        typeof source === "object" && source !== null ? source : {};
      return { bundle: fullBundle };
    }
    const extraOutputs = node.outputs.reduce<Record<string, unknown>>((acc: Record<string, unknown>, output: string): Record<string, unknown> => {
      if (output !== "bundle" && parsed[output] !== undefined) {
        acc[output] = parsed[output];
      }
      return acc;
    }, {});
    return { bundle: parsed, ...extraOutputs };
  } else {
    return parsed;
  }
};

export const handleMapper: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const contextValue = coerceInput(nodeInputs.context) as
    | Record<string, unknown>
    | undefined;
  if (!contextValue) {
    return {};
  }
  const mapperConfig = node.config?.mapper ?? {
    outputs: node.outputs,
    mappings: {},
  };
  const mapped: RuntimePortValues = {};
  mapperConfig.outputs.forEach((output: string): void => {
    const mapping = mapperConfig.mappings?.[output]?.trim() ?? "";
    const value = mapping
      ? getValueAtMappingPath(contextValue, mapping)
      : getValueAtMappingPath(contextValue, output);
    if (value !== undefined) {
      mapped[output] = value;
    }
  });
  return mapped;
};

export const handleMutator: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const contextValue = coerceInput(nodeInputs.context) as
    | Record<string, unknown>
    | undefined;
  if (!contextValue) {
    return {};
  }
  const mutatorConfig = node.config?.mutator ?? {
    path: "entity.title",
    valueTemplate: "{{value}}",
  };
  const targetPath = normalizeMappingPath(mutatorConfig.path ?? "", contextValue);
  if (!targetPath) {
    return { context: contextValue };
  }
  const currentValue = getValueAtMappingPath(contextValue, targetPath);
  const rendered = renderTemplate(
    mutatorConfig.valueTemplate ?? "{{value}}",
    { ...contextValue, ...nodeInputs } as Record<string, unknown>,
    currentValue
  );
  const updated = cloneValue(contextValue);
  setValueAtMappingPath(updated, targetPath, rendered);
  return { context: updated };
};

export const handleValidator: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const contextValue = coerceInput(nodeInputs.context) as
    | Record<string, unknown>
    | undefined;
  if (!contextValue) {
    return {};
  }
  const validatorConfig = node.config?.validator ?? {
    requiredPaths: ["entity.id"],
    mode: "all",
  };
  const required = (validatorConfig.requiredPaths ?? []).map((path: string): string | null =>
    normalizeMappingPath(path, contextValue)
  );
  const missing = required.filter((path: string | null): boolean => {
    if (!path) return false;
    const value = getValueAtMappingPath(contextValue, path);
    if (value === undefined || value === null) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    return false;
  });
  const valid =
    validatorConfig.mode === "any"
      ? missing.length < required.length
      : missing.length === 0;
  return {
    context: contextValue,
    valid,
    errors: missing as string[],
  };
};
