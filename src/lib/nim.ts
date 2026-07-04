export const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function nnnCalc(
  piles: number[],
  adjMatrix: number[][],
  existingMemo?: Map<string, number>
): { nimValue: number; memo: Map<string, number> } {
  const memo = existingMemo ?? new Map<string, number>();
  let nimValue = 0;
  for (let i = 0; i < piles.length; i++) {
    nimValue = Math.max(nimValue, nnnCalcR(piles, adjMatrix, i, memo));
  }
  return { nimValue, memo };
}

function nnnCalcR(
  piles: number[],
  adjMatrix: number[][],
  lastPile: number,
  memo: Map<string, number>
): number {
  const key = ALPHA[lastPile] + JSON.stringify(piles);

  if (memo.has(key)) {
    return memo.get(key)!;
  }

  let endGame = true;
  for (let neighborPile = 0; neighborPile < piles.length; neighborPile++) {
    if (adjMatrix[lastPile][neighborPile] === 1 && piles[neighborPile] > 0) {
      endGame = false;
      break;
    }
  }
  if (endGame) {
    memo.set(key, 0);
    return 0;
  }

  const optionsValSet = new Set<number>();

  for (let neighborPile = 0; neighborPile < piles.length; neighborPile++) {
    if (adjMatrix[lastPile][neighborPile] === 1 && piles[neighborPile] > 0) {
      for (let stonesToRemove = 1; stonesToRemove <= piles[neighborPile]; stonesToRemove++) {
        const newPiles = [...piles];
        newPiles[neighborPile] -= stonesToRemove;
        optionsValSet.add(nnnCalcR(newPiles, adjMatrix, neighborPile, memo));
      }
    }
  }

  const mexValue = calcMex(optionsValSet);
  memo.set(key, mexValue);
  return mexValue;
}

function calcMex(optionsValSet: Set<number>): number {
  let mex = 0;
  while (optionsValSet.has(mex)) {
    mex++;
  }
  return mex;
}

export function nnnCalcFrom(
  piles: number[],
  adjMatrix: number[][],
  fromPile: number,
  existingMemo?: Map<string, number>
): number {
  const memo = existingMemo ?? new Map<string, number>();
  return nnnCalcR(piles, adjMatrix, fromPile, memo);
}

export function getStartingPositions(
  memo: Map<string, number>,
  initialPiles: number[]
): Array<{ label: string; value: number }> {
  const positions: Array<{ label: string; value: number }> = [];
  const pileStr = JSON.stringify(initialPiles);

  for (let i = 0; i < initialPiles.length; i++) {
    const value = memo.get(ALPHA[i] + pileStr);
    if (value !== undefined) {
      positions.push({ label: ALPHA[i], value });
    }
  }

  positions.sort((a, b) => b.value - a.value);
  return positions;
}
