'use client';

import { useState, useRef, useMemo } from 'react';
import { nnnCalc, getStartingPositions, ALPHA } from '@/lib/nim';
import WeightInput from '@/components/WeightInput';
import { MAX_NODES } from '@/lib/constants';

const NODE_RADIUS = 28;

interface NimNode {
  id: string;
  x: number;
  y: number;
  weight: number;
}

interface NimEdge {
  fromId: string;
  toId: string;
}

interface Result {
  nimValue: number;
  positions: Array<{ label: string; value: number }>;
}

function edgeConnects(e: NimEdge, aId: string, bId: string): boolean {
  return (e.fromId === aId && e.toId === bId) || (e.fromId === bId && e.toId === aId);
}


export default function GraphBuilder() {
  const [nodes, setNodes] = useState<NimNode[]>([]);
  const [edges, setEdges] = useState<NimEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    nodeId: string;
    startMouseX: number;
    startMouseY: number;
    startNodeX: number;
    startNodeY: number;
  } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [calculating, setCalculating] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const nextIdRef = useRef(0);
  const didDragRef = useRef(false);
  const memoRef = useRef<Map<string, number>>(new Map());
  const lastStructureRef = useRef<string | null>(null);
  const calculatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const getLabel = (nodeId: string) => {
    const idx = nodes.findIndex(n => n.id === nodeId);
    return idx >= 0 ? ALPHA[idx] : '?';
  };

  const addNode = (x: number, y: number) => {
    if (nodes.length >= MAX_NODES) return;
    const id = String(nextIdRef.current++);
    setNodes(prev => [...prev, { id, x, y, weight: 1 }]);
    setResult(null);
  };

  const toggleEdge = (aId: string, bId: string) => {
    if (aId === bId) return;
    setEdges(prev => {
      const exists = prev.some(e => edgeConnects(e, aId, bId));
      return exists
        ? prev.filter(e => !edgeConnects(e, aId, bId))
        : [...prev, { fromId: aId, toId: bId }];
    });
    setResult(null);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.fromId !== nodeId && e.toId !== nodeId));
    setSelectedId(id => (id === nodeId ? null : id));
    setConnectSourceId(id => (id === nodeId ? null : id));
    setResult(null);
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

  const handleSvgMouseUp = () => {
    setDragging(null);
  };

  const calculate = () => {
    if (nodes.length === 0) return;
    const piles = nodes.map(n => n.weight);
    const adjMatrix = nodes.map((ni, i) =>
      nodes.map((nj, j) =>
        i === j ? 1 : edges.some(e => edgeConnects(e, ni.id, nj.id)) ? 1 : 0
      )
    );
    const structureKey = JSON.stringify(adjMatrix);
    if (structureKey !== lastStructureRef.current) {
      memoRef.current = new Map();
      lastStructureRef.current = structureKey;
    }
    if (calculatingTimerRef.current) clearTimeout(calculatingTimerRef.current);
    calculatingTimerRef.current = setTimeout(() => setCalculating(true), 200);
    setTimeout(() => {
      const { nimValue, memo } = nnnCalc(piles, adjMatrix, memoRef.current);
      const positions = getStartingPositions(memo, piles);
      if (calculatingTimerRef.current) {
        clearTimeout(calculatingTimerRef.current);
        calculatingTimerRef.current = null;
      }
      setResult({ nimValue, positions });
      setCalculating(false);
    }, 0);
  };

  const selectedNode = nodes.find(n => n.id === selectedId);
  const svgCursor = dragging ? 'grabbing' : connectMode ? 'crosshair' : 'default';

  const atMaxNodes = nodes.length >= MAX_NODES;

  const hintText = atMaxNodes
    ? `Maximum of ${MAX_NODES} nodes reached`
    : connectMode
      ? connectSourceId
        ? `Now click another node to connect/disconnect it from ${getLabel(connectSourceId)}`
        : 'Click a node to select it as the connection source'
      : 'Click canvas to add a node · Drag nodes to reposition · Click node to select';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => {
            setConnectMode(m => !m);
            setConnectSourceId(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            connectMode
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          {connectMode ? 'Stop Connecting' : 'Connect Nodes'}
        </button>
        <button
          onClick={() => {
            setNodes([]);
            setEdges([]);
            setSelectedId(null);
            setConnectSourceId(null);
            setConnectMode(false);
            setResult(null);
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-red-800 hover:text-white transition-colors"
        >
          Clear All
        </button>
        <span className={`text-sm ml-auto hidden md:block ${atMaxNodes ? 'text-amber-400' : 'text-slate-500'}`}>
          {hintText}
        </span>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden select-none">
        <svg
          ref={svgRef}
          className="w-full"
          style={{ height: '420px', cursor: svgCursor }}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onClick={handleSvgClick}
        >
          {nodes.length === 0 && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#475569"
              fontSize="15"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              Click anywhere to add your first node
            </text>
          )}

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
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeOpacity="0.55"
                style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {nodes.map((node, idx) => {
            const isSelected = node.id === selectedId;
            const isConnectSource = node.id === connectSourceId;
            const label = ALPHA[idx] ?? '?';

            const fill = isConnectSource ? '#064e3b' : isSelected ? '#3b0764' : '#1e1b4b';
            const stroke = isConnectSource ? '#10b981' : isSelected ? '#a78bfa' : '#6366f1';
            const strokeWidth = isSelected || isConnectSource ? 2.5 : 1.5;

            return (
              <g
                key={node.id}
                style={{ cursor: dragging?.nodeId === node.id ? 'grabbing' : 'grab' }}
                onMouseDown={e => handleNodeMouseDown(node.id, e)}
                onClick={e => handleNodeClick(node.id, e)}
              >
                {(isSelected || isConnectSource) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS + 6}
                    fill="none"
                    stroke={isConnectSource ? '#10b981' : '#8b5cf6'}
                    strokeWidth="1"
                    strokeOpacity="0.35"
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
                />
                <text
                  x={node.x}
                  y={node.y - 7}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="13"
                  fontWeight="700"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#a5b4fc"
                  fontSize="12"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.weight}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex gap-3 flex-wrap items-center h-[52px]">
        {selectedNode ? (
          <div className="flex-1 min-w-64 h-full bg-slate-800 border border-slate-700 rounded-xl px-4 flex items-center gap-3">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider shrink-0">
              Node {getLabel(selectedNode.id)}:
            </span>
            <label className="text-slate-300 text-sm shrink-0">Pile size</label>
            <WeightInput
              key={selectedNode.id}
              value={selectedNode.weight}
              onChange={val => {
                setNodes(prev =>
                  prev.map(n =>
                    n.id === selectedNode.id ? { ...n, weight: val } : n
                  )
                );
                setResult(null);
              }}
            />
            <button
              onClick={() => deleteNode(selectedNode.id)}
              className="ml-auto text-sm text-red-400 hover:text-red-300 transition-colors shrink-0"
            >
              Delete node
            </button>
          </div>
        ) : (
          <div className="flex-1 min-w-64 h-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 flex items-center">
            <p className="text-slate-500 text-sm">
              {nodes.length === 0 ? 'Add nodes to get started' : 'Select a node to edit its weight'}
            </p>
          </div>
        )}

        <button
          onClick={calculate}
          disabled={nodes.length === 0 || calculating}
          className="ml-auto px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center"
        >
          {calculating ? 'Calculating…' : 'Calculate Nim Value'}
        </button>
      </div>

      {calculating && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <p className="text-slate-400 text-sm">Calculating… this may take a moment for large graphs.</p>
        </div>
      )}

      {result && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3" style={{ animation: 'result-fade-in 0.12s ease' }}>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Nim Value</p>
              <p
                className={`text-3xl font-bold tabular-nums ${
                  result.nimValue > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {result.nimValue}
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium border ${
                result.nimValue > 0
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-red-950 text-red-300 border-red-800'
              }`}
            >
              {result.nimValue > 0 ? 'First player wins' : 'Second player wins'}
              {/*{result.nimValue > 0 ? 'N-position — first player wins' : 'P-position — second player wins'}*/}
            </div>
          </div>

          {result.positions.length > 0 && (
            <>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                Starting Positions
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-1.5">
                {result.positions.map(p => (
                  <div
                    key={p.label}
                    className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-2 py-1 text-sm font-mono flex justify-between items-center"
                  >
                    <span className="text-indigo-400 font-bold">{p.label}</span>
                    <span className={p.value > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {p.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
