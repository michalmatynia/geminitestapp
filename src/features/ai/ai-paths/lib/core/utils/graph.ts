import type { AiNode, Edge, ConnectionValidation } from "@/shared/types/ai-paths";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  PORT_STACK_TOP,
  PORT_GAP,
  PORT_COMPATIBILITY,
} from "../constants";
import {
  arePortTypesCompatible,
  formatPortDataTypes,
  getPortDataTypes,
} from "./port-types";

export const getPortOffsetY = (index: number, _totalPorts: number): number => {
  return PORT_STACK_TOP + index * PORT_GAP;
};

export const normalizePortName = (port: string): string => {
  if (port === "productJson") return "entityJson";
  if (port === "simulation") return "context";
  return port;
};

export const isValidConnection = (
  from: AiNode,
  to: AiNode,
  fromPort?: string,
  toPort?: string
): boolean => {
  if (!fromPort || !toPort) return false;
  if (!from.outputs.includes(fromPort)) return false;
  if (!to.inputs.includes(toPort)) return false;

  const allowed = PORT_COMPATIBILITY[fromPort];
  const portCompatible = allowed?.includes(toPort) || fromPort === toPort;
  if (!portCompatible) return false;
  if (
    to.type === "trigger" &&
    toPort === "context" &&
    (from.type !== "simulation" || (fromPort !== "context" && fromPort !== "simulation"))
  ) {
    return false;
  }
  if (to.type === "simulation" && toPort === "trigger") {
    if (from.type !== "trigger" || fromPort !== "trigger") return false;
  }
  const fromTypes = getPortDataTypes(fromPort);
  const toTypes = getPortDataTypes(toPort);
  return arePortTypesCompatible(fromTypes, toTypes);
};

export const sanitizeEdges = (nodes: AiNode[], edges: Edge[]): Edge[] => {
  const nodeMap = new Map(nodes.map((node: AiNode) => [node.id, node]));
  return edges.flatMap((edge: Edge) => {
    if (!edge.from || !edge.to) return [];
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) return [];
    const fromPort = edge.fromPort ? normalizePortName(edge.fromPort) : undefined;
    const toPort = edge.toPort ? normalizePortName(edge.toPort) : undefined;
    if (fromPort && toPort) {
      if (isValidConnection(from, to, fromPort, toPort)) {
        return [
          {
            ...edge,
            fromPort,
            toPort,
          },
        ];
      }
      if (from.outputs.includes(toPort) && to.inputs.includes(toPort)) {
        return [
          {
            ...edge,
            fromPort: toPort,
            toPort,
          },
        ];
      }
      if (from.outputs.includes(fromPort) && to.inputs.includes(fromPort)) {
        return [
          {
            ...edge,
            fromPort,
            toPort: fromPort,
          },
        ];
      }
      return [];
    }
    const matches = from.outputs.filter((output: string) => to.inputs.includes(output));
    if (matches.length !== 1) return [];
    const port = matches[0];
    if (!port) return [];
    return [
      {
        ...edge,
        fromPort: port,
        toPort: port,
      },
    ];
  });
};

export const ensureUniquePorts = (ports: string[], add: string[]): string[] => {
  const set = new Set(ports.map(normalizePortName));
  add.forEach((port: string) => set.add(normalizePortName(port)));
  return Array.from(set);
};

export const createParserMappings = (outputs: string[]): Record<string, string> =>
  outputs.reduce<Record<string, string>>((acc: Record<string, string>, output: string) => {
    acc[output] = "";
    return acc;
  }, {});

export const createViewerOutputs = (inputs: string[]): Record<string, string> =>
  inputs.reduce<Record<string, string>>((acc: Record<string, string>, input: string) => {
    acc[input] = "";
    return acc;
  }, {});

export const validateConnection = (
  fromNode: AiNode,
  toNode: AiNode,
  fromPort: string,
  toPort: string
): ConnectionValidation => {
  if (!fromPort || !toPort) {
    return { valid: false, message: "Invalid port selection." };
  }
  if (!fromNode.outputs.includes(fromPort)) {
    return { valid: false, message: `Port ${fromPort} is not an output of this node.` };
  }
  if (!toNode.inputs.includes(toPort)) {
    return { valid: false, message: `Port ${toPort} is not an input of this node.` };
  }
  const allowed = PORT_COMPATIBILITY[fromPort];
  const portCompatible = allowed?.includes(toPort) || fromPort === toPort;
  if (!portCompatible) {
    return {
      valid: false,
      message: `Port ${fromPort} cannot connect to ${toPort}.`,
    };
  }
  const fromTypes = getPortDataTypes(fromPort);
  const toTypes = getPortDataTypes(toPort);
  const typeCompatible = arePortTypesCompatible(fromTypes, toTypes);
  if (!typeCompatible) {
    return {
      valid: false,
      message: `Type mismatch: ${fromPort} (${formatPortDataTypes(
        fromTypes
      )}) -> ${toPort} (${formatPortDataTypes(toTypes)}).`,
    };
  }
  if (toNode.type === "trigger" && toPort === "context") {
    if (fromNode.type !== "simulation" || (fromPort !== "context" && fromPort !== "simulation")) {
      return {
        valid: false,
        message: "Trigger 'context' input must connect from Simulation 'context'.",
      };
    }
  }
  if (toNode.type === "simulation" && toPort === "trigger") {
    if (fromNode.type !== "trigger" || fromPort !== "trigger") {
      return {
        valid: false,
        message: "Simulation 'trigger' input must connect from Trigger 'trigger'.",
      };
    }
  }
  return { valid: true };
};

export const clampScale = (value: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

export const clampTranslate = (
  x: number,
  y: number,
  scale: number,
  _viewport: DOMRect | null
): { x: number; y: number } => {
  const minX = -CANVAS_WIDTH * scale + 200;
  const minY = -CANVAS_HEIGHT * scale + 200;
  const maxX = 300;
  const maxY = 300;

  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  };
};
