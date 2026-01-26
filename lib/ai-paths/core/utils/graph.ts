import type { AiNode, Edge } from "@/types/ai-paths";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  NODE_MIN_HEIGHT,
  PORT_GAP,
} from "../constants";

export const getPortOffsetY = (index: number, totalPorts: number) => {
  const totalHeight = (totalPorts - 1) * PORT_GAP;
  const startY = NODE_MIN_HEIGHT / 2 - totalHeight / 2;
  return startY + index * PORT_GAP;
};

export const normalizePortName = (port: string) =>
  port === "productJson" ? "entityJson" : port;

export const isValidConnection = (
  from: AiNode,
  to: AiNode,
  fromPort?: string,
  toPort?: string
) => {
  if (!fromPort || !toPort) return false;
  if (!from.outputs.includes(fromPort)) return false;
  if (!to.inputs.includes(toPort)) return false;
  return fromPort === toPort;
};

export const sanitizeEdges = (nodes: AiNode[], edges: Edge[]): Edge[] => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return edges.flatMap((edge) => {
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
    const matches = from.outputs.filter((output) => to.inputs.includes(output));
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

export const ensureUniquePorts = (ports: string[], add: string[]) => {
  const set = new Set(ports.map(normalizePortName));
  add.forEach((port) => set.add(normalizePortName(port)));
  return Array.from(set);
};

export const createParserMappings = (outputs: string[]) =>
  outputs.reduce<Record<string, string>>((acc, output) => {
    acc[output] = "";
    return acc;
  }, {});

export const createViewerOutputs = (inputs: string[]) =>
  inputs.reduce<Record<string, string>>((acc, input) => {
    acc[input] = "";
    return acc;
  }, {});

export const validateConnection = (
  fromNode: AiNode,
  toNode: AiNode,
  fromPort: string,
  toPort: string
) => {
  return isValidConnection(fromNode, toNode, fromPort, toPort);
};

export const clampScale = (value: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

export const clampTranslate = (
  x: number,
  y: number,
  scale: number,
  _viewport: DOMRect | null
) => {
  const minX = -CANVAS_WIDTH * scale + 200;
  const minY = -CANVAS_HEIGHT * scale + 200;
  const maxX = 300;
  const maxY = 300;

  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  };
};
