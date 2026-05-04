'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { ALPHA } from '@/lib/nim';
import { getValidPileIndices, getAiMove, type Difficulty, type Player } from '@/lib/game';
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

type Phase = 'setup' | 'playing' | 'gameover';

interface LastMove {
  player: Player;
  pileIdx: number;
  stones: number;
}

function edgeConnects(e: NimEdge, aId: string, bId: string): boolean {
  return (e.fromId === aId && e.toId === bId) || (e.fromId === bId && e.toId === aId);
}


function StonesInput({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [str, setStr] = useState(String(value));
  const commit = () => {
    const parsed = parseInt(str, 10);
    const clamped = isNaN(parsed) ? 1 : Math.max(1, Math.min(max, parsed));
    onChange(clamped);
    setStr(String(clamped));
  };
  return (
    <input
      type="number"
      min={1}
      max={max}
      value={str}
      onChange={e => {
        const val = e.target.value;
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed === 0) return;
        setStr(val);
      }}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === '-') { e.preventDefault(); return; }
        if (e.key === 'Enter') commit();
      }}
      className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
    />
  );
}

export default function GameBoard() {
  // ── Graph state (persists across phases) ──────────────────────────────────
  const [nodes, setNodes] = useState<NimNode[]>([]);
  const [edges, setEdges] = useState<NimEdge[]>([]);

  // ── Setup UI state ────────────────────────────────────────────────────────
  const [setupSelectedId, setSetupSelectedId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    nodeId: string;
    startMouseX: number;
    startMouseY: number;
    startNodeX: number;
    startNodeY: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const nextIdRef = useRef(0);

  // ── Game config ───────────────────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [whoGoesFirst, setWhoGoesFirst] = useState<Player>('user');

  // ── Game state ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('setup');
  const [piles, setPiles] = useState<number[]>([]);
  const [adjMatrix, setAdjMatrix] = useState<number[][]>([]);
  const [lastPlayedPile, setLastPlayedPile] = useState<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState<Player>('user');
  const [selectedPile, setSelectedPile] = useState<number | null>(null);
  const [stonesToRemove, setStonesToRemove] = useState(1);
  const [winner, setWinner] = useState<Player | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [computerThinking, setComputerThinking] = useState(false);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const validPiles = useMemo(
    () => (phase === 'playing' ? getValidPileIndices(piles, adjMatrix, lastPlayedPile) : []),
    [phase, piles, adjMatrix, lastPlayedPile]
  );

  // ── Setup: graph builder handlers ─────────────────────────────────────────

  const getSetupLabel = (nodeId: string) => {
    const idx = nodes.findIndex(n => n.id === nodeId);
    return idx >= 0 ? ALPHA[idx] : '?';
  };

  const addNode = (x: number, y: number) => {
    if (nodes.length >= MAX_NODES) return;
    const id = String(nextIdRef.current++);
    setNodes(prev => [...prev, { id, x, y, weight: 1 }]);
  };

  const toggleEdge = (aId: string, bId: string) => {
    if (aId === bId) return;
    setEdges(prev => {
      const exists = prev.some(e => edgeConnects(e, aId, bId));
      return exists
        ? prev.filter(e => !edgeConnects(e, aId, bId))
        : [...prev, { fromId: aId, toId: bId }];
    });
  };

  const deleteSetupNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.fromId !== nodeId && e.toId !== nodeId));
    setSetupSelectedId(id => (id === nodeId ? null : id));
    setConnectSourceId(id => (id === nodeId ? null : id));
  };

  const handleSetupSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (didDragRef.current) { didDragRef.current = false; return; }
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.tagName === 'svg') {
      if (connectMode) { setConnectSourceId(null); return; }
      const rect = svgRef.current!.getBoundingClientRect();
      addNode(e.clientX - rect.left, e.clientY - rect.top);
      setSetupSelectedId(null);
    }
  };

  const handleSetupNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
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

  const handleSetupNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (didDragRef.current) { didDragRef.current = false; return; }
    if (connectMode) {
      if (!connectSourceId) {
        setConnectSourceId(nodeId);
      } else {
        toggleEdge(connectSourceId, nodeId);
        setConnectSourceId(null);
      }
    } else {
      setSetupSelectedId(id => (id === nodeId ? null : nodeId));
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.startMouseX;
    const dy = e.clientY - dragging.startMouseY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;
    setNodes(prev =>
      prev.map(n =>
        n.id === dragging.nodeId
          ? { ...n, x: dragging.startNodeX + dx, y: dragging.startNodeY + dy }
          : n
      )
    );
  };

  const handleSvgMouseUp = () => setDragging(null);

  // ── Game handlers ─────────────────────────────────────────────────────────

  const buildAdjMatrix = () =>
    nodes.map((ni, i) =>
      nodes.map((nj, j) =>
        i === j ? 1 : edges.some(e => edgeConnects(e, ni.id, nj.id)) ? 1 : 0
      )
    );

  const startGame = () => {
    const initialPiles = nodes.map(n => n.weight);
    const matrix = buildAdjMatrix();
    setPiles(initialPiles);
    setAdjMatrix(matrix);
    setLastPlayedPile(null);
    setCurrentTurn(whoGoesFirst);
    setSelectedPile(null);
    setStonesToRemove(1);
    setWinner(null);
    setLastMove(null);
    setComputerThinking(false);
    setPhase('playing');
  };

  const applyMove = (player: Player, pileIdx: number, stones: number, currentPiles: number[], currentMatrix: number[][]) => {
    const newPiles = [...currentPiles];
    newPiles[pileIdx] -= stones;
    const nextPlayer: Player = player === 'user' ? 'computer' : 'user';
    const nextValid = getValidPileIndices(newPiles, currentMatrix, pileIdx);

    setPiles(newPiles);
    setLastPlayedPile(pileIdx);
    setLastMove({ player, pileIdx, stones });
    setSelectedPile(null);
    setStonesToRemove(1);

    if (nextValid.length === 0) {
      setWinner(player);
      setPhase('gameover');
    } else {
      setCurrentTurn(nextPlayer);
    }
  };

  const handleUserConfirm = () => {
    if (selectedPile === null) return;
    if (stonesToRemove < 1 || stonesToRemove > piles[selectedPile]) return;
    applyMove('user', selectedPile, stonesToRemove, piles, adjMatrix);
  };

  const handleGameNodeClick = (pileIdx: number) => {
    if (currentTurn !== 'user' || winner !== null || computerThinking) return;
    if (!validPiles.includes(pileIdx)) return;
    if (selectedPile === pileIdx) {
      setSelectedPile(null);
    } else {
      setSelectedPile(pileIdx);
      setStonesToRemove(1);
    }
  };

  const resetToSetup = () => {
    setPhase('setup');
    setConnectMode(false);
    setConnectSourceId(null);
    setSetupSelectedId(null);
  };

  const playAgain = () => {
    startGame();
  };

  const resign = () => {
    setWinner('computer');
    setPhase('gameover');
  };

  // ── Computer move effect ──────────────────────────────────────────────────
  // Captures piles/adjMatrix/lastPlayedPile from closure at the moment turn changes.
  // Intentionally omits them from deps to avoid retriggering on intermediate updates.
  useEffect(() => {
    if (phase !== 'playing' || currentTurn !== 'computer' || winner !== null) return;
    setComputerThinking(true);
    const snapshotPiles = piles;
    const snapshotMatrix = adjMatrix;
    const snapshotLastPile = lastPlayedPile;
    const timer = setTimeout(() => {
      const move = getAiMove(snapshotPiles, snapshotMatrix, snapshotLastPile, difficulty);
      applyMove('computer', move.pileIdx, move.stones, snapshotPiles, snapshotMatrix);
      setComputerThinking(false);
    }, 900);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentTurn, winner]);

  // ── Shared SVG node rendering ─────────────────────────────────────────────

  const renderNodes = (interactive: 'setup' | 'game') => {
    const currentPiles = interactive === 'game' ? piles : nodes.map(n => n.weight);

    return nodes.map((node, idx) => {
      const label = ALPHA[idx] ?? '?';
      const pileSize = currentPiles[idx];
      const isSetupSelected = node.id === setupSelectedId;
      const isSetupSource = node.id === connectSourceId;

      let fill: string;
      let stroke: string;
      let strokeWidth = 1.5;
      let showGlow = false;
      let glowColor = '#6366f1';
      let showLastPlayedRing = false;
      let cursorStyle = 'grab';

      if (interactive === 'setup') {
        fill = isSetupSource ? '#064e3b' : isSetupSelected ? '#3b0764' : '#1e1b4b';
        stroke = isSetupSource ? '#10b981' : isSetupSelected ? '#a78bfa' : '#6366f1';
        strokeWidth = isSetupSelected || isSetupSource ? 2.5 : 1.5;
        showGlow = isSetupSelected || isSetupSource;
        glowColor = isSetupSource ? '#10b981' : '#8b5cf6';
      } else {
        const isSelected = selectedPile === idx;
        const isValid = validPiles.includes(idx);
        const isEmpty = pileSize === 0;
        const isLastPlayed = lastPlayedPile === idx;

        showLastPlayedRing = isLastPlayed && !isSelected;

        if (isSelected) {
          fill = '#431407'; stroke = '#f97316'; strokeWidth = 2.5;
          showGlow = true; glowColor = '#f97316'; cursorStyle = 'pointer';
        } else if (isValid) {
          fill = '#14532d'; stroke = '#22c55e'; strokeWidth = 2;
          showGlow = true; glowColor = '#22c55e'; cursorStyle = 'pointer';
        } else if (isEmpty) {
          fill = '#111827'; stroke = '#374151'; cursorStyle = 'default';
        } else {
          fill = '#1e1b4b'; stroke = '#6366f1';
          cursorStyle = 'default';
        }
      }

      const onMouseDown = interactive === 'setup'
        ? (e: React.MouseEvent) => handleSetupNodeMouseDown(node.id, e)
        : undefined;

      const onClick = interactive === 'setup'
        ? (e: React.MouseEvent) => handleSetupNodeClick(node.id, e)
        : () => handleGameNodeClick(idx);

      return (
        <g
          key={node.id}
          style={{ cursor: dragging?.nodeId === node.id ? 'grabbing' : cursorStyle }}
          onMouseDown={onMouseDown}
          onClick={onClick}
        >
          {showGlow && (
            <circle
              cx={node.x} cy={node.y} r={NODE_RADIUS + 6}
              fill="none" stroke={glowColor} strokeWidth="1" strokeOpacity="0.35"
              style={{ pointerEvents: 'none' }}
            />
          )}
          {showLastPlayedRing && (
            <circle
              cx={node.x} cy={node.y} r={NODE_RADIUS + 5}
              fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.6"
              strokeDasharray="4 3"
              style={{ pointerEvents: 'none' }}
            />
          )}
          <circle cx={node.x} cy={node.y} r={NODE_RADIUS} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <text
            x={node.x} y={node.y - 7} textAnchor="middle" dominantBaseline="middle"
            fill="white" fontSize="13" fontWeight="700"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {label}
          </text>
          <text
            x={node.x} y={node.y + 10} textAnchor="middle" dominantBaseline="middle"
            fill={pileSize === 0 && interactive === 'game' ? '#4b5563' : '#a5b4fc'}
            fontSize="12"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {pileSize}
          </text>
        </g>
      );
    });
  };

  const renderEdges = () =>
    edges.map(edge => {
      const from = nodeMap.get(edge.fromId);
      const to = nodeMap.get(edge.toId);
      if (!from || !to) return null;
      return (
        <line
          key={`${edge.fromId}-${edge.toId}`}
          x1={from.x} y1={from.y} x2={to.x} y2={to.y}
          stroke="#6366f1" strokeWidth="2.5" strokeOpacity="0.55"
          style={{ pointerEvents: 'none' }}
        />
      );
    });

  // ── Derived display values ────────────────────────────────────────────────

  const setupSelectedNode = nodes.find(n => n.id === setupSelectedId);

  const statusText = (() => {
    if (winner === 'user') return '🎉 You win!';
    if (winner === 'computer') return '💀 Computer wins.';
    if (computerThinking) return 'Computer is thinking…';
    return 'Your turn';
  })();

  const lastMoveText = (() => {
    if (!lastMove) return null;
    const label = ALPHA[lastMove.pileIdx] ?? '?';
    const who = lastMove.player === 'user' ? 'You' : 'Computer';
    return `${who} removed ${lastMove.stones} stone${lastMove.stones !== 1 ? 's' : ''} from pile ${label}`;
  })();

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'setup') {
    const setupCursor = dragging ? 'grabbing' : connectMode ? 'crosshair' : 'default';
    const atMaxNodes = nodes.length >= MAX_NODES;

    const setupHint = atMaxNodes
      ? `Maximum of ${MAX_NODES} nodes reached`
      : connectMode
        ? connectSourceId
          ? `Now click another node to connect/disconnect it from ${getSetupLabel(connectSourceId)}`
          : 'Click a node to select it as the connection source'
        : 'Click canvas to add a node · Drag to reposition · Click node to select';

    return (
      <div className="flex flex-col gap-3">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex flex-wrap items-end gap-4">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Difficulty</p>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    difficulty === d
                      ? d === 'easy' ? 'bg-emerald-600 text-white'
                        : d === 'medium' ? 'bg-amber-600 text-white'
                        : 'bg-red-700 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Who goes first</p>
            <div className="flex gap-2">
              {(['user', 'computer'] as Player[]).map(p => (
                <button
                  key={p}
                  onClick={() => setWhoGoesFirst(p)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    whoGoesFirst === p
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {p === 'user' ? 'You' : 'Computer'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={nodes.length === 0}
            className="ml-auto px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Start Game
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { setConnectMode(m => !m); setConnectSourceId(null); }}
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
              setNodes([]); setEdges([]); setSetupSelectedId(null);
              setConnectSourceId(null); setConnectMode(false);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-red-800 hover:text-white transition-colors"
          >
            Clear All
          </button>
          <span className={`text-sm ml-auto hidden md:block ${atMaxNodes ? 'text-amber-400' : 'text-slate-500'}`}>
            {setupHint}
          </span>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden select-none">
          <svg
            ref={svgRef}
            className="w-full"
            style={{ height: '420px', cursor: setupCursor }}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
            onClick={handleSetupSvgClick}
          >
            {nodes.length === 0 && (
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
                fill="#475569" fontSize="15" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                Click anywhere to add your first node
              </text>
            )}
            {renderEdges()}
            {renderNodes('setup')}
          </svg>
        </div>

        {setupSelectedNode && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              Node {getSetupLabel(setupSelectedNode.id)}
            </p>
            <div className="flex items-center gap-3">
              <label className="text-slate-300 text-sm">Pile size</label>
              <WeightInput
                key={setupSelectedNode.id}
                value={setupSelectedNode.weight}
                onChange={val =>
                  setNodes(prev =>
                    prev.map(n => n.id === setupSelectedNode.id ? { ...n, weight: val } : n)
                  )
                }
              />
              <button
                onClick={() => deleteSetupNode(setupSelectedNode.id)}
                className="ml-auto text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Delete node
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Playing / Gameover phase ──────────────────────────────────────────────

  const isUserTurn = currentTurn === 'user' && phase === 'playing' && winner === null;

  return (
    <div className="flex flex-col gap-3">
      <div className={`rounded-xl border p-3 flex items-center justify-between flex-wrap gap-3 ${
        winner === 'user' ? 'border-emerald-700 bg-emerald-950/40'
        : winner === 'computer' ? 'border-red-800 bg-red-950/40'
        : 'border-slate-700 bg-slate-800/60'
      }`}>
        <div>
          <p className={`font-semibold text-lg ${
            winner === 'user' ? 'text-emerald-300'
            : winner === 'computer' ? 'text-red-300'
            : computerThinking ? 'text-amber-300'
            : 'text-white'
          }`}>
            {statusText}
          </p>
          {lastMoveText && (
            <p className="text-slate-400 text-sm mt-0.5">{lastMoveText}</p>
          )}
        </div>
        <div className="flex gap-2">
          {phase === 'gameover' ? (
            <>
              <button
                onClick={playAgain}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={resetToSetup}
                className="px-4 py-2 bg-slate-700 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors"
              >
                Edit Graph
              </button>
            </>
          ) : (
            <button
              onClick={resign}
              className="px-4 py-2 bg-slate-700 text-slate-200 text-sm font-medium rounded-lg hover:bg-red-800 hover:text-white transition-colors"
            >
              Resign
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden select-none">
        <svg
          className="w-full"
          style={{
            height: '420px',
            cursor: 'default',
          }}
        >
          {renderEdges()}
          {renderNodes('game')}
        </svg>
      </div>

      {isUserTurn && (
        <div className="flex gap-4 flex-wrap items-end">
          {selectedPile !== null ? (
            <div className="flex-1 min-w-64 bg-slate-800 border border-orange-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                Pile {ALPHA[selectedPile]} — {piles[selectedPile]} stone{piles[selectedPile] !== 1 ? 's' : ''} remaining
              </p>
              <div className="flex items-center gap-3">
                <label className="text-slate-300 text-sm">Remove</label>
                <StonesInput
                  key={selectedPile}
                  value={stonesToRemove}
                  max={piles[selectedPile]}
                  onChange={setStonesToRemove}
                />
                <span className="text-slate-400 text-sm">
                  stone{stonesToRemove !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleUserConfirm}
                  className="ml-auto px-4 py-1.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-500 transition-colors"
                >
                  Confirm Move
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-64 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center">
              <p className="text-slate-500 text-sm">
                {validPiles.length === 0
                  ? 'No valid moves available'
                  : 'Click a highlighted pile to select your move'}
              </p>
            </div>
          )}
        </div>
      )}

      {computerThinking && (
        <div className="flex-1 min-w-64 bg-slate-800/50 border border-amber-800/40 rounded-xl p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <p className="text-amber-300/80 text-sm">Computer is calculating its move…</p>
        </div>
      )}
    </div>
  );
}
