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

export function getAiMove(
  piles: number[],
  adjMatrix: number[][],
  lastPile: number | null,
  difficulty: Difficulty
): { pileIdx: number; stones: number } {
  const validPiles = getValidPileIndices(piles, adjMatrix, lastPile);

  if (Math.random() < OPTIMAL_CHANCE[difficulty]) {
    for (const pileIdx of validPiles) {
      for (let stones = 1; stones <= piles[pileIdx]; stones++) {
        const newPiles = [...piles];
        newPiles[pileIdx] -= stones;
        if (nnnCalcFrom(newPiles, adjMatrix, pileIdx) === 0) {
          return { pileIdx, stones };
        }
      }
    }
  }

  const pileIdx = validPiles[Math.floor(Math.random() * validPiles.length)];
  const stones = Math.ceil(Math.random() * piles[pileIdx]);
  return { pileIdx, stones };
}
