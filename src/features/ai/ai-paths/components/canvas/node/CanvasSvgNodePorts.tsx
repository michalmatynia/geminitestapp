'use client';

import React from 'react';
import { NODE_WIDTH, PORT_SIZE, getPortOffsetY, type AiNode } from '@/shared/lib/ai-paths';
import { INPUT_CONNECTOR_COLORS, OUTPUT_CONNECTOR_COLORS } from './canvas-svg-node-utils';
import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import { type ConnectorInfo } from '../../canvas-board-connectors';
import { useCanvasBoardUI } from '../../CanvasBoardUIContext';

const CONNECTOR_TAP_MOVE_THRESHOLD_PX = 4;
const CONNECTOR_TAP_MOVE_THRESHOLD_SQ = CONNECTOR_TAP_MOVE_THRESHOLD_PX ** 2;

type ConnectorPressState = {
  key: string;
  startClientX: number;
  startClientY: number;
  moved: boolean;
};

export interface CanvasSvgNodePortsProps {
  node: AiNode;
  incomingEdgePortSet: Set<string>;
  connectorHitRadius: number;
  showPortLabels: boolean;
  buildConnectorKey: (direction: 'input' | 'output', nodeId: string, portName: string) => string;
  getConnectorInfo: (
    direction: 'input' | 'output',
    nodeId: string,
    portName: string
  ) => ConnectorInfo;
}

export function CanvasSvgNodePorts({
  node,
  incomingEdgePortSet,
  connectorHitRadius,
  showPortLabels,
  buildConnectorKey,
  getConnectorInfo,
}: CanvasSvgNodePortsProps): React.JSX.Element {
  const {
    hoveredConnectorKey,
    pinnedConnectorKey,
    setHoveredConnectorKey,
    setPinnedConnectorKey,
    onConnectorHover,
    onConnectorLeave,
    onReconnectInput,
    onCompleteConnection,
    onDisconnectPort,
    onStartConnection,
  } = useCanvasBoardUI();

  const connectorPressByPointerIdRef = React.useRef<Map<number, ConnectorPressState>>(new Map());

  const beginConnectorPress = React.useCallback(
    (event: React.PointerEvent<SVGCircleElement>, key: string): void => {
      if (event.button !== 0) return;
      connectorPressByPointerIdRef.current.set(event.pointerId, {
        key,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
      });
    },
    []
  );

  const trackConnectorPressMove = React.useCallback(
    (event: React.PointerEvent<SVGCircleElement>, key: string): void => {
      const press = connectorPressByPointerIdRef.current.get(event.pointerId);
      if (press?.key !== key || press.moved) return;
      const deltaX = event.clientX - press.startClientX;
      const deltaY = event.clientY - press.startClientY;
      if (deltaX * deltaX + deltaY * deltaY > CONNECTOR_TAP_MOVE_THRESHOLD_SQ) {
        press.moved = true;
      }
    },
    []
  );

  const consumeConnectorTap = React.useCallback(
    (event: React.PointerEvent<SVGCircleElement>, key: string): boolean => {
      const press = connectorPressByPointerIdRef.current.get(event.pointerId);
      connectorPressByPointerIdRef.current.delete(event.pointerId);
      if (press?.key !== key || event.button !== 0) return false;
      const deltaX = event.clientX - press.startClientX;
      const deltaY = event.clientY - press.startClientY;
      const moved = press.moved || deltaX * deltaX + deltaY * deltaY > CONNECTOR_TAP_MOVE_THRESHOLD_SQ;
      return !moved;
    },
    []
  );

  const clearConnectorPress = React.useCallback((event: React.PointerEvent<SVGCircleElement>): void => {
    connectorPressByPointerIdRef.current.delete(event.pointerId);
  }, []);

  const togglePinnedConnector = React.useCallback(
    (key: string, isPinned: boolean): void => {
      if (isPinned) {
        setPinnedConnectorKey(null);
        setHoveredConnectorKey(null);
        return;
      }
      setPinnedConnectorKey(key);
    },
    [setHoveredConnectorKey, setPinnedConnectorKey]
  );

  const updateConnectorHover = React.useCallback(
    (
      event: React.PointerEvent<SVGCircleElement>,
      direction: 'input' | 'output',
      nodeId: string,
      portName: string,
      key: string,
      options?: { force?: boolean }
    ): void => {
      if (pinnedConnectorKey && !options?.force) return;
      setHoveredConnectorKey(key);
      onConnectorHover?.({
        clientX: event.clientX,
        clientY: event.clientY,
        info: getConnectorInfo(direction, nodeId, portName),
      });
    },
    [getConnectorInfo, onConnectorHover, pinnedConnectorKey, setHoveredConnectorKey]
  );

  const handleConnectorTap = React.useCallback(
    (
      event: React.PointerEvent<SVGCircleElement>,
      direction: 'input' | 'output',
      nodeId: string,
      portName: string,
      key: string,
      isPinned: boolean
    ): void => {
      if (!isPinned) {
        updateConnectorHover(event, direction, nodeId, portName, key, { force: true });
      }
      togglePinnedConnector(key, isPinned);
    },
    [togglePinnedConnector, updateConnectorHover]
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleWindowPointerClear = (event: PointerEvent): void => {
      connectorPressByPointerIdRef.current.delete(event.pointerId);
    };
    window.addEventListener('pointerup', handleWindowPointerClear);
    window.addEventListener('pointercancel', handleWindowPointerClear);
    return (): void => {
      window.removeEventListener('pointerup', handleWindowPointerClear);
      window.removeEventListener('pointercancel', handleWindowPointerClear);
      connectorPressByPointerIdRef.current.clear();
    };
  }, []);

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
                beginConnectorPress(event, key);
                void onReconnectInput(event, node.id, port);
              }}
              onPointerUp={(event: React.PointerEvent<SVGCircleElement>) => {
                event.stopPropagation();
                trackConnectorPressMove(event, key);
                const isConnectorTap = consumeConnectorTap(event, key);
                void onCompleteConnection(event, node, port);
                if (isConnectorTap) {
                  handleConnectorTap(event, 'input', node.id, port, key, isPinned);
                }
              }}
              onPointerMove={(event: React.PointerEvent<SVGCircleElement>) => {
                trackConnectorPressMove(event, key);
                updateConnectorHover(event, 'input', node.id, port, key);
              }}
              onContextMenu={(event: React.MouseEvent<SVGCircleElement>) => {
                event.preventDefault();
                event.stopPropagation();
                void onDisconnectPort('input', node.id, port);
              }}
              onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                updateConnectorHover(event, 'input', node.id, port, key);
              }}
              onPointerLeave={() => {
                setHoveredConnectorKey(null);
                onConnectorLeave?.();
              }}
              onPointerCancel={clearConnectorPress}
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
                beginConnectorPress(event, key);
                void onReconnectInput(event, node.id, port);
              }}
              onPointerUp={(event: React.PointerEvent<SVGCircleElement>) => {
                event.stopPropagation();
                trackConnectorPressMove(event, key);
                const isConnectorTap = consumeConnectorTap(event, key);
                void onCompleteConnection(event, node, port);
                if (isConnectorTap) {
                  handleConnectorTap(event, 'input', node.id, port, key, isPinned);
                }
              }}
              onPointerMove={(event: React.PointerEvent<SVGCircleElement>) => {
                trackConnectorPressMove(event, key);
                updateConnectorHover(event, 'input', node.id, port, key);
              }}
              onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                updateConnectorHover(event, 'input', node.id, port, key);
              }}
              onPointerLeave={() => {
                setHoveredConnectorKey(null);
                onConnectorLeave?.();
              }}
              onPointerCancel={clearConnectorPress}
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
                beginConnectorPress(event, key);
                void onStartConnection(event, node, port);
              }}
              onPointerUp={(event: React.PointerEvent<SVGCircleElement>) => {
                event.stopPropagation();
                trackConnectorPressMove(event, key);
                const isConnectorTap = consumeConnectorTap(event, key);
                void onCompleteConnection(event, node, port);
                if (isConnectorTap) {
                  handleConnectorTap(event, 'output', node.id, port, key, isPinned);
                }
              }}
              onContextMenu={(event: React.MouseEvent<SVGCircleElement>) => {
                event.preventDefault();
                event.stopPropagation();
                void onDisconnectPort('output', node.id, port);
              }}
              onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                updateConnectorHover(event, 'output', node.id, port, key);
              }}
              onPointerMove={(event: React.PointerEvent<SVGCircleElement>) => {
                trackConnectorPressMove(event, key);
                updateConnectorHover(event, 'output', node.id, port, key);
              }}
              onPointerLeave={() => {
                setHoveredConnectorKey(null);
                onConnectorLeave?.();
              }}
              onPointerCancel={clearConnectorPress}
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
                beginConnectorPress(event, key);
                void onStartConnection(event, node, port);
              }}
              onPointerUp={(event: React.PointerEvent<SVGCircleElement>) => {
                event.stopPropagation();
                trackConnectorPressMove(event, key);
                const isConnectorTap = consumeConnectorTap(event, key);
                void onCompleteConnection(event, node, port);
                if (isConnectorTap) {
                  handleConnectorTap(event, 'output', node.id, port, key, isPinned);
                }
              }}
              onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                updateConnectorHover(event, 'output', node.id, port, key);
              }}
              onPointerMove={(event: React.PointerEvent<SVGCircleElement>) => {
                trackConnectorPressMove(event, key);
                updateConnectorHover(event, 'output', node.id, port, key);
              }}
              onPointerLeave={() => {
                setHoveredConnectorKey(null);
                onConnectorLeave?.();
              }}
              onPointerCancel={clearConnectorPress}
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
