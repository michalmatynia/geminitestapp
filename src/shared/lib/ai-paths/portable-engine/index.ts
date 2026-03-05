import { z } from 'zod';

import {
  type Edge,
  type GraphCompileReport,
  type PathConfig,
  pathConfigSchema,
} from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import {
  type CanvasSemanticDocument,
  canvasSemanticDocumentSchema,
} from '@/shared/contracts/ai-paths-semantic-grammar';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import type { EvaluateGraphOptions } from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';
import { evaluateGraphClient } from '@/shared/lib/ai-paths/core/runtime/engine-client';
import {
  parseAndDeserializeSemanticCanvas,
  serializePathConfigToSemanticCanvas,
} from '@/shared/lib/ai-paths/core/semantic-grammar';
import { compileGraph } from '@/shared/lib/ai-paths/core/utils/graph';
import {
  repairPathNodeIdentities,
  type PathIdentityRepairWarning,
  type PathIdentityValidationIssue,
  validateCanonicalPathNodeIdentities,
} from '@/shared/lib/ai-paths/core/utils/node-identity';

export const AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION = 'ai-paths.portable-engine.v1' as const;

export const aiPathPortablePackageSchema = z.object({
  specVersion: z.literal(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION),
  kind: z.literal('path_package'),
  createdAt: z.string(),
  pathId: z.string().optional(),
  name: z.string().optional(),
  document: canvasSemanticDocumentSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AiPathPortablePackage = z.infer<typeof aiPathPortablePackageSchema>;

export type PortablePathInputSource = 'portable_package' | 'semantic_canvas' | 'path_config';

export type ResolvePortablePathInputOptions = {
  repairIdentities?: boolean;
  includeConnections?: boolean;
};

export type ResolvedPortablePathInput = {
  source: PortablePathInputSource;
  pathConfig: PathConfig;
  semanticDocument: CanvasSemanticDocument;
  portablePackage: AiPathPortablePackage | null;
  identityRepaired: boolean;
  identityWarnings: PathIdentityRepairWarning[];
};

export type ResolvePortablePathInputResult =
  | { ok: true; value: ResolvedPortablePathInput }
  | { ok: false; error: string };

export type BuildPortablePathPackageOptions = {
  createdAt?: string;
  exporterVersion?: string;
  workspace?: string;
  includeConnections?: boolean;
  metadata?: Record<string, unknown>;
};

export type PortablePathValidationReport = {
  ok: boolean;
  pathConfig: PathConfig;
  identityIssues: PathIdentityValidationIssue[];
  compileReport: GraphCompileReport;
};

export type ValidatePortablePathInputResult =
  | {
      ok: true;
      value: PortablePathValidationReport & {
        resolved: ResolvedPortablePathInput;
      };
    }
  | { ok: false; error: string };

export type PortablePathRunOptions = Omit<EvaluateGraphOptions, 'reportAiPathsError'> & {
  validateBeforeRun?: boolean;
  repairIdentities?: boolean;
  reportAiPathsError?: EvaluateGraphOptions['reportAiPathsError'];
};

export type PortablePathRunResult = {
  resolved: ResolvedPortablePathInput;
  validation: PortablePathValidationReport | null;
  runtimeState: RuntimeState;
};

const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join('.') || 'document'}: ${issue.message}`)
    .join('; ');

const decodePortablePayload = (input: unknown): { ok: true; value: unknown } | { ok: false; error: string } => {
  if (typeof input !== 'string') {
    return { ok: true, value: input };
  }
  try {
    return { ok: true, value: JSON.parse(input) as unknown };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Invalid JSON payload: ${message}` };
  }
};

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveEdgePort = (
  edge: Edge,
  canonicalKey: 'fromPort' | 'toPort',
  aliasKey: 'sourceHandle' | 'targetHandle'
): string | null | undefined => {
  const canonicalValue = edge[canonicalKey];
  const aliasValue = edge[aliasKey];
  const candidate = canonicalValue !== undefined ? canonicalValue : aliasValue;
  if (candidate === undefined) return undefined;
  if (candidate === null) return null;
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePathConfigEdgeAliases = (pathConfig: PathConfig): PathConfig => {
  let changed = false;
  const nextEdges = (pathConfig.edges ?? []).map((edge: Edge): Edge => {
    const resolvedFrom = asTrimmedString(edge.from) ?? asTrimmedString(edge.source);
    const resolvedTo = asTrimmedString(edge.to) ?? asTrimmedString(edge.target);
    const resolvedFromPort = resolveEdgePort(edge, 'fromPort', 'sourceHandle');
    const resolvedToPort = resolveEdgePort(edge, 'toPort', 'targetHandle');

    const edgeChanged =
      (resolvedFrom !== undefined && resolvedFrom !== edge.from) ||
      (resolvedTo !== undefined && resolvedTo !== edge.to) ||
      (resolvedFromPort !== undefined && resolvedFromPort !== edge.fromPort) ||
      (resolvedToPort !== undefined && resolvedToPort !== edge.toPort);

    if (!edgeChanged) return edge;
    changed = true;

    return {
      ...edge,
      ...(resolvedFrom !== undefined ? { from: resolvedFrom } : {}),
      ...(resolvedTo !== undefined ? { to: resolvedTo } : {}),
      ...(resolvedFromPort !== undefined ? { fromPort: resolvedFromPort } : {}),
      ...(resolvedToPort !== undefined ? { toPort: resolvedToPort } : {}),
    };
  });

  return changed
    ? {
        ...pathConfig,
        edges: nextEdges,
      }
    : pathConfig;
};

const finalizeResolvedPath = ({
  source,
  pathConfig,
  portablePackage,
  options,
}: {
  source: PortablePathInputSource;
  pathConfig: PathConfig;
  portablePackage: AiPathPortablePackage | null;
  options?: ResolvePortablePathInputOptions;
}): ResolvePortablePathInputResult => {
  const normalizedPath = normalizePathConfigEdgeAliases(pathConfig);
  const repaired =
    options?.repairIdentities === false
      ? { config: normalizedPath, changed: false, warnings: [] as PathIdentityRepairWarning[] }
      : repairPathNodeIdentities(normalizedPath, { palette });

  const semanticDocument = serializePathConfigToSemanticCanvas(repaired.config, {
    includeConnections: options?.includeConnections !== false,
  });

  return {
    ok: true,
    value: {
      source,
      pathConfig: repaired.config,
      semanticDocument,
      portablePackage,
      identityRepaired: repaired.changed,
      identityWarnings: repaired.warnings,
    },
  };
};

export const resolvePortablePathInput = (
  input: unknown,
  options?: ResolvePortablePathInputOptions
): ResolvePortablePathInputResult => {
  const decoded = decodePortablePayload(input);
  if (!decoded.ok) return decoded;

  const packageParsed = aiPathPortablePackageSchema.safeParse(decoded.value);
  if (packageParsed.success) {
    const deserialized = parseAndDeserializeSemanticCanvas(packageParsed.data.document);
    if (!deserialized.ok) {
      return {
        ok: false,
        error: `Portable package contains invalid semantic canvas document: ${deserialized.error}`,
      };
    }
    return finalizeResolvedPath({
      source: 'portable_package',
      pathConfig: deserialized.value,
      portablePackage: packageParsed.data,
      options,
    });
  }

  const semanticParsed = parseAndDeserializeSemanticCanvas(decoded.value);
  if (semanticParsed.ok) {
    return finalizeResolvedPath({
      source: 'semantic_canvas',
      pathConfig: semanticParsed.value,
      portablePackage: null,
      options,
    });
  }

  const pathConfigParsed = pathConfigSchema.safeParse(decoded.value);
  if (pathConfigParsed.success) {
    return finalizeResolvedPath({
      source: 'path_config',
      pathConfig: pathConfigParsed.data,
      portablePackage: null,
      options,
    });
  }

  return {
    ok: false,
    error: [
      'Input does not match a supported AI-Path payload.',
      `portable package parse error: ${formatZodError(packageParsed.error)}`,
      `semantic canvas parse error: ${semanticParsed.error}`,
      `path config parse error: ${formatZodError(pathConfigParsed.error)}`,
    ].join(' '),
  };
};

export const buildPortablePathPackage = (
  pathConfig: PathConfig,
  options?: BuildPortablePathPackageOptions
): AiPathPortablePackage => {
  const createdAt = options?.createdAt ?? new Date().toISOString();
  const semanticDocument = serializePathConfigToSemanticCanvas(pathConfig, {
    includeConnections: options?.includeConnections !== false,
    exportedAt: createdAt,
    exporterVersion: options?.exporterVersion,
    workspace: options?.workspace,
  });
  return {
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'path_package',
    createdAt,
    pathId: pathConfig.id,
    name: pathConfig.name,
    document: semanticDocument,
    ...(options?.metadata ? { metadata: options.metadata } : {}),
  };
};

export const serializePortablePathPackage = (
  pathConfig: PathConfig,
  options?: BuildPortablePathPackageOptions
): string => JSON.stringify(buildPortablePathPackage(pathConfig, options), null, 2);

export const validatePortablePathConfig = (pathConfig: PathConfig): PortablePathValidationReport => {
  const identityIssues = validateCanonicalPathNodeIdentities(pathConfig, { palette });
  const compileReport = compileGraph(pathConfig.nodes, pathConfig.edges);
  return {
    ok: identityIssues.length === 0 && compileReport.ok,
    pathConfig,
    identityIssues,
    compileReport,
  };
};

export const validatePortablePathInput = (
  input: unknown,
  options?: ResolvePortablePathInputOptions
): ValidatePortablePathInputResult => {
  const resolved = resolvePortablePathInput(input, options);
  if (!resolved.ok) return resolved;
  const validation = validatePortablePathConfig(resolved.value.pathConfig);
  return {
    ok: true,
    value: {
      ...validation,
      resolved: resolved.value,
    },
  };
};

const formatValidationErrorMessage = (validation: PortablePathValidationReport): string => {
  if (validation.identityIssues.length > 0) {
    return `Portable path identity validation failed: ${validation.identityIssues[0]?.message ?? 'invalid identities'}`;
  }
  const firstCompileError = validation.compileReport.findings.find(
    (finding): boolean => finding.severity === 'error'
  );
  if (firstCompileError) {
    return `Portable path compile validation failed: ${firstCompileError.message}`;
  }
  return 'Portable path validation failed.';
};

export class PortablePathValidationError extends Error {
  readonly report: PortablePathValidationReport;

  constructor(report: PortablePathValidationReport) {
    super(formatValidationErrorMessage(report));
    this.name = 'PortablePathValidationError';
    this.report = report;
  }
}

export const runPortablePathClient = async (
  input: unknown,
  options: PortablePathRunOptions = {}
): Promise<PortablePathRunResult> => {
  const {
    validateBeforeRun = true,
    repairIdentities = true,
    reportAiPathsError,
    ...engineOptions
  } = options;
  const resolved = resolvePortablePathInput(input, { repairIdentities });
  if (!resolved.ok) {
    throw new Error(`Invalid AI-Path payload: ${resolved.error}`);
  }

  const validation = validateBeforeRun ? validatePortablePathConfig(resolved.value.pathConfig) : null;
  if (validation && !validation.ok) {
    throw new PortablePathValidationError(validation);
  }

  const runtimeState = await evaluateGraphClient({
    nodes: resolved.value.pathConfig.nodes,
    edges: resolved.value.pathConfig.edges,
    ...engineOptions,
    reportAiPathsError: reportAiPathsError ?? (() => {}),
  });

  return {
    resolved: resolved.value,
    validation,
    runtimeState,
  };
};
