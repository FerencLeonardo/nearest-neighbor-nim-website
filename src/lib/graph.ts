export interface NimNode {
  id: string;
  x: number;
  y: number;
  weight: number;
}

export interface NimEdge {
  fromId: string;
  toId: string;
}

export function edgeConnects(e: NimEdge, aId: string, bId: string): boolean {
  return (e.fromId === aId && e.toId === bId) || (e.fromId === bId && e.toId === aId);
}

// Diagonal is 1: a pile is considered its own neighbor, so consecutive moves
// on the same pile are legal.
export function buildAdjMatrix(nodes: NimNode[], edges: NimEdge[]): number[][] {
  return nodes.map((ni, i) =>
    nodes.map((nj, j) =>
      i === j ? 1 : edges.some(e => edgeConnects(e, ni.id, nj.id)) ? 1 : 0
    )
  );
}
