'use client';

import React from 'react';
import { NODE_WIDTH, PORT_SIZE, getPortOffsetY, type AiNode } from '@/shared/lib/ai-paths';
import { INPUT_CONNECTOR_COLORS, OUTPUT_CONNECTOR_COLORS } from './canvas-svg-node-utils';
import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import { type SvgConnectorTooltipState } from '../../CanvasBoard.utils';
import { type ConnectorInfo } from '../../canvas-board-connectors';

export interface CanvasSvgNodePortsProps {
  node: AiNode;
  incomingEdgePortSet: Set<string>;
  hoveredConnectorKey: string | null;
  pinnedConnectorKey: string | null;
  connectorHitRadius: number;
  showPortLabels: boolean;
  buildConnectorKey: (direction: 'input' | 'output', nodeId: string, portName: string) => string;
  onReconnectInput: (
    event: React.PointerEvent,
    nodeId: string,
    portName: string
  ) => void | Promise<void>;
  onCompleteConnection: (
    event: React.PointerEvent,
    node: AiNode,
    portName: string
  ) => void | Promise<void>;
  onDisconnectPort: (
    direction: 'input' | 'output',
    nodeId: string,
    portName: string
  ) => void | Promise<void>;
  onStartConnection: (
    event: React.PointerEvent,
    node: AiNode,
    portName: string
  ) => void | Promise<void>;
  setHoveredConnectorKey: (key: string | null) => void;
  onConnectorHover?: (state: SvgConnectorTooltipState) => void;
  onConnectorLeave?: () => void;
  getConnectorInfo: (
    direction: 'input' | 'output',
    nodeId: string,
    portName: string
  ) => ConnectorInfo;
  setPinnedConnectorKey: (key: string | null) => void;
}

export function CanvasSvgNodePorts({
  node,
  incomingEdgePortSet,
  hoveredConnectorKey,
  pinnedConnectorKey,
  connectorHitRadius,
  showPortLabels,
  buildConnectorKey,
  onReconnectInput,
  onCompleteConnection,
  onDisconnectPort,
  onStartConnection,
  setHoveredConnectorKey,
  onConnectorHover,
  onConnectorLeave,
  getConnectorInfo,
  setPinnedConnectorKey,
}: CanvasSvgNodePortsProps): React.JSX.Element {
  return (
    <>
      {node.inputs?.map((port, index) => {
        const y = getPortOffsetY(index, node.inputs.length);
        const isConnected = incomingEdgePortSet.has(`${node.id}:${port}`);
        const key = buildConnectorKey('input', node.id, port);
        const isHovered = hoveredConnectorKey === key;
        const isPinned = pinnedConnectorKey === key;

        return (
          <g key={key} transform={`translate(0 ${y})`}>
            <circle
              data-port='input'
              data-node-id={node.id}
              data-port-name={port}
              cx={0}
              cy={0}
              r={isHovered || isPinned ? PORT_SIZE / 2 + 1.5 : PORT_SIZE / 2}
              pointerEvents='all'
              fill={
                isConnected ? INPUT_CONNECTOR_COLORS.fillConnected : INPUT_CONNECTOR_COLORS.fill
              }
              stroke={INPUT_CONNECTOR_COLORS.stroke}
              strokeWidth={isHovered || isPinned ? 2 : 1}
              style={{ cursor: 'crosshair' }}
              onPointerDown={(event: React.PointerEvent<SVGCircleElement>) => {
                event.stopPropagation();
                void onReconnectInput(event, node.id, port);
              }}
              onPointerUp={(event: React.PointerEvent<SVGCircleElement>) => {
                event.stopPropagation();
                void onCompleteConnection(event, node, port);
              }}
              onContextMenu={(event: React.MouseEvent<SVGCircleElement>) => {
                event.preventDefault();
                event.stopPropagation();
                void onDisconnectPort('input', node.id, port);
              }}
              onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                setHoveredConnectorKey(key);
                onConnectorHover?.({
                  clientX: event.clientX,
                  clientY: event.clientY,
                  info: getConnectorInfo('input', node.id, port),
                });
              }}
              onPointerLeave={() => {
                setHoveredConnectorKey(null);
                onConnectorLeave?.();
              }}
              onClick={(event: React.MouseEvent<SVGCircleElement>) => {
                event.stopPropagation();
                if (isPinned) {
                  setPinnedConnectorKey(null);
                  setHoveredConnectorKey(null);
                  return;
                }
                setPinnedConnectorKey(key);
              }}
            />
            <circle
              data-port='input'
              data-node-id={node.id}
              data-port-name={port}
              cx={0}
              cy={0}
              r={connectorHitRadius}
              pointerEvents='all'
              fill='transparent'
              stroke='none'
              style={{ cursor: 'crosshair' }}
              onPointerDown={(event: React.PointerEvent<SVGCircleElement>) => {
                event.stopPropagation();
                void onReconnectInput(event, node.id, port);
              }}
              onPointerUp={(event: React.PointerEvent<SVGCircleElement>) => {
                event.stopPropagation();
                void onCompleteConnection(event, node, port);
              }}
              onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                setHoveredConnectorKey(key);
                onConnectorHover?.({
                  clientX: event.clientX,
                  clientY: event.clientY,
                  info: getConnectorInfo('input', node.id, port),
                });
              }}
              onPointerLeave={() => {
                setHoveredConnectorKey(null);
                onConnectorLeave?.();
              }}
              onClick={(event: React.MouseEvent<SVGCircleElement>) => {
                event.stopPropagation();
                if (isPinned) {
                  setPinnedConnectorKey(null);
                  setHoveredConnectorKey(null);
                  return;
                }
                setPinnedConnectorKey(key);
              }}
            />
            {showPortLabels && (
              <text
                x={PORT_SIZE + 4}
                y={3}
                fill='rgba(148, 163, 184, 0.7)'
                fontSize='9'
                style={{ userSelect: 'none' }}
              >
                {formatPortLabel(port)}
              </text>
            )}
          </g>
        );
      })}

      {node.outputs?.map((port, index) => {
        const y = getPortOffsetY(index, node.outputs.length);
        const key = buildConnectorKey('output', node.id, port);
        const isHovered = hoveredConnectorKey === key;
        const isPinned = pinnedConnectorKey === key;

        return (
          <g key={key} transform={`translate(${NODE_WIDTH} ${y})`}>
            <circle
              data-port='output'
              data-node-id={node.id}
              data-port-name={port}
              cx={0}
              cy={0}
              r={isHovered || isPinned ? PORT_SIZE / 2 + 1.5 : PORT_SIZE / 2}
              pointerEvents='all'
              fill={OUTPUT_CONNECTOR_COLORS.fill}
              stroke={OUTPUT_CONNECTOR_COLORS.stroke}
              strokeWidth={isHovered || isPinned ? 2 : 1}
              style={{ cursor: 'crosshair' }}
              onPointerDown={(event: React.PointerEvent<SVGCircleElement>) => {
                event.stopPropagation();
                void onStartConnection(event, node, port);
              }}
              onContextMenu={(event: React.MouseEvent<SVGCircleElement>) => {
                event.preventDefault();
                event.stopPropagation();
                void onDisconnectPort('output', node.id, port);
              }}
              onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                setHoveredConnectorKey(key);
                onConnectorHover?.({
                  clientX: event.clientX,
                  clientY: event.clientY,
                  info: getConnectorInfo('output', node.id, port),
                });
              }}
              onPointerMove={(event: React.PointerEvent<SVGCircleElement>) => {
                setHoveredConnectorKey(key);
                onConnectorHover?.({
                  clientX: event.clientX,
                  clientY: event.clientY,
                  info: getConnectorInfo('output', node.id, port),
                });
              }}
              onPointerLeave={() => {
                setHoveredConnectorKey(null);
                onConnectorLeave?.();
              }}
              onClick={(event: React.MouseEvent<SVGCircleElement>) => {
                event.stopPropagation();
                if (isPinned) {
                  setPinnedConnectorKey(null);
                  setHoveredConnectorKey(null);
                  return;
                }
                setPinnedConnectorKey(key);
              }}
            />
            <circle
              data-port='output'
              data-node-id={node.id}
              data-port-name={port}
              cx={0}
              cy={0}
              r={connectorHitRadius}
              pointerEvents='all'
              fill='transparent'
              stroke='none'
              style={{ cursor: 'crosshair' }}
              onPointerDown={(event: React.PointerEvent<SVGCircleElement>) => {
                event.stopPropagation();
                void onStartConnection(event, node, port);
              }}
              onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                setHoveredConnectorKey(key);
                onConnectorHover?.({
                  clientX: event.clientX,
                  clientY: event.clientY,
                  info: getConnectorInfo('output', node.id, port),
                });
              }}
              onPointerMove={(event: React.PointerEvent<SVGCircleElement>) => {
                setHoveredConnectorKey(key);
                onConnectorHover?.({
                  clientX: event.clientX,
                  clientY: event.clientY,
                  info: getConnectorInfo('output', node.id, port),
                });
              }}
              onPointerLeave={() => {
                setHoveredConnectorKey(null);
                onConnectorLeave?.();
              }}
              onClick={(event: React.MouseEvent<SVGCircleElement>) => {
                event.stopPropagation();
                if (isPinned) {
                  setPinnedConnectorKey(null);
                  setHoveredConnectorKey(null);
                  return;
                }
                setPinnedConnectorKey(key);
              }}
            />
            {showPortLabels && (
              <text
                x={-PORT_SIZE - 4}
                y={3}
                textAnchor='end'
                fill='rgba(148, 163, 184, 0.7)'
                fontSize='9'
                style={{ userSelect: 'none' }}
              >
                {formatPortLabel(port)}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}
