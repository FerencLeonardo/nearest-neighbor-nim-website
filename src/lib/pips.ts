// Dice-face arrangements for pile sizes 0–5 (MAX_WEIGHT = 5), as [dx, dy]
// offsets from the node center. Piles are drawn as physical stones, not
// numerals — the signature of the site's visual language.
export const PIP_LAYOUTS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [],
  [[0, 0]],
  [[-8.5, 8.5], [8.5, -8.5]],
  [[-9.5, 9.5], [0, 0], [9.5, -9.5]],
  [[-8.5, -8.5], [8.5, -8.5], [-8.5, 8.5], [8.5, 8.5]],
  [[-9, -9], [9, -9], [0, 0], [-9, 9], [9, 9]],
];

export const PIP_RADIUS = 4.2;
