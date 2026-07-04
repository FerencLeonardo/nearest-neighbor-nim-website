import { nnnCalcFrom } from './nim';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Player = 'user' | 'computer';

const OPTIMAL_CHANCE: Record<Difficulty, number> = {
  easy: 0,
  medium: 0.6,
  hard: 0.90,
};

export function getValidPileIndices(
  piles: number[],
  adjMatrix: number[][],
  lastPile: number | null
): number[] {
  if (lastPile === null) {
    return piles.map((_, i) => i).filter(i => piles[i] > 0);
  }
  return piles.map((_, i) => i).filter(
    i => adjMatrix[lastPile][i] === 1 && piles[i] > 0
  );
}

// `memo` entries stay valid only while adjMatrix is unchanged; callers that
// pass one (e.g. a per-game cache) must reset it when the graph changes.
export function getAiMove(
  piles: number[],
  adjMatrix: number[][],
  lastPile: number | null,
  difficulty: Difficulty,
  memo?: Map<string, number>
): { pileIdx: number; stones: number } {
  const validPiles = getValidPileIndices(piles, adjMatrix, lastPile);

  if (Math.random() < OPTIMAL_CHANCE[difficulty]) {
    const searchMemo = memo ?? new Map<string, number>();
    for (const pileIdx of validPiles) {
      for (let stones = 1; stones <= piles[pileIdx]; stones++) {
        const newPiles = [...piles];
        newPiles[pileIdx] -= stones;
        if (nnnCalcFrom(newPiles, adjMatrix, pileIdx, searchMemo) === 0) {
          return { pileIdx, stones };
        }
      }
    }
  }

  const pileIdx = validPiles[Math.floor(Math.random() * validPiles.length)];
  const stones = Math.floor(Math.random() * piles[pileIdx]) + 1;
  return { pileIdx, stones };
}
