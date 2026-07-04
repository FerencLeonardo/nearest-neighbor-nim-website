'use client';

import { useState, useRef } from 'react';
import { nnnCalc, getStartingPositions } from '@/lib/nim';
import { buildAdjMatrix } from '@/lib/graph';
import GraphEditor, { useGraphEditor } from '@/components/GraphEditor';
import WeightInput from '@/components/WeightInput';

interface Result {
  nimValue: number;
  positions: Array<{ label: string; value: number }>;
}

export default function GraphBuilder() {
  const [result, setResult] = useState<Result | null>(null);
  const [calculating, setCalculating] = useState(false);
  const memoRef = useRef<Map<string, number>>(new Map());
  const lastStructureRef = useRef<string | null>(null);

  const editor = useGraphEditor(() => setResult(null));
  const { nodes, edges, selectedNode, getLabel, setNodeWeight, deleteNode } = editor;

  const calculate = () => {
    if (nodes.length === 0 || calculating) return;
    const piles = nodes.map(n => n.weight);
    const adjMatrix = buildAdjMatrix(nodes, edges);
    // Memo entries key on the full pile state, so they stay valid across runs
    // as long as the graph structure is unchanged.
    const structureKey = JSON.stringify(adjMatrix);
    if (structureKey !== lastStructureRef.current) {
      memoRef.current = new Map();
      lastStructureRef.current = structureKey;
    }
    setCalculating(true);
    // Compute blocks the main thread; rAF + setTimeout(0) defers it to the
    // task after the next paint so the loading state is actually visible.
    requestAnimationFrame(() => {
      setTimeout(() => {
        const { nimValue, memo } = nnnCalc(piles, adjMatrix, memoRef.current);
        const positions = getStartingPositions(memo, piles);
        setResult({ nimValue, positions });
        setCalculating(false);
      }, 0);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <GraphEditor editor={editor} />

      <div className="flex gap-3 flex-wrap items-stretch">
        {selectedNode ? (
          <div className="flex-1 min-w-64 bg-card border border-grid rounded-lg px-4 py-2 flex items-center gap-3">
            <span className="font-display italic text-ink text-[15px] shrink-0">
              Node {getLabel(selectedNode.id)}
            </span>
            <label className="text-graphite text-sm shrink-0">Pile size</label>
            <WeightInput
              key={selectedNode.id}
              value={selectedNode.weight}
              onChange={val => setNodeWeight(selectedNode.id, val)}
            />
            <button
              onClick={() => deleteNode(selectedNode.id)}
              className="ml-auto text-sm text-redpen hover:underline underline-offset-2 transition-colors shrink-0"
            >
              Delete node
            </button>
          </div>
        ) : (
          <div className="flex-1 min-w-64 bg-card/60 border border-grid rounded-lg px-4 py-3.5 flex items-center">
            <p className="font-display italic text-graphite text-sm">
              {nodes.length === 0 ? 'Add nodes to get started' : 'Select a node to edit its pile'}
            </p>
          </div>
        )}

        <button
          onClick={calculate}
          disabled={nodes.length === 0 || calculating}
          className="ml-auto px-6 py-2.5 bg-pen text-white font-medium rounded-md hover:bg-pen-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center"
        >
          {calculating ? 'Calculating…' : 'Calculate nim value'}
        </button>
      </div>

      {calculating && (
        <div className="bg-card border border-grid rounded-lg p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-pen motion-safe:animate-pulse" />
          <p className="font-display italic text-graphite text-sm">
            Calculating — larger graphs can take a moment.
          </p>
        </div>
      )}

      {result && (
        <div className="answer-in bg-card border-4 border-double border-ink rounded-md p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-graphite text-[11px] font-medium uppercase tracking-[0.12em] mb-1">
                Nim value
              </p>
              <p
                data-nim-value
                className={`font-display font-semibold text-4xl leading-none tabular-nums ${
                  result.nimValue > 0 ? 'text-pen' : 'text-redpen'
                }`}
              >
                {result.nimValue}
              </p>
            </div>
            <p
              className={`font-display italic text-[15px] ${
                result.nimValue > 0 ? 'text-pen' : 'text-redpen'
              }`}
            >
              {result.nimValue > 0
                ? 'First player wins with perfect play.'
                : 'Second player wins with perfect play.'}
            </p>
          </div>

          {result.positions.length > 0 && (
            <>
              <div className="border-t border-grid mt-3 mb-3" />
              <p className="text-graphite text-[11px] font-medium uppercase tracking-[0.12em] mb-2">
                Starting positions
              </p>
              <div data-positions className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-1.5">
                {result.positions.map(p => (
                  <div
                    key={p.label}
                    className="bg-card border border-grid rounded px-2 py-1 text-sm flex justify-between items-baseline"
                  >
                    <span className="font-display italic text-ink">{p.label}</span>
                    <span className={`font-mono ${p.value > 0 ? 'text-pen' : 'text-redpen'}`}>
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
