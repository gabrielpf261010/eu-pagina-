import type { FloorId } from '../constants';
import type { Point } from '../types';
import type { World } from '../world/World';

/**
 * A* em grade (8 direções, sem cortar quinas). Usado por alunos, professora e Gil
 * para contornar paredes, carteiras e qualquer tile sólido do mapa.
 */
export interface PathOptions {
  /** Permite que o destino seja um tile sólido (ex.: uma cadeira). */
  allowSolidGoal?: boolean;
  maxNodes?: number;
}

class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];

  get size() {
    return this.ids.length;
  }

  push(id: number, key: number) {
    const ids = this.ids;
    const keys = this.keys;
    let c = ids.length;
    ids.push(id);
    keys.push(key);
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (keys[p] <= keys[c]) break;
      [ids[p], ids[c]] = [ids[c], ids[p]];
      [keys[p], keys[c]] = [keys[c], keys[p]];
      c = p;
    }
  }

  pop(): number {
    const ids = this.ids;
    const keys = this.keys;
    const top = ids[0];
    const lastId = ids.pop()!;
    const lastKey = keys.pop()!;
    if (ids.length > 0) {
      ids[0] = lastId;
      keys[0] = lastKey;
      let p = 0;
      for (;;) {
        const l = p * 2 + 1;
        const r = l + 1;
        let m = p;
        if (l < ids.length && keys[l] < keys[m]) m = l;
        if (r < ids.length && keys[r] < keys[m]) m = r;
        if (m === p) break;
        [ids[p], ids[m]] = [ids[m], ids[p]];
        [keys[p], keys[m]] = [keys[m], keys[p]];
        p = m;
      }
    }
    return top;
  }
}

const DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function findPath(
  world: World,
  floor: FloorId,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  opts: PathOptions = {},
): Point[] | null {
  const m = world.map(floor);
  const W = m.width;
  const H = m.height;
  if (sx < 0 || sy < 0 || sx >= W || sy >= H || tx < 0 || ty < 0 || tx >= W || ty >= H) return null;

  const goalSolid = world.isSolidTile(floor, tx, ty);
  if (goalSolid && !opts.allowSolidGoal) return null;

  const n = W * H;
  const g = new Float32Array(n).fill(Infinity);
  const parent = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const start = sy * W + sx;
  const goal = ty * W + tx;
  const heuristic = (x: number, y: number) => {
    const dx = Math.abs(x - tx);
    const dy = Math.abs(y - ty);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };

  const heap = new MinHeap();
  g[start] = 0;
  heap.push(start, heuristic(sx, sy));
  const maxNodes = opts.maxNodes ?? 40000;
  let expanded = 0;

  while (heap.size > 0) {
    const cur = heap.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;

    if (cur === goal) {
      const path: Point[] = [];
      let i = cur;
      while (i !== -1) {
        path.push({ x: i % W, y: (i / W) | 0 });
        i = parent[i];
      }
      return path.reverse();
    }
    if (++expanded > maxNodes) return null;

    const cx = cur % W;
    const cy = (cur / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (closed[ni]) continue;
      if (ni !== goal || !opts.allowSolidGoal) {
        if (world.isSolidTile(floor, nx, ny)) continue;
      }
      const diag = dx !== 0 && dy !== 0;
      if (diag && (world.isSolidTile(floor, cx + dx, cy) || world.isSolidTile(floor, cx, cy + dy))) continue;
      const ng = g[cur] + (diag ? Math.SQRT2 : 1);
      if (ng < g[ni]) {
        g[ni] = ng;
        parent[ni] = cur;
        heap.push(ni, ng + heuristic(nx, ny));
      }
    }
  }
  return null;
}

/** Tile livre mais próximo do ponto informado (espiral). */
export function nearestFree(world: World, floor: FloorId, tx: number, ty: number, maxR = 10): Point | null {
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (!world.isSolidTile(floor, tx + dx, ty + dy)) return { x: tx + dx, y: ty + dy };
      }
    }
  }
  return null;
}
