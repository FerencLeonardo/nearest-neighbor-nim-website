'use client';

import { useState, useRef, useMemo } from 'react';
import { ALPHA } from '@/lib/nim';
import { MAX_NODES } from '@/lib/constants';
import { edgeConnects, type NimEdge, type NimNode } from '@/lib/graph';
import { PIP_LAYOUTS, PIP_RADIUS } from '@/lib/pips';

export const NODE_RADIUS = 28;

// Ink-and-paper palette, mirrored from the tokens in globals.css.
// SVG attributes need literal values, so they live here as constants.
export const INK = '#223056';
export const PEN = '#2D53C8';
export const PEN_WASH = '#E9EEFB';
export const REDPEN = '#C6392B';
export const GRAPHITE = '#5E6773';
export const FADED = '#8A93A5';
export const HIGHLIGHT_WASH = '#FBF0B8';
export const HIGHLIGHT_INK = '#B08D1C';

interface DragState {
  nodeId: string;
  startMouseX: number;
  startMouseY: number;
  startNodeX: number;
  startNodeY: number;
}

export type GraphEditorApi = ReturnType<typeof useGraphEditor>;

// Owns the graph being edited plus all canvas interaction state (selection,
// connect mode, dragging). `onGraphChange` fires on structural/weight changes,
// not on repositioning — dragging a node doesn't invalidate results.
export function useGraphEditor(onGraphChange?: () => void) {
  const [nodes, setNodes] = useState<NimNode[]>([]);
  const [edges, setEdges] = useState<NimEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nextIdRef = useRef(0);
  const didDragRef = useRef(false);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const getLabel = (nodeId: string) => {
    const idx = nodes.findIndex(n => n.id === nodeId);
    return idx >= 0 ? ALPHA[idx] : '?';
  };

  const addNode = (x: number, y: number) => {
    if (nodes.length >= MAX_NODES) return;
    const id = String(nextIdRef.current++);
    setNodes(prev => [...prev, { id, x, y, weight: 1 }]);
    onGraphChange?.();
  };

  const toggleEdge = (aId: string, bId: string) => {
    if (aId === bId) return;
    setEdges(prev => {
      const exists = prev.some(e => edgeConnects(e, aId, bId));
      return exists
        ? prev.filter(e => !edgeConnects(e, aId, bId))
        : [...prev, { fromId: aId, toId: bId }];
    });
    onGraphChange?.();
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.fromId !== nodeId && e.toId !== nodeId));
    setSelectedId(id => (id === nodeId ? null : id));
    setConnectSourceId(id => (id === nodeId ? null : id));
    onGraphChange?.();
  };

  const setNodeWeight = (nodeId: string, weight: number) => {
    setNodes(prev => prev.map(n => (n.id === nodeId ? { ...n, weight } : n)));
    onGraphChange?.();
  };

  const resetInteraction = () => {
    setSelectedId(null);
    setConnectMode(false);
    setConnectSourceId(null);
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    resetInteraction();
    onGraphChange?.();
  };

  const toggleConnectMode = () => {
    setConnectMode(m => !m);
    setConnectSourceId(null);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.tagName === 'svg') {
      if (connectMode) {
        setConnectSourceId(null);
        return;
      }
      const rect = svgRef.current!.getBoundingClientRect();
      addNode(e.clientX - rect.left, e.clientY - rect.top);
      setSelectedId(null);
    }
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    didDragRef.current = false;
    const node = nodes.find(n => n.id === nodeId)!;
    setDragging({
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: node.x,
      startNodeY: node.y,
    });
  };

  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (connectMode) {
      if (!connectSourceId) {
        setConnectSourceId(nodeId);
      } else {
        toggleEdge(connectSourceId, nodeId);
        setConnectSourceId(null);
      }
    } else {
      setSelectedId(id => (id === nodeId ? null : nodeId));
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.startMouseX;
    const dy = e.clientY - dragging.startMouseY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      didDragRef.current = true;
    }
    setNodes(prev =>
      prev.map(n =>
        n.id === dragging.nodeId
          ? { ...n, x: dragging.startNodeX + dx, y: dragging.startNodeY + dy }
          : n
      )
    );
  };

  const handleSvgMouseUp = () => setDragging(null);

  const selectedNode = nodes.find(n => n.id === selectedId);
  const atMaxNodes = nodes.length >= MAX_NODES;
  const svgCursor = dragging ? 'grabbing' : connectMode ? 'crosshair' : 'default';

  const hintText = atMaxNodes
    ? `Maximum of ${MAX_NODES} nodes reached`
    : connectMode
      ? connectSourceId
        ? `Now click another node to connect/disconnect it from ${getLabel(connectSourceId)}`
        : 'Click a node to select it as the connection source'
      : 'Click canvas to add a node · Drag to reposition · Click node to select';

  return {
    nodes,
    edges,
    nodeMap,
    selectedId,
    selectedNode,
    connectMode,
    connectSourceId,
    dragging,
    svgRef,
    atMaxNodes,
    svgCursor,
    hintText,
    getLabel,
    deleteNode,
    setNodeWeight,
    clearAll,
    resetInteraction,
    toggleConnectMode,
    handleSvgClick,
    handleNodeMouseDown,
    handleNodeClick,
    handleSvgMouseMove,
    handleSvgMouseUp,
  };
}

// Quadrille-paper background for graph canvases. pointer-events pass through
// so canvas clicks still land on the <svg> itself.
export function Quadrille() {
  return (
    <>
      <defs>
        <pattern id="quadrille" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#D5DEED" strokeWidth="1" opacity="0.55" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#quadrille)" style={{ pointerEvents: 'none' }} />
    </>
  );
}

export function EdgeLines({
  edges,
  nodeMap,
}: {
  edges: NimEdge[];
  nodeMap: Map<string, NimNode>;
}) {
  return (
    <>
      {edges.map(edge => {
        const from = nodeMap.get(edge.fromId);
        const to = nodeMap.get(edge.toId);
        if (!from || !to) return null;
        return (
          <line
            key={`${edge.fromId}-${edge.toId}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={INK}
            strokeWidth="2"
            strokeOpacity="0.6"
            style={{ pointerEvents: 'none' }}
          />
        );
      })}
    </>
  );
}

// A pile drawn as stones in a dice-face arrangement. Values above 5 can't
// occur (MAX_WEIGHT = 5), but a numeral fallback keeps the count honest.
export function Pips({
  cx,
  cy,
  count,
  fill,
}: {
  cx: number;
  cy: number;
  count: number;
  fill: string;
}) {
  const layout = PIP_LAYOUTS[count];
  if (!layout) {
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={fill}
        fontSize="14"
        fontWeight="600"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {count}
      </text>
    );
  }
  return (
    <>
      {layout.map(([dx, dy], i) => (
        <circle
          key={i}
          cx={cx + dx}
          cy={cy + dy}
          r={PIP_RADIUS}
          fill={fill}
          style={{ pointerEvents: 'none' }}
        />
      ))}
    </>
  );
}

// The visual parts of a node: an optional outer ring, the pile circle
// (dashed when empty), the vertex label set outside the circle like a
// figure in a paper, and the stones. Callers wrap it in a <g> that
// carries the event handlers.
export function NodeGlyph({
  node,
  label,
  value,
  fill,
  stroke,
  strokeWidth,
  dashed = false,
  ringColor,
  ringDashed = false,
  pipFill = INK,
  labelFill = INK,
}: {
  node: NimNode;
  label: string;
  value: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  dashed?: boolean;
  ringColor?: string;
  ringDashed?: boolean;
  pipFill?: string;
  labelFill?: string;
}) {
  return (
    <>
      {ringColor && (
        <circle
          cx={node.x}
          cy={node.y}
          r={NODE_RADIUS + 6}
          fill="none"
          stroke={ringColor}
          strokeWidth="1.5"
          strokeOpacity={ringDashed ? 0.7 : 0.45}
          strokeDasharray={ringDashed ? '4 3' : undefined}
          style={{ pointerEvents: 'none' }}
        />
      )}
      <circle
        cx={node.x}
        cy={node.y}
        r={NODE_RADIUS}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? '5 4' : undefined}
      />
      <text
        x={node.x + NODE_RADIUS * 0.95}
        y={node.y - NODE_RADIUS * 0.85}
        fill={labelFill}
        fontSize="14"
        fontStyle="italic"
        fontFamily="var(--font-stix), Georgia, serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
      <Pips cx={node.x} cy={node.y} count={value} fill={pipFill} />
    </>
  );
}

// Toolbar + editing canvas. Rendered as siblings so parents control layout
// via their own flex column.
export default function GraphEditor({ editor }: { editor: GraphEditorApi }) {
  const {
    nodes,
    edges,
    nodeMap,
    selectedId,
    connectMode,
    connectSourceId,
    dragging,
    svgRef,
    atMaxNodes,
    svgCursor,
    hintText,
    toggleConnectMode,
    clearAll,
    handleSvgClick,
    handleNodeMouseDown,
    handleNodeClick,
    handleSvgMouseMove,
    handleSvgMouseUp,
  } = editor;

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={toggleConnectMode}
          className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
            connectMode
              ? 'bg-pen border-pen text-white hover:bg-pen-deep'
              : 'bg-card border-grid text-ink hover:border-ink'
          }`}
        >
          {connectMode ? 'Stop connecting' : 'Connect nodes'}
        </button>
        <button
          onClick={clearAll}
          className="px-4 py-2 rounded-md text-sm font-medium border bg-card border-grid text-graphite hover:text-redpen hover:border-redpen transition-colors"
        >
          Clear all
        </button>
        <span
          className={`font-display italic text-[13.5px] ml-auto hidden md:block ${
            atMaxNodes ? 'text-redpen' : 'text-graphite'
          }`}
        >
          {hintText}
        </span>
      </div>

      <div className="rounded-lg border border-grid bg-card overflow-hidden select-none">
        <svg
          ref={svgRef}
          className="w-full"
          style={{ height: '420px', cursor: svgCursor }}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onClick={handleSvgClick}
        >
          <Quadrille />

          {nodes.length === 0 && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={FADED}
              fontSize="15"
              fontStyle="italic"
              fontFamily="var(--font-stix), Georgia, serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              Click anywhere to add your first node
            </text>
          )}

          <EdgeLines edges={edges} nodeMap={nodeMap} />

          {nodes.map((node, idx) => {
            const isSelected = node.id === selectedId;
            const isSource = node.id === connectSourceId;
            const isEmpty = node.weight === 0;
            return (
              <g
                key={node.id}
                data-node
                data-pips={node.weight}
                role="button"
                aria-label={`Node ${ALPHA[idx] ?? '?'}, pile of ${node.weight}`}
                style={{ cursor: dragging?.nodeId === node.id ? 'grabbing' : 'grab' }}
                onMouseDown={e => handleNodeMouseDown(node.id, e)}
                onClick={e => handleNodeClick(node.id, e)}
              >
                <NodeGlyph
                  node={node}
                  label={ALPHA[idx] ?? '?'}
                  value={node.weight}
                  fill={isSource ? HIGHLIGHT_WASH : isSelected ? PEN_WASH : '#FFFFFF'}
                  stroke={isSource ? INK : isSelected ? PEN : isEmpty ? FADED : INK}
                  strokeWidth={isSelected || isSource ? 2.5 : 1.5}
                  dashed={isEmpty}
                  ringColor={isSource ? HIGHLIGHT_INK : isSelected ? PEN : undefined}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}
