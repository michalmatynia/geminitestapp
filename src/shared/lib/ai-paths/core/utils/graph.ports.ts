import type { AiNode } from '@/shared/contracts/ai-paths';
import { PORT_STACK_TOP, PORT_GAP, PORT_COMPATIBILITY } from '../constants';
import { arePortTypesCompatible, getPortDataTypes } from './port-types';

export const getPortOffsetY = (index: number, _totalPorts: number): number => {
  return PORT_STACK_TOP + index * PORT_GAP;
};

export const normalizePortName = (port: string): string => {
  const trimmed = typeof port === 'string' ? port.trim() : '';
  const normalized = trimmed.toLowerCase();
  if (normalized === 'productjson') return 'entityJson';
  if (normalized === 'simulation') return 'context';
  if (
    normalized === 'images (urls)' ||
    normalized === 'images(urls)' ||
    normalized === 'image urls'
  ) {
    return 'images';
  }
  return trimmed;
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
    to.type === 'trigger' &&
    toPort === 'context' &&
    (from.type !== 'simulation' || (fromPort !== 'context' && fromPort !== 'simulation'))
  ) {
    return false;
  }
  if (to.type === 'simulation' && toPort === 'trigger') {
    if (from.type !== 'trigger' || fromPort !== 'trigger') return false;
  }
  if (to.type === 'fetcher' && toPort === 'trigger') {
    if (from.type !== 'trigger' || fromPort !== 'trigger') return false;
  }
  if (to.type === 'fetcher' && from.type === 'trigger' && toPort !== 'trigger') {
    return false;
  }
  const fromTypes = getPortDataTypes(fromPort);
  const toTypes = getPortDataTypes(toPort);
  return arePortTypesCompatible(fromTypes, toTypes);
};

export const ensureUniquePorts = (ports: string[], add: string[]): string[] => {
  const set = new Set(ports);
  add.forEach((port: string) => {
    if (port) set.add(port);
  });
  return Array.from(set);
};
