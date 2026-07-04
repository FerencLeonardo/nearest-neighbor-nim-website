'use client';

import { useState, useEffect, useRef } from 'react';
import { ALPHA } from '@/lib/nim';
import { getValidPileIndices, getAiMove, type Difficulty, type Player } from '@/lib/game';
import { buildAdjMatrix } from '@/lib/graph';
import GraphEditor, {
  useGraphEditor,
  EdgeLines,
  NodeGlyph,
  Quadrille,
  INK,
  PEN,
  PEN_WASH,
  REDPEN,
  FADED,
  HIGHLIGHT_WASH,
} from '@/components/GraphEditor';
import NumberInput from '@/components/NumberInput';
import WeightInput from '@/components/WeightInput';

type Phase = 'setup' | 'playing' | 'gameover';

interface LastMove {
  player: Player;
  pileIdx: number;
  stones: number;
}

export default function GameBoard() {
  // ── Graph state (persists across phases via the editor hook) ─────────────
  const editor = useGraphEditor();
  const { nodes, edges, nodeMap, selectedNode, getLabel, setNodeWeight, deleteNode } = editor;

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
  // AI search cache; entries are only valid for a fixed adjMatrix, so it is
  // reset on every game start (the graph can change between games).
  const aiMemoRef = useRef<Map<string, number>>(new Map());

  const computerThinking = phase === 'playing' && currentTurn === 'computer' && winner === null;

  const validPiles =
    phase === 'playing' ? getValidPileIndices(piles, adjMatrix, lastPlayedPile) : [];

  // ── Game handlers ─────────────────────────────────────────────────────────

  const startGame = () => {
    aiMemoRef.current = new Map();
    setPiles(nodes.map(n => n.weight));
    setAdjMatrix(buildAdjMatrix(nodes, edges));
    setLastPlayedPile(null);
    setCurrentTurn(whoGoesFirst);
    setSelectedPile(null);
    setStonesToRemove(1);
    setWinner(null);
    setLastMove(null);
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
    if (currentTurn !== 'user' || winner !== null) return;
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
    editor.resetInteraction();
  };

  const resign = () => {
    setWinner('computer');
    setPhase('gameover');
  };

  // ── Computer move effect ──────────────────────────────────────────────────
  // Captures piles/adjMatrix/lastPlayedPile from closure at the moment the
  // computer's turn starts. Intentionally omits them from deps to avoid
  // retriggering on intermediate updates.
  useEffect(() => {
    if (!computerThinking) return;
    const timer = setTimeout(() => {
      const move = getAiMove(piles, adjMatrix, lastPlayedPile, difficulty, aiMemoRef.current);
      applyMove('computer', move.pileIdx, move.stones, piles, adjMatrix);
    }, 900);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computerThinking]);

  // ── Game-phase node rendering ─────────────────────────────────────────────

  const renderGameNodes = () =>
    nodes.map((node, idx) => {
      const pileSize = piles[idx];
      const isSelected = selectedPile === idx;
      const isValid = validPiles.includes(idx);
      const isEmpty = pileSize === 0;
      const isLastPlayed = lastPlayedPile === idx && !isSelected;

      let fill = '#FFFFFF';
      let stroke = FADED;
      let strokeWidth = 1.5;
      let pipFill = '#7C8797';
      let cursorStyle = 'default';

      if (isSelected) {
        fill = PEN_WASH; stroke = PEN; strokeWidth = 2.5;
        pipFill = INK; cursorStyle = 'pointer';
      } else if (isValid) {
        fill = HIGHLIGHT_WASH; stroke = INK; strokeWidth = 1.75;
        pipFill = INK; cursorStyle = 'pointer';
      }

      return (
        <g
          key={node.id}
          data-node
          data-pips={pileSize}
          role="button"
          aria-label={`Pile ${ALPHA[idx] ?? '?'}, ${pileSize} stone${pileSize !== 1 ? 's' : ''}`}
          style={{ cursor: cursorStyle }}
          onClick={() => handleGameNodeClick(idx)}
        >
          <NodeGlyph
            node={node}
            label={ALPHA[idx] ?? '?'}
            value={pileSize}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            dashed={isEmpty && !isValid && !isSelected}
            ringColor={isSelected ? PEN : isLastPlayed ? REDPEN : undefined}
            ringDashed={isLastPlayed && !isSelected}
            pipFill={pipFill}
            labelFill={isEmpty ? FADED : INK}
          />
        </g>
      );
    });

  // ── Derived display values ────────────────────────────────────────────────

  const statusText = (() => {
    if (winner === 'user') return 'You win!';
    if (winner === 'computer') return 'Computer wins.';
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
    const canStart = nodes.some(n => n.weight > 0);

    return (
      <div className="flex flex-col gap-3">
        <div className="bg-card border border-grid rounded-lg p-3 flex flex-wrap items-end gap-4">
          <div>
            <p className="text-graphite text-[11px] font-medium uppercase tracking-[0.12em] mb-2">
              Difficulty
            </p>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize border transition-colors ${
                    difficulty === d
                      ? 'bg-ink border-ink text-paper'
                      : 'bg-card border-grid text-graphite hover:text-ink hover:border-ink'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-graphite text-[11px] font-medium uppercase tracking-[0.12em] mb-2">
              Who goes first
            </p>
            <div className="flex gap-2">
              {(['user', 'computer'] as Player[]).map(p => (
                <button
                  key={p}
                  onClick={() => setWhoGoesFirst(p)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    whoGoesFirst === p
                      ? 'bg-ink border-ink text-paper'
                      : 'bg-card border-grid text-graphite hover:text-ink hover:border-ink'
                  }`}
                >
                  {p === 'user' ? 'You' : 'Computer'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={!canStart}
            className="ml-auto px-6 py-2.5 bg-pen text-white font-medium rounded-md hover:bg-pen-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Start game
          </button>
        </div>

        <GraphEditor editor={editor} />

        {selectedNode && (
          <div className="bg-card border border-grid rounded-lg p-3">
            <p className="font-display italic text-ink text-[15px] mb-2">
              Node {getLabel(selectedNode.id)}
            </p>
            <div className="flex items-center gap-3">
              <label className="text-graphite text-sm">Pile size</label>
              <WeightInput
                key={selectedNode.id}
                value={selectedNode.weight}
                onChange={val => setNodeWeight(selectedNode.id, val)}
              />
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="ml-auto text-sm text-redpen hover:underline underline-offset-2 transition-colors"
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
      <div className={`rounded-lg border p-3 flex items-center justify-between flex-wrap gap-3 ${
        winner === 'user' ? 'border-pen bg-pen-wash'
        : winner === 'computer' ? 'border-redpen bg-red-wash'
        : 'border-grid bg-card'
      }`}>
        <div>
          <p className={`font-display font-semibold text-lg ${
            winner === 'user' ? 'text-pen'
            : winner === 'computer' ? 'text-redpen'
            : computerThinking ? 'text-graphite italic'
            : 'text-ink'
          }`}>
            {statusText}
          </p>
          {lastMoveText && (
            <p className="text-graphite text-sm mt-0.5">{lastMoveText}</p>
          )}
        </div>
        <div className="flex gap-2">
          {phase === 'gameover' ? (
            <>
              <button
                onClick={startGame}
                className="px-4 py-2 bg-pen text-white text-sm font-medium rounded-md hover:bg-pen-deep transition-colors"
              >
                Play again
              </button>
              <button
                onClick={resetToSetup}
                className="px-4 py-2 bg-card border border-grid text-ink text-sm font-medium rounded-md hover:border-ink transition-colors"
              >
                Edit graph
              </button>
            </>
          ) : (
            <button
              onClick={resign}
              className="px-4 py-2 bg-card border border-grid text-graphite text-sm font-medium rounded-md hover:text-redpen hover:border-redpen transition-colors"
            >
              Resign
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-grid bg-card overflow-hidden select-none">
        <svg className="w-full" style={{ height: '420px', cursor: 'default' }}>
          <Quadrille />
          <EdgeLines edges={edges} nodeMap={nodeMap} />
          {renderGameNodes()}
        </svg>
      </div>

      {isUserTurn && (
        <div className="flex gap-4 flex-wrap items-end">
          {selectedPile !== null ? (
            <div className="flex-1 min-w-64 bg-card border border-pen rounded-lg p-4">
              <p className="font-display italic text-ink text-[15px] mb-3">
                Pile {ALPHA[selectedPile]} — {piles[selectedPile]} stone{piles[selectedPile] !== 1 ? 's' : ''} remaining
              </p>
              <div className="flex items-center gap-3">
                <label className="text-graphite text-sm">Remove</label>
                <NumberInput
                  key={selectedPile}
                  value={stonesToRemove}
                  min={1}
                  max={piles[selectedPile]}
                  onChange={setStonesToRemove}
                  className="w-20 px-3 py-1.5"
                />
                <span className="text-graphite text-sm">
                  stone{stonesToRemove !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleUserConfirm}
                  className="ml-auto px-4 py-1.5 bg-pen text-white text-sm font-medium rounded-md hover:bg-pen-deep transition-colors"
                >
                  Confirm move
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-64 bg-card/60 border border-grid rounded-lg p-4 flex items-center">
              <p className="font-display italic text-graphite text-sm">
                {validPiles.length === 0
                  ? 'No valid moves available'
                  : 'Click a highlighted pile to select your move'}
              </p>
            </div>
          )}
        </div>
      )}

      {computerThinking && (
        <div className="flex-1 min-w-64 bg-card border border-grid rounded-lg p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-graphite motion-safe:animate-pulse" />
          <p className="font-display italic text-graphite text-sm">
            Computer is calculating its move…
          </p>
        </div>
      )}
    </div>
  );
}
