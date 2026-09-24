/** How many pile cards mount or fetch in one step. */
export const PILE_CARD_BATCH = 12;

export type PileCell = { col: number; row: number };

/**
 * Ulam-style spiral index from absolute cell coords.
 * (0,0)=0, then right → up → left → down, delaying duplicates near the center.
 */
export function spiralIndex(col: number, row: number): number {
  if (col === 0 && row === 0) return 0;
  const layer = Math.max(Math.abs(col), Math.abs(row));
  const prevMax = (2 * (layer - 1) + 1) ** 2;
  const t = 2 * layer;
  if (col === layer && row > -layer) {
    return prevMax + (row - (1 - layer));
  }
  if (row === layer && col < layer) {
    return prevMax + t + (layer - col) - 1;
  }
  if (col === -layer && row < layer) {
    return prevMax + 2 * t + (layer - row) - 1;
  }
  return prevMax + 3 * t + (col + layer) - 1;
}

function cellDistance(cell: PileCell, centerCol: number, centerRow: number) {
  const dx = cell.col - centerCol;
  const dy = cell.row - centerRow;
  return dx * dx + dy * dy;
}

/**
 * Mount at most one batch: the cells closest to the view.
 * Ask for another batch only when one of those cells has no toy yet.
 */
export function selectPileMounts(
  cells: PileCell[],
  loadedCount: number,
  centerCol: number,
  centerRow: number,
  batch = PILE_CARD_BATCH,
): { mounts: PileCell[]; needsMore: boolean } {
  const ranked = [...cells].sort((a, b) => {
    const distance = cellDistance(a, centerCol, centerRow) - cellDistance(b, centerCol, centerRow);
    if (distance !== 0) return distance;
    return spiralIndex(a.col, a.row) - spiralIndex(b.col, b.row);
  });
  const top = ranked.slice(0, Math.max(0, batch));
  const needsMore =
    loadedCount <= 0
      ? cells.length > 0
      : top.some((cell) => spiralIndex(cell.col, cell.row) >= loadedCount);
  const mounts = top.filter((cell) => spiralIndex(cell.col, cell.row) < loadedCount);
  return { mounts, needsMore };
}
