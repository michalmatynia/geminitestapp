import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type {
  GraphCompileFinding,
  GraphCompileReport,
} from './graph.types';
import { sanitizeEdges } from './graph.edges';
import { getNodeInputPortCardinality, getNodeInputPortContract } from './graph.nodes';
import { normalizePortName } from './graph.ports';
import { arePortTypesCompatible, getPortDataTypes } from './port-types';

export type CompileGraphOptions = {
  scopeMode?: 'full' | 'reachable_from_roots';
  scopeRootNodeIds?: string[];
};

export const compileGraph = (
  nodes: AiNode[],
  edges: Edge[],
  options: CompileGraphOptions = {}
): GraphCompileReport => {
  const findings: GraphCompileFinding[] = [];
  const normalizedEdges = sanitizeEdges(nodes, edges);
  
  const nodeMap = new Map(nodes.map((node: AiNode) => [node.id, node]));
  const adjacency = new Map<string, string[]>();
  const inverseAdjacency = new Map<string, string[]>();
  const edgeMap = new Map<string, Edge[]>(); // toNodeId -> edges
  const outgoingEdgeMap = new Map<string, Edge[]>(); // fromNodeId -> edges

  normalizedEdges.forEach((edge: Edge) => {
    if (!edge.from || !edge.to) return;
    
    const targets = adjacency.get(edge.from) ?? [];
    targets.push(edge.to);
    adjacency.set(edge.from, targets);

    const sources = inverseAdjacency.get(edge.to) ?? [];
    sources.push(edge.from);
    inverseAdjacency.set(edge.to, sources);

    const nodeEdges = edgeMap.get(edge.to) ?? [];
    nodeEdges.push(edge);
    edgeMap.set(edge.to, nodeEdges);

    const outgoingEdges = outgoingEdgeMap.get(edge.from) ?? [];
    outgoingEdges.push(edge);
    outgoingEdgeMap.set(edge.from, outgoingEdges);
  });

  const triggerNode = nodes.find((node: AiNode) => node.type === 'trigger');
  const triggerNodeId = triggerNode?.id ?? null;

  const processingNodeIds = nodes
    .filter((node: AiNode) => node.type !== 'trigger' && node.type !== 'viewer')
    .map((node: AiNode) => node.id);

  const terminalNodeIds = nodes
    .filter((node: AiNode) => {
      const targets = adjacency.get(node.id) ?? [];
      return targets.length === 0;
    })
    .map((node: AiNode) => node.id);

  // Scoping logic
  let reachableNodeIds = new Set<string>(nodes.map(n => n.id));
  if (options.scopeMode === 'reachable_from_roots' && options.scopeRootNodeIds) {
    reachableNodeIds = new Set<string>();
    const queue = [...options.scopeRootNodeIds];
    options.scopeRootNodeIds.forEach(id => reachableNodeIds.add(id));
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const targets = adjacency.get(current) ?? [];
      targets.forEach(target => {
        if (!reachableNodeIds.has(target)) {
          reachableNodeIds.add(target);
          queue.push(target);
        }
      });
    }
  }

  // 1. Fan-in validation
  nodes.forEach(node => {
    if (!reachableNodeIds.has(node.id)) return;
    const incomingEdges = edgeMap.get(node.id) ?? [];
    const portGroups = new Map<string, Edge[]>();
    incomingEdges.forEach(edge => {
      if (edge.toPort) {
        const group = portGroups.get(edge.toPort) ?? [];
        group.push(edge);
        portGroups.set(edge.toPort, group);
      }
    });

    portGroups.forEach((edges, port) => {
      if (edges.length > 1) {
        const cardinality = getNodeInputPortCardinality(node, port);
        if (cardinality === 'one') {
          findings.push({
            code: 'fan_in_single_port',
            severity: 'error',
            message: `Node "${node.title || node.id}" receives multiple inputs on single-cardinality port "${port}".`,
            nodeId: node.id,
            port,
          });
        }
      }
    });
  });

  // 2. Required input validation
  nodes.forEach(node => {
    if (!reachableNodeIds.has(node.id)) return;
    if (node.type === 'trigger') return;

    const incomingPorts = new Set((edgeMap.get(node.id) ?? []).map(e => e.toPort).filter(Boolean) as string[]);
    
    (node.inputs || []).forEach(port => {
      const contract = getNodeInputPortContract(node, port);
      if (contract.required && !incomingPorts.has(port)) {
        findings.push({
          code: 'required_input_missing_wiring',
          severity: 'error',
          message: `Node "${node.title || node.id}" is missing required input wiring for port "${port}".`,
          nodeId: node.id,
          port,
        });
      }
    });
  });

  // 3. Cycle detection (Simple DFS for cycles)
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const detectCycle = (u: string, path: string[]) => {
    visited.add(u);
    recStack.add(u);
    path.push(u);

    const neighbors = adjacency.get(u) ?? [];
    for (const v of neighbors) {
      if (!visited.has(v)) {
        detectCycle(v, path);
      } else if (recStack.has(v)) {
        // Cycle detected
        const cycleNodes = path.slice(path.indexOf(v));
        const firstId = cycleNodes[0]!;
        const secondId = cycleNodes[1]!;
        const isTriggerSimulationHandshake = cycleNodes.length === 2 && 
          ((nodeMap.get(firstId)?.type === 'trigger' && nodeMap.get(secondId)?.type === 'simulation') ||
           (nodeMap.get(secondId)?.type === 'trigger' && nodeMap.get(firstId)?.type === 'simulation'));

        const isAllowedLoop = cycleNodes.some(id => {
          const type = nodeMap.get(id)?.type;
          return type === 'iterator' || type === 'delay' || type === 'poll';
        });

        if (isTriggerSimulationHandshake) {
          findings.push({
            code: 'cycle_detected',
            severity: 'warning',
            message: 'Trigger/Simulation handshake loop detected. This pattern is supported but Trigger -> Fetcher -> Context Filter is preferred.',
            metadata: { legacyTriggerSimulationHandshake: true, nodeIds: cycleNodes }
          });
        } else if (isAllowedLoop) {
          findings.push({
            code: 'cycle_detected',
            severity: 'warning',
            message: `Detected a circular loop across ${cycleNodes.length} node(s). Fix: remove at least one loop edge.`,
            metadata: { nodeIds: cycleNodes }
          });

          // Also check for deadlock risk in loops
          const loopNodes = cycleNodes.map(id => nodeMap.get(id)).filter(Boolean) as AiNode[];
          const allWait = loopNodes.every(n => n.config?.runtime?.waitForInputs);
          if (allWait) {
            const anyExternalRequired = loopNodes.some(n => {
              const incomingFromOutside = (edgeMap.get(n.id) ?? []).filter(e => !cycleNodes.includes(e.from!));
              const ports = new Set(incomingFromOutside.map(e => e.toPort).filter(Boolean) as string[]);
              return (n.inputs || []).some(p => getNodeInputPortContract(n, p).required && ports.has(p));
            });
            if (!anyExternalRequired) {
              findings.push({
                code: 'cycle_wait_deadlock_risk',
                severity: 'warning',
                message: 'This loop contains only wait-for-inputs nodes with internal dependencies. Fix: provide at least one required input from outside the loop.',
                metadata: { nodeIds: cycleNodes }
              });
            }
          }
        } else {
          findings.push({
            code: 'unsupported_cycle',
            severity: 'error',
            message: 'Unsupported circular dependency detected. Circular loops are only allowed through Iterator, Delay, or Poll nodes.',
            metadata: { nodeIds: cycleNodes }
          });
        }
      }
    }

    recStack.delete(u);
    path.pop();
  };

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      detectCycle(node.id, []);
    }
  });

  // 4. Incompatible wiring
  const resolveNodeId = (primary?: string, fallback?: string): string | null => {
    const first = typeof primary === 'string' ? primary.trim() : '';
    if (first.length > 0) return first;
    const second = typeof fallback === 'string' ? fallback.trim() : '';
    return second.length > 0 ? second : null;
  };
  const resolvePort = (
    primary?: string | null,
    fallback?: string | null
  ): string | null => {
    const first = typeof primary === 'string' ? normalizePortName(primary) : '';
    if (first.length > 0) return first;
    const second = typeof fallback === 'string' ? normalizePortName(fallback) : '';
    return second.length > 0 ? second : null;
  };
  const compatibilityCheckedEdges = new Set<string>();
  edges.forEach((edge, edgeIndex) => {
    const fromId = resolveNodeId(edge.from, edge.source);
    const toId = resolveNodeId(edge.to, edge.target);
    const fromPort = resolvePort(edge.fromPort, edge.sourceHandle);
    const toPort = resolvePort(edge.toPort, edge.targetHandle);
    if (!fromId || !toId || !fromPort || !toPort) return;
    if (!reachableNodeIds.has(fromId) || !reachableNodeIds.has(toId)) return;
    const edgeKey = edge.id || `${fromId}:${fromPort}->${toId}:${toPort}:${edgeIndex}`;
    if (compatibilityCheckedEdges.has(edgeKey)) return;
    compatibilityCheckedEdges.add(edgeKey);

    const fromNode = nodeMap.get(fromId);
    const toNode = nodeMap.get(toId);
    if (!fromNode || !toNode) return;
    if (!fromNode.outputs.includes(fromPort) || !toNode.inputs.includes(toPort)) return;

    const fromTypes = getPortDataTypes(fromPort);
    const toTypes = getPortDataTypes(toPort);
    if (!arePortTypesCompatible(fromTypes, toTypes)) {
      const contract = getNodeInputPortContract(toNode, toPort);
      findings.push({
        code: contract.required ? 'incompatible_wiring' : 'optional_input_incompatible_wiring',
        severity: contract.required ? 'error' : 'warning',
        message: `Incompatible wiring: ${fromPort} -> ${toPort}`,
        edgeId: edge.id,
      });
    }
  });

  // 5. Context cache scope risk
  const contextBoundPorts = new Set(['context', 'entityid', 'entitytype', 'entityjson', 'productid']);
  nodes.forEach((node) => {
    if (!reachableNodeIds.has(node.id)) return;
    const cacheScope = node.config?.runtime?.cache?.scope;
    if (cacheScope !== 'session') return;
    const nodeHasContextInputs = (node.inputs || []).some((port) =>
      contextBoundPorts.has(normalizePortName(port).trim().toLowerCase())
    );
    if (node.type === 'fetcher' || node.type === 'context' || node.type === 'simulation' || nodeHasContextInputs) {
      findings.push({
        code: 'context_cache_scope_risk',
        severity: 'warning',
        message: `Node "${node.title || node.id}" uses session cache scope with context-bound inputs. Consider run-scoped cache to avoid stale context reuse.`,
        nodeId: node.id,
      });
    }
  });

  // 6. Trigger context resolution risk
  nodes.forEach(node => {
    if (node.type === 'trigger' && node.config?.trigger?.contextMode === 'simulation_required') {
      const incomingEdges = edgeMap.get(node.id) ?? [];
      const outgoingEdges = outgoingEdgeMap.get(node.id) ?? [];

      let hasSimulationSource = false;
      let hasManualOnlySimulation = false;
      let hasTriggerFetcherPath = false;
      let hasTriggerFetcherSimulationMode = false;

      incomingEdges.forEach((e) => {
        const source = nodeMap.get(e.from!);
        if (source?.type === 'simulation') {
          if (source.config?.simulation?.runBehavior !== 'manual_only') {
            hasSimulationSource = true;
            return;
          }
          hasManualOnlySimulation = true;
        }
        if (source?.type === 'fetcher') {
          hasTriggerFetcherPath = true;
          if (source.config?.fetcher?.sourceMode === 'simulation_id') {
            hasSimulationSource = true;
            hasTriggerFetcherSimulationMode = true;
          }
        }
      });

      outgoingEdges.forEach((e) => {
        if (e.fromPort !== 'trigger' || e.toPort !== 'trigger') return;
        const target = nodeMap.get(e.to!);
        if (target?.type !== 'fetcher') return;
        hasTriggerFetcherPath = true;
        if (target.config?.fetcher?.sourceMode === 'simulation_id') {
          hasSimulationSource = true;
          hasTriggerFetcherSimulationMode = true;
        }
      });

      if (!hasSimulationSource) {
        let message = `Trigger "${node.title || node.id}" requires simulation context but no simulation-capable source is connected, or source is manual-only.`;
        if (hasManualOnlySimulation) {
          message = `Trigger "${node.title || node.id}" requires simulation context, but connected Simulation is manual-only. Set Simulation run behavior to Auto-run before connected Trigger.`;
        } else if (hasTriggerFetcherPath && !hasTriggerFetcherSimulationMode) {
          message = `Trigger "${node.title || node.id}" requires simulation context but no simulation-capable source is connected via Trigger -> Fetcher.`;
        }
        findings.push({
          code: 'trigger_context_resolution_risk',
          severity: 'warning',
          message,
          nodeId: node.id
        });
      }
    }
  });

  // 7. Model prompt deadlock risk
  nodes.forEach(node => {
    if (node.type === 'model') {
      const isPromptRequired = getNodeInputPortContract(node, 'prompt').required;
      const waitForInputs = node.config?.runtime?.waitForInputs;
      if (isPromptRequired && waitForInputs) {
        // Check if prompt comes from a cycle
        const incoming = (edgeMap.get(node.id) ?? []).find(e => e.toPort === 'prompt');
        if (incoming) {
          // Simple check: if fromPort is 'result' and fromNode is 'prompt' node which depends on us
          const source = nodeMap.get(incoming.from!);
          if (source?.type === 'prompt') {
            const sourceIncoming = (edgeMap.get(source.id) ?? []).some(e => e.from === node.id);
            if (sourceIncoming) {
              findings.push({
                code: 'model_prompt_deadlock_risk',
                severity: 'warning',
                message: 'Model prompt may never resolve because it depends on this model\'s own output in a wait-for-inputs cycle.',
                nodeId: node.id
              });
            }
          }
        }
      }
    }
  });

  const errors = findings.filter(f => f.severity === 'error').length;
  const warnings = findings.filter(f => f.severity === 'warning').length;

  return {
    nodes,
    edges: normalizedEdges,
    nodeMap,
    adjacency,
    inverseAdjacency,
    triggerNodeId,
    processingNodeIds,
    terminalNodeIds,
    ok: errors === 0,
    errors,
    warnings,
    findings,
  };
};
