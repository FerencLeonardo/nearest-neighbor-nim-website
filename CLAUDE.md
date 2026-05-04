@AGENTS.md

# Nearest Neighbor Nim Website

Next.js 16 + React 19 + Tailwind CSS v4 + TypeScript.

## Hard constraints

- **Never modify** `nnnCalc`, `nnnCalcR`, or `calcMex` in `src/lib/nim.ts`. This is the user's original research. Only touch the file to adjust exports or TypeScript types — always confirm before any logic change.
- **Never modify** `getAiMove` in `src/lib/game.ts` without confirmation.

## Key constants

- `src/lib/constants.ts` — `MAX_NODES = 10` (shared by GraphBuilder and GameBoard)
- `src/components/WeightInput.tsx` — `MAX_WEIGHT = 5` (exported from component)

## Architecture notes

- `nnnCalc` returns `{ nimValue, memo }` and accepts optional `existingMemo` — memo is reused across runs when graph structure (adjMatrix) is unchanged, reset when structure changes.
- Negative input is blocked via `onKeyDown` (`e.key === '-'`), not `onChange` — `type="number"` inputs return `""` not `"-"` for partial input.
- `setTimeout(0)` before heavy computation lets React flush loading state first.
