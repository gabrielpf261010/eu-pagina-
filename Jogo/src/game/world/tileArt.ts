import { T, isWallLike } from './tiles';
import type { Facing, GameMap } from '../types';

/**
 * Pixel art procedural: cada tile é desenhado a partir de retângulos 1:1 em uma grade 16x16.
 * Para trocar por spritesheets no futuro, basta substituir `drawTile`.
 */
export interface DrawCtx {
  g: CanvasRenderingContext2D;
  x: number;
  y: number;
  tx: number;
  ty: number;
  map: GameMap;
}

type Art = (c: DrawCtx) => void;

// ---------------------------------------------------------------- helpers
const r = (c: DrawCtx, color: string, x: number, y: number, w: number, h: number) => {
  c.g.fillStyle = color;
  c.g.fillRect(c.x + x, c.y + y, w, h);
};

const disc = (c: DrawCtx, color: string, cx: number, cy: number, rad: number) => {
  for (let dy = -rad; dy <= rad; dy++) {
    const w = Math.floor(Math.sqrt(rad * rad - dy * dy + 0.25));
    r(c, color, cx - w, cy + dy, w * 2 + 1, 1);
  }
};

export function hash(x: number, y: number, n = 0): number {
  let h = Math.imul(x + 1013, 374761393) + Math.imul(y + 7919, 668265263) + Math.imul(n + 31, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const obj = (c: DrawCtx, dx: number, dy: number): number => {
  const x = c.tx + dx;
  const y = c.ty + dy;
  if (x < 0 || y < 0 || x >= c.map.width || y >= c.map.height) return 0;
  return c.map.objects[y * c.map.width + x];
};

const pick = <V,>(arr: V[], v: number): V => arr[Math.floor(v * arr.length) % arr.length];

/** Sombra suave projetada pelas paredes sobre o chão. */
const wallShade = (c: DrawCtx) => {
  if (isWallLike(obj(c, 0, -1))) {
    r(c, 'rgba(0,0,0,0.30)', 0, 0, 16, 3);
    r(c, 'rgba(0,0,0,0.14)', 0, 3, 16, 2);
  }
};

// ---------------------------------------------------------------- chão
function wood(c: DrawCtx, base: string, alt: string, line: string) {
  r(c, base, 0, 0, 16, 16);
  for (let i = 0; i < 4; i++) {
    if (hash(c.tx, c.ty, i) > 0.55) r(c, alt, 0, i * 4, 16, 3);
    r(c, line, 0, i * 4 + 3, 16, 1);
    r(c, line, 1 + Math.floor(hash(c.tx, c.ty, i + 10) * 13), i * 4, 1, 3);
  }
  wallShade(c);
}

/** Cerâmica: quadrados com rejunte. */
function checker(c: DrawCtx, a: string, b: string, line: string, size: number) {
  r(c, a, 0, 0, 16, 16);
  for (let yy = 0; yy < 16; yy += size) {
    for (let xx = 0; xx < 16; xx += size) {
      if (((xx + yy) / size) % 2 === 1) r(c, b, xx, yy, size, size);
    }
  }
  r(c, line, 0, 15, 16, 1);
  r(c, line, 15, 0, 1, 16);
  if (size === 8) {
    r(c, line, 0, 7, 16, 1);
    r(c, line, 7, 0, 1, 16);
  }
  wallShade(c);
}

const grass: Art = (c) => {
  r(c, '#3b6838', 0, 0, 16, 16);
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(hash(c.tx, c.ty, i) * 14);
    const y = Math.floor(hash(c.tx, c.ty, i + 7) * 13);
    r(c, i % 2 ? '#4b7d45' : '#2f5a2f', x, y, 1, 2);
  }
  if (hash(c.tx, c.ty, 99) > 0.93) {
    r(c, '#e8d65a', 5, 8, 1, 1);
    r(c, '#f5f0f0', 11, 4, 1, 1);
  }
};

const concrete: Art = (c) => {
  r(c, '#8a8c8d', 0, 0, 16, 16);
  for (let i = 0; i < 3; i++) {
    r(c, '#828485', Math.floor(hash(c.tx, c.ty, i) * 15), Math.floor(hash(c.tx, c.ty, i + 3) * 15), 1, 1);
  }
  r(c, '#767879', 0, 15, 16, 1);
  r(c, '#767879', 15, 0, 1, 16);
  r(c, '#9a9c9d', 0, 0, 16, 1);
  wallShade(c);
};

const sidewalk: Art = (c) => {
  r(c, '#9a9a96', 0, 0, 16, 16);
  r(c, '#85857f', 0, 15, 16, 1);
  r(c, '#85857f', (c.tx % 2) * 8 + 7, 0, 1, 16);
};

const asphalt: Art = (c) => {
  r(c, '#35383d', 0, 0, 16, 16);
  for (let i = 0; i < 4; i++) {
    r(c, '#3d4046', Math.floor(hash(c.tx, c.ty, i) * 15), Math.floor(hash(c.tx, c.ty, i + 5) * 15), 2, 1);
  }
};

const crosswalk: Art = (c) => {
  asphalt(c);
  r(c, '#d6d6d0', c.tx % 2 === 0 ? 2 : 0, 3, 14, 10);
};

const paver: Art = (c) => {
  r(c, '#a6a398', 0, 0, 16, 16);
  r(c, '#8c897f', 0, 7, 16, 1);
  r(c, '#8c897f', 0, 15, 16, 1);
  r(c, '#8c897f', 7, 0, 1, 7);
  r(c, '#8c897f', 3, 8, 1, 7);
  r(c, '#8c897f', 11, 8, 1, 7);
  if (hash(c.tx, c.ty) > 0.5) r(c, '#b2afa4', 1, 1, 5, 5);
  wallShade(c);
};

const carpet: Art = (c) => {
  r(c, '#6d3a42', 0, 0, 16, 16);
  r(c, '#7d4650', 2, 2, 12, 12);
  r(c, '#6d3a42', 4, 4, 8, 8);
  r(c, '#8a5560', 7, 7, 2, 2);
  wallShade(c);
};

const court: Art = (c) => {
  r(c, '#2e5c88', 0, 0, 16, 16);
  if (hash(c.tx, c.ty) > 0.6) r(c, '#33648f', 2, 3, 3, 1);
  if (hash(c.tx, c.ty, 4) > 0.7) r(c, '#29537c', 9, 10, 3, 1);
};
const courtLH: Art = (c) => {
  court(c);
  r(c, '#e9e9e4', 0, 7, 16, 2);
};
const courtLV: Art = (c) => {
  court(c);
  r(c, '#e9e9e4', 7, 0, 2, 16);
};
const courtLX: Art = (c) => {
  court(c);
  r(c, '#e9e9e4', 0, 7, 16, 2);
  r(c, '#e9e9e4', 7, 0, 2, 16);
};

const voidTile: Art = (c) => {
  r(c, '#06070b', 0, 0, 16, 16);
  r(c, '#0d0f16', 0, 0, 16, 1);
  r(c, '#0d0f16', 0, 0, 1, 16);
};

const steps: Art = (c) => {
  r(c, '#9a9a94', 0, 0, 16, 16);
  r(c, '#e6b800', 0, 0, 16, 2);
  r(c, '#b8b8b2', 0, 2, 16, 4);
  r(c, '#7a7a74', 0, 6, 16, 1);
  r(c, '#e6b800', 0, 8, 16, 2);
  r(c, '#b8b8b2', 0, 10, 16, 4);
  r(c, '#7a7a74', 0, 14, 16, 2);
};

// ---------------------------------------------------------------- paredes
interface WallTheme {
  cap: string;
  capHi: string;
  upper: string;
  upperHi: string;
  upperLo: string;
  lower: string;
  grout: string;
  base: string;
}

/** Paredes amarelas/bege com barra de azulejo claro (como na escola real). */
const BEIGE: WallTheme = {
  cap: '#5a5140',
  capHi: '#7d725a',
  upper: '#e2c57a',
  upperHi: '#efd994',
  upperLo: '#c4a35c',
  lower: '#e8eef0',
  grout: '#b4c0c6',
  base: '#8a8478',
};

/** Áreas azuis (escadarias e banheiros). */
const BLUE: WallTheme = {
  cap: '#27364f',
  capHi: '#415a82',
  upper: '#4b82c2',
  upperHi: '#6aa0dc',
  upperLo: '#3a679e',
  lower: '#e8eef0',
  grout: '#b4c0c6',
  base: '#5d6e82',
};

/** Desenha a base da parede. Retorna true se há "face" visível (parede horizontal). */
function wallBase(c: DrawCtx, th: WallTheme): boolean {
  if (isWallLike(obj(c, 0, 1))) {
    // topo da parede (trechos verticais e cantos)
    r(c, th.cap, 0, 0, 16, 16);
    if (!isWallLike(obj(c, -1, 0))) r(c, th.capHi, 0, 0, 2, 16);
    if (!isWallLike(obj(c, 1, 0))) r(c, th.capHi, 14, 0, 2, 16);
    if (!isWallLike(obj(c, 0, -1))) r(c, th.capHi, 0, 0, 16, 2);
    return false;
  }
  r(c, th.cap, 0, 0, 16, 4);
  r(c, th.capHi, 0, 0, 16, 1);
  r(c, th.upper, 0, 4, 16, 7);
  r(c, th.upperHi, 0, 4, 16, 1);
  r(c, th.upperLo, 0, 10, 16, 1);
  r(c, th.lower, 0, 11, 16, 5);
  r(c, th.grout, 0, 13, 16, 1);
  r(c, th.grout, 4, 11, 1, 2);
  r(c, th.grout, 12, 11, 1, 2);
  r(c, th.grout, 8, 14, 1, 1);
  r(c, th.base, 0, 15, 16, 1);
  return true;
}

const wallBeige: Art = (c) => {
  wallBase(c, BEIGE);
};
const wallBlue: Art = (c) => {
  wallBase(c, BLUE);
};

const wallWindow: Art = (c) => {
  if (!wallBase(c, BEIGE)) return;
  r(c, '#f4f4ee', 2, 4, 12, 7);
  r(c, '#3b6f93', 3, 5, 10, 5);
  r(c, '#8fc8e8', 3, 5, 10, 3);
  r(c, '#c9ecfa', 4, 5, 3, 1);
  r(c, '#f4f4ee', 8, 5, 1, 5);
  r(c, '#b9b9b0', 2, 10, 12, 1);
};

const wallBoard: Art = (c) => {
  if (!wallBase(c, BEIGE)) return;
  r(c, '#5c3d22', 0, 4, 16, 10);
  r(c, '#1e4a3b', 1, 5, 14, 7);
  r(c, '#2a6350', 1, 5, 14, 1);
  r(c, '#d2dad2', 3, 7, 7, 1);
  r(c, '#d2dad2', 3, 9, 4, 1);
  r(c, '#e8d77a', 11, 9, 2, 1);
  r(c, '#8a6a43', 1, 12, 14, 1);
  r(c, '#e8e4d4', 3, 12, 2, 1);
};

/** Caixa de alarme com o botão vermelho do pânico (a luz pulsante é desenhada pelo Renderer). */
const wallPanic: Art = (c) => {
  if (!wallBase(c, BEIGE)) return;
  r(c, '#1d1d22', 3, 3, 10, 12);
  r(c, '#a81818', 4, 4, 8, 10);
  r(c, '#f2c500', 4, 4, 8, 2);
  r(c, '#1d1d22', 5, 4, 1, 2);
  r(c, '#1d1d22', 8, 4, 1, 2);
  r(c, '#1d1d22', 11, 4, 1, 2);
  disc(c, '#5e0a0a', 8, 10, 3);
  disc(c, '#ff4040', 8, 10, 2);
  r(c, '#ffd0d0', 7, 9, 1, 1);
};

const wallMural: Art = (c) => {
  if (!wallBase(c, BEIGE)) return;
  const sets = [
    ['#e86a50', '#f2c14e', '#4aa3a2'],
    ['#5b8def', '#f4d35e', '#ee6c4d'],
    ['#8e6bbf', '#f28f3b', '#79c99e'],
  ];
  const s = pick(sets, hash(c.tx, c.ty, 2));
  r(c, '#5a3d22', 1, 4, 14, 10);
  r(c, s[2], 2, 5, 12, 8);
  disc(c, s[1], 5, 8, 2);
  r(c, s[0], 2, 10, 12, 3);
  r(c, s[0], 6, 8, 5, 2);
  r(c, '#ffffff', 10, 6, 2, 1);
};

// ---------------------------------------------------------------- portas
function doorBase(c: DrawCtx) {
  r(c, '#7a5b3a', 0, 0, 16, 16);
  r(c, '#8c6a43', 0, 5, 16, 1);
  r(c, '#8c6a43', 0, 10, 16, 1);
}
function doorOpen(c: DrawCtx) {
  doorBase(c);
  const hz = isWallLike(obj(c, -1, 0)) || isWallLike(obj(c, 1, 0));
  const leaf = '#b97a3e';
  const edge = '#6f4420';
  if (hz) {
    if (isWallLike(obj(c, -1, 0))) {
      r(c, leaf, 0, 1, 3, 13);
      r(c, edge, 0, 1, 1, 13);
    }
    if (isWallLike(obj(c, 1, 0))) {
      r(c, leaf, 13, 1, 3, 13);
      r(c, edge, 15, 1, 1, 13);
    }
    r(c, 'rgba(0,0,0,0.25)', 0, 0, 16, 2);
  } else {
    if (isWallLike(obj(c, 0, -1))) {
      r(c, leaf, 1, 0, 13, 3);
      r(c, edge, 1, 0, 13, 1);
    }
    if (isWallLike(obj(c, 0, 1))) {
      r(c, leaf, 1, 13, 13, 3);
      r(c, edge, 1, 15, 13, 1);
    }
    r(c, 'rgba(0,0,0,0.25)', 0, 0, 2, 16);
  }
}
function doorLocked(c: DrawCtx) {
  doorBase(c);
  r(c, '#2b3f5c', 0, 0, 16, 16);
  r(c, '#3d5a80', 1, 1, 14, 14);
  r(c, '#2f4767', 1, 7, 14, 1);
  r(c, '#2f4767', 7, 1, 1, 14);
  r(c, '#e0c040', 6, 6, 4, 4);
  r(c, '#3d3010', 7, 7, 2, 2);
}

// ---------------------------------------------------------------- exterior
function gate(c: DrawCtx) {
  concrete(c);
  r(c, '#1d2128', 0, 2, 16, 2);
  r(c, '#1d2128', 0, 12, 16, 2);
  for (let x = 1; x < 16; x += 3) r(c, '#3b4350', x, 2, 1, 12);
  let l = 0;
  while (obj(c, -(l + 1), 0) === T.GATE) l++;
  let rr = 0;
  while (obj(c, rr + 1, 0) === T.GATE) rr++;
  if (Math.abs(l - rr) <= 1) {
    disc(c, '#c0392b', 8, 8, 4);
    disc(c, '#f4f4f4', 8, 8, 2);
    r(c, '#c0392b', 5, 8, 7, 1);
  }
}
function fence(c: DrawCtx) {
  const isF = (dx: number, dy: number) => {
    const o = obj(c, dx, dy);
    return o === T.FENCE || o === T.GATE;
  };
  const h = isF(-1, 0) || isF(1, 0);
  const v = isF(0, -1) || isF(0, 1);
  if (h || !v) {
    r(c, '#20252d', 0, 5, 16, 2);
    r(c, '#20252d', 0, 12, 16, 1);
    for (let x = 1; x < 16; x += 3) r(c, '#454e5c', x, 4, 1, 10);
  }
  if (v) {
    r(c, '#2a303a', 6, 0, 4, 16);
    r(c, '#4a5362', 7, 0, 1, 16);
    for (let y = 2; y < 16; y += 4) r(c, '#20252d', 6, y, 4, 1);
  }
  r(c, '#14171c', 6, 5, 4, 5);
  r(c, '#59627a', 7, 5, 1, 4);
}
function tree(c: DrawCtx) {
  disc(c, 'rgba(0,0,0,0.28)', 9, 11, 6);
  r(c, '#5a3a1e', 7, 10, 3, 5);
  const dark = pick(['#1b4527', '#1e4a2b', '#194024'], hash(c.tx, c.ty));
  disc(c, dark, 8, 7, 7);
  disc(c, '#2c6a38', 7, 6, 5);
  disc(c, '#3f8648', 5, 4, 2);
  disc(c, '#3f8648', 10, 6, 2);
  r(c, '#58a35a', 5, 3, 1, 1);
  r(c, '#58a35a', 10, 5, 1, 1);
}
function bush(c: DrawCtx) {
  disc(c, 'rgba(0,0,0,0.25)', 8, 12, 5);
  disc(c, '#25552f', 8, 9, 6);
  disc(c, '#3a7a42', 6, 8, 3);
  disc(c, '#3a7a42', 10, 9, 3);
  r(c, '#d9506a', 5, 7, 1, 1);
  r(c, '#d9506a', 11, 10, 1, 1);
}
function bench(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.25)', 1, 11, 14, 3);
  r(c, '#4e331c', 1, 4, 14, 8);
  r(c, '#7b5430', 1, 5, 14, 2);
  r(c, '#7b5430', 1, 8, 14, 2);
  r(c, '#2b2f36', 2, 11, 2, 2);
  r(c, '#2b2f36', 12, 11, 2, 2);
}
function plant(c: DrawCtx) {
  r(c, '#8a4b2a', 5, 9, 6, 5);
  r(c, '#a85d36', 5, 9, 6, 1);
  disc(c, '#2f7a3a', 8, 6, 4);
  disc(c, '#3f9a4a', 6, 5, 2);
  disc(c, '#3f9a4a', 10, 6, 2);
}
function pillar(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.3)', 3, 12, 11, 3);
  r(c, '#9c8650', 3, 2, 10, 11);
  r(c, '#e0c880', 4, 3, 7, 9);
  r(c, '#f0dea0', 4, 3, 2, 9);
  r(c, '#b79f60', 11, 3, 2, 10);
  r(c, '#7d6a3c', 3, 12, 10, 1);
  r(c, '#7d6a3c', 3, 2, 10, 1);
}
function lamp(c: DrawCtx) {
  disc(c, 'rgba(255,214,120,0.16)', 8, 8, 8);
  r(c, '#22262d', 7, 7, 2, 7);
  r(c, '#22262d', 5, 12, 6, 2);
  disc(c, '#ffe9a8', 8, 6, 2);
}
function trash(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.25)', 3, 12, 10, 2);
  r(c, '#3f4a4f', 4, 5, 8, 8);
  r(c, '#59676d', 3, 4, 10, 2);
  r(c, '#2b3438', 6, 7, 1, 5);
  r(c, '#2b3438', 9, 7, 1, 5);
}
function vending(c: DrawCtx) {
  r(c, '#7d1f22', 1, 0, 14, 16);
  r(c, '#b02e32', 2, 1, 12, 14);
  r(c, '#1d2736', 3, 2, 7, 9);
  for (let i = 0; i < 3; i++) {
    r(c, pick(['#e8c34a', '#4aa3e8', '#6ad66a', '#e86a6a'], hash(c.tx, c.ty, i)), 4 + i * 2, 3, 1, 2);
    r(c, pick(['#e8c34a', '#4aa3e8', '#6ad66a', '#e86a6a'], hash(c.tx, c.ty, i + 3)), 4 + i * 2, 7, 1, 2);
  }
  r(c, '#d9d9d9', 11, 3, 2, 4);
  r(c, '#111', 4, 12, 7, 2);
}
function hoop(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.25)', 3, 10, 10, 4);
  r(c, '#d8d8d8', 3, 3, 10, 3);
  r(c, '#9a9a9a', 3, 5, 10, 1);
  r(c, '#e67e22', 5, 6, 6, 1);
  r(c, '#e67e22', 5, 6, 1, 3);
  r(c, '#e67e22', 10, 6, 1, 3);
  r(c, '#e67e22', 5, 9, 6, 1);
}

// ---------------------------------------------------------------- mobiliário
function desk(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.22)', 1, 11, 14, 3);
  r(c, '#6a4c2c', 1, 3, 14, 10);
  r(c, '#c9a472', 2, 4, 12, 7);
  r(c, '#dcbb88', 2, 4, 12, 1);
  r(c, '#e8e4d4', 4, 6, 4, 3);
  r(c, '#3a5fa0', 10, 7, 2, 1);
  r(c, '#4a4a52', 1, 12, 14, 1);
}
function teacherDesk(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.25)', 0, 11, 16, 4);
  r(c, '#4a3019', 0, 3, 16, 10);
  r(c, '#7d5530', 0, 3, 16, 7);
  r(c, '#946838', 0, 3, 16, 1);
  r(c, '#d9d5c4', 2, 5, 4, 3);
  r(c, '#a33a3a', 8, 5, 3, 2);
  r(c, '#3a6aa3', 11, 5, 3, 2);
}
function deskPC(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.22)', 1, 10, 14, 4);
  r(c, '#6a4c2c', 0, 3, 16, 9);
  r(c, '#8c6a41', 1, 4, 14, 7);
  r(c, '#1c2230', 4, 1, 8, 6);
  r(c, '#4fc3f7', 5, 2, 6, 4);
  r(c, '#cfd2d6', 4, 8, 8, 2);
}
function computer(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.22)', 1, 10, 14, 4);
  r(c, '#59636f', 0, 3, 16, 9);
  r(c, '#6f7b88', 1, 4, 14, 7);
  r(c, '#14181f', 3, 0, 10, 7);
  r(c, '#6bd0ff', 4, 1, 8, 5);
  r(c, '#b6ecff', 5, 2, 3, 1);
  r(c, '#d6dade', 4, 8, 8, 2);
}
function bookshelf(c: DrawCtx) {
  r(c, '#4a2f1a', 0, 0, 16, 16);
  r(c, '#2b190d', 1, 1, 14, 14);
  const cols = ['#a33a3a', '#3a6aa3', '#d9b84a', '#4a9a5a', '#7a4aa3', '#d9d5c4', '#c97a3a'];
  for (let row = 0; row < 3; row++) {
    const y = 1 + row * 5;
    for (let x = 1; x < 15; x += 2) {
      const h = 3 + Math.floor(hash(c.tx + x, c.ty, row) * 2);
      r(c, pick(cols, hash(c.tx + x, c.ty + row, 5)), x, y + (4 - h), 2, h);
    }
    r(c, '#6b4727', 1, y + 4, 14, 1);
  }
}
/** Mesa comprida (refeitório): liga visualmente com as vizinhas. */
function table(c: DrawCtx) {
  const left = obj(c, -1, 0) === T.TABLE;
  const right = obj(c, 1, 0) === T.TABLE;
  r(c, 'rgba(0,0,0,0.25)', 0, 11, 16, 4);
  r(c, '#9a9482', 0, 2, 16, 11);
  r(c, '#f0ecdc', 0, 2, 16, 9);
  r(c, '#ffffff', 0, 2, 16, 1);
  r(c, '#cfc9b4', 0, 10, 16, 1);
  if (!left) {
    r(c, '#9a9482', 0, 2, 1, 11);
  }
  if (!right) {
    r(c, '#9a9482', 15, 2, 1, 11);
  }
}
function cabinet(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.25)', 1, 13, 14, 3);
  r(c, '#4d5563', 1, 1, 14, 14);
  r(c, '#6b7585', 2, 2, 12, 12);
  r(c, '#4d5563', 7, 2, 1, 12);
  r(c, '#c7ccd4', 6, 7, 1, 3);
  r(c, '#c7ccd4', 9, 7, 1, 3);
}
const LOCKER_COLORS: Array<[string, string, string]> = [
  ['#2b4d6b', '#3d6b8f', '#1d3347'],
  ['#8a2f2f', '#b34545', '#561c1c'],
  ['#b88a1e', '#e0b13a', '#6b4e0e'],
  ['#2f7048', '#46a068', '#1b4529'],
  ['#5d3a8a', '#8057b3', '#38205a'],
];
function locker(c: DrawCtx) {
  const [dark, mid, line] = pick(LOCKER_COLORS, hash(Math.floor(c.tx / 3), Math.floor(c.ty / 3), 6));
  r(c, 'rgba(0,0,0,0.25)', 1, 13, 14, 3);
  r(c, dark, 1, 1, 14, 14);
  r(c, mid, 2, 2, 5, 12);
  r(c, mid, 9, 2, 5, 12);
  r(c, line, 3, 4, 3, 1);
  r(c, line, 10, 4, 3, 1);
  r(c, line, 3, 5, 3, 1);
  r(c, line, 10, 5, 3, 1);
  r(c, '#e8e8e8', 6, 8, 1, 2);
  r(c, '#e8e8e8', 9, 8, 1, 2);
}
function toilet(c: DrawCtx) {
  r(c, '#cfd8dc', 3, 1, 10, 4);
  r(c, '#eef2f4', 4, 5, 8, 8);
  r(c, '#aab6bb', 5, 7, 6, 5);
  r(c, '#7d8a90', 7, 2, 2, 1);
}
function sink(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.22)', 1, 12, 14, 3);
  r(c, '#aeb8bd', 1, 3, 14, 10);
  r(c, '#cfd8dc', 1, 3, 14, 2);
  r(c, '#5f97b8', 4, 6, 8, 5);
  r(c, '#8cc2e0', 5, 7, 6, 3);
  r(c, '#777', 7, 4, 2, 2);
}
function stall(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.25)', 9, 0, 3, 16);
  r(c, '#3f6275', 5, 0, 5, 16);
  r(c, '#6a97ad', 6, 0, 2, 16);
}
function counter(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.25)', 0, 12, 16, 3);
  r(c, '#7e868b', 0, 2, 16, 11);
  r(c, '#c4cacd', 0, 2, 16, 8);
  r(c, '#dde2e4', 0, 2, 16, 1);
  if (hash(c.tx, c.ty) > 0.7) r(c, '#8a8f93', 5, 4, 5, 3);
}
function stove(c: DrawCtx) {
  r(c, '#272b30', 0, 1, 16, 14);
  r(c, '#3a3f45', 1, 2, 14, 12);
  for (const [cx, cy] of [
    [5, 6],
    [11, 6],
    [5, 11],
    [11, 11],
  ]) {
    disc(c, '#14171a', cx, cy, 2);
    r(c, '#c0392b', cx, cy, 1, 1);
  }
}
function fridge(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.25)', 2, 13, 13, 3);
  r(c, '#aab2b6', 2, 0, 12, 15);
  r(c, '#dfe5e8', 3, 1, 10, 13);
  r(c, '#aab2b6', 3, 6, 10, 1);
  r(c, '#7d858a', 11, 3, 1, 2);
  r(c, '#7d858a', 11, 8, 1, 3);
}
function crate(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.25)', 1, 13, 14, 2);
  r(c, '#5f4725', 1, 1, 14, 14);
  r(c, '#8a6a3a', 2, 2, 12, 12);
  r(c, '#6f5430', 2, 7, 12, 2);
  r(c, '#6f5430', 7, 2, 2, 12);
}
function gasTank(c: DrawCtx) {
  disc(c, 'rgba(0,0,0,0.3)', 9, 10, 6);
  disc(c, '#8a2a20', 8, 8, 6);
  disc(c, '#c0392b', 8, 8, 5);
  disc(c, '#e0564a', 6, 6, 2);
  r(c, '#d9d9d9', 7, 7, 2, 2);
}
function bed(c: DrawCtx) {
  r(c, '#3b2b1d', 1, 1, 14, 15);
  r(c, '#eae6dc', 2, 2, 12, 4);
  r(c, '#a33a3a', 2, 6, 12, 9);
  r(c, '#c24b4b', 2, 6, 12, 2);
}
function trophy(c: DrawCtx) {
  r(c, 'rgba(0,0,0,0.25)', 1, 13, 14, 3);
  r(c, '#5a3d22', 1, 1, 14, 14);
  r(c, '#9cc3d2', 2, 2, 12, 11);
  r(c, '#bfe0ec', 2, 2, 3, 11);
  r(c, '#5a3d22', 2, 7, 12, 1);
  r(c, '#5a3d22', 2, 13, 12, 1);
  // taças douradas
  r(c, '#e8c23a', 4, 3, 3, 2);
  r(c, '#e8c23a', 5, 5, 1, 1);
  r(c, '#b8921c', 4, 6, 3, 1);
  r(c, '#e8c23a', 9, 3, 3, 2);
  r(c, '#e8c23a', 10, 5, 1, 1);
  r(c, '#b8921c', 9, 6, 3, 1);
  r(c, '#e8c23a', 5, 9, 2, 3);
  r(c, '#c0c0c8', 9, 10, 3, 2);
  r(c, '#c0392b', 8, 9, 1, 3);
}
/** Mochila de aluno largada no chão. */
function backpack(c: DrawCtx) {
  const [main, dark] = pick(
    [
      ['#b83232', '#8a2424'],
      ['#2f6fd6', '#1f4a96'],
      ['#3aa66a', '#27744a'],
      ['#e0b030', '#a8851a'],
      ['#8a5cc8', '#5b3a8f'],
    ],
    hash(c.tx, c.ty, 31),
  );
  r(c, 'rgba(0,0,0,0.28)', 3, 12, 11, 3);
  r(c, dark, 4, 4, 8, 9);
  r(c, main, 4, 4, 8, 8);
  r(c, dark, 5, 2, 6, 3);
  r(c, '#1a1a22', 6, 3, 4, 1);
  r(c, dark, 5, 9, 6, 1);
  r(c, '#e8e8e8', 7, 10, 2, 1);
  r(c, 'rgba(255,255,255,0.22)', 5, 5, 2, 3);
}

function rug(c: DrawCtx) {
  r(c, '#6a2a2a', 1, 3, 14, 10);
  r(c, '#a84a4a', 2, 4, 12, 8);
  r(c, '#d9b34a', 2, 4, 12, 1);
  r(c, '#d9b34a', 2, 11, 12, 1);
}

/** Cadeira vista de cima; `dir` é para onde o ocupante olha (encosto no lado oposto). */
function chair(dir: Facing, seat: string, back: string, dark: string): Art {
  return (c) => {
    r(c, 'rgba(0,0,0,0.22)', 3, 5, 11, 10);
    switch (dir) {
      case 'up':
        r(c, seat, 3, 2, 10, 9);
        r(c, back, 3, 11, 10, 3);
        r(c, dark, 3, 13, 10, 1);
        break;
      case 'down':
        r(c, back, 3, 2, 10, 3);
        r(c, seat, 3, 5, 10, 9);
        r(c, dark, 3, 2, 10, 1);
        break;
      case 'left':
        r(c, seat, 2, 3, 9, 10);
        r(c, back, 11, 3, 3, 10);
        r(c, dark, 13, 3, 1, 10);
        break;
      case 'right':
        r(c, back, 2, 3, 3, 10);
        r(c, seat, 5, 3, 9, 10);
        r(c, dark, 2, 3, 1, 10);
        break;
    }
    r(c, 'rgba(255,255,255,0.18)', 4, 3, 3, 1);
  };
}

function stairs(up: boolean): Art {
  return (c) => {
    const self = up ? T.STAIRS_UP : T.STAIRS_DOWN;
    const isS = (dx: number, dy: number) => obj(c, dx, dy) === self;
    r(c, '#6a6a6a', 0, 0, 16, 16);
    for (let i = 0; i < 4; i++) {
      r(c, i % 2 ? '#8a8a8a' : '#a4a4a4', 0, i * 4, 16, 3);
      r(c, '#4d4d4d', 0, i * 4 + 3, 16, 1);
    }
    const rail = (x: number) => {
      r(c, '#e6b800', x, 0, 2, 16);
      for (let y = 3; y < 16; y += 6) r(c, '#241c00', x, y, 2, 2);
    };
    if (!isS(-1, 0)) rail(0);
    if (!isS(1, 0)) rail(14);
    let l = 0;
    while (isS(-(l + 1), 0)) l++;
    let rr = 0;
    while (isS(rr + 1, 0)) rr++;
    if (l === rr && !isS(0, -1)) {
      const col = up ? '#ffd54a' : '#7ec8ff';
      if (up) {
        r(c, col, 7, 3, 2, 1);
        r(c, col, 6, 4, 4, 1);
        r(c, col, 5, 5, 6, 1);
        r(c, col, 7, 6, 2, 7);
      } else {
        r(c, col, 7, 3, 2, 7);
        r(c, col, 5, 10, 6, 1);
        r(c, col, 6, 11, 4, 1);
        r(c, col, 7, 12, 2, 1);
      }
    }
  };
}

// ---------------------------------------------------------------- registro
const ART: Record<number, Art> = {
  [T.GRASS]: grass,
  [T.CONCRETE]: concrete,
  [T.SIDEWALK]: sidewalk,
  [T.ASPHALT]: asphalt,
  [T.CROSSWALK]: crosswalk,
  [T.FLOOR_WOOD]: (c) => wood(c, '#c9a56e', '#c19c64', '#a58352'),
  [T.FLOOR_OFFICE]: (c) => wood(c, '#a88c62', '#9f835a', '#86694a'),
  [T.FLOOR_HALL]: (c) => checker(c, '#dcc58f', '#d2ba80', '#b39b66', 8),
  [T.FLOOR_CERAMIC]: (c) => checker(c, '#e0dac6', '#d6cfba', '#b9b098', 8),
  [T.FLOOR_BATH]: (c) => checker(c, '#a3c4cc', '#95b8c1', '#7fa3ad', 8),
  [T.FLOOR_CAFE]: (c) => checker(c, '#e4d9bc', '#d4c8a8', '#b3a88f', 8),
  [T.FLOOR_KITCHEN]: (c) => checker(c, '#d4d8da', '#bcc2c6', '#a6adb1', 8),
  [T.FLOOR_LAB]: (c) => checker(c, '#6f8093', '#677789', '#566577', 16),
  [T.CARPET]: carpet,
  [T.PAVER]: paver,
  [T.COURT]: court,
  [T.COURT_LH]: courtLH,
  [T.COURT_LV]: courtLV,
  [T.COURT_LX]: courtLX,
  [T.VOID]: voidTile,
  [T.STEPS]: steps,

  [T.WALL]: wallBeige,
  [T.WALL_BLUE]: wallBlue,
  [T.WALL_WINDOW]: wallWindow,
  [T.WALL_BOARD]: wallBoard,
  [T.WALL_MURAL]: wallMural,
  [T.WALL_PANIC]: wallPanic,
  [T.DOOR_OPEN]: doorOpen,
  [T.DOOR_LOCKED]: doorLocked,
  [T.GATE]: gate,
  [T.FENCE]: fence,
  [T.TREE]: tree,
  [T.BUSH]: bush,
  [T.BENCH]: bench,
  [T.BENCH_U]: bench,
  [T.PLANT]: plant,
  [T.DESK]: desk,
  [T.TEACHER_DESK]: teacherDesk,
  [T.DESK_PC]: deskPC,
  [T.COMPUTER]: computer,
  [T.BOOKSHELF]: bookshelf,
  [T.TABLE]: table,
  [T.CABINET]: cabinet,
  [T.LOCKER]: locker,
  [T.TOILET]: toilet,
  [T.SINK]: sink,
  [T.STALL]: stall,
  [T.COUNTER]: counter,
  [T.STOVE]: stove,
  [T.FRIDGE]: fridge,
  [T.CRATE]: crate,
  [T.GAS_TANK]: gasTank,
  [T.HOOP]: hoop,
  [T.BED]: bed,
  [T.STAIRS_UP]: stairs(true),
  [T.STAIRS_DOWN]: stairs(false),
  [T.PILLAR]: pillar,
  [T.LAMP]: lamp,
  [T.VENDING]: vending,
  [T.TRASH]: trash,
  [T.TROPHY]: trophy,
  [T.RUG]: rug,
  [T.BACKPACK]: backpack,
  [T.CHAIR_U]: chair('up', '#3f6fc4', '#2c4f93', '#1d3566'),
  [T.CHAIR_D]: chair('down', '#3f6fc4', '#2c4f93', '#1d3566'),
  [T.CHAIR_L]: chair('left', '#3f6fc4', '#2c4f93', '#1d3566'),
  [T.CHAIR_R]: chair('right', '#3f6fc4', '#2c4f93', '#1d3566'),
  [T.OFFICE_CHAIR_U]: chair('up', '#474755', '#2a2a34', '#16161c'),
  [T.OFFICE_CHAIR_D]: chair('down', '#474755', '#2a2a34', '#16161c'),
};

export function drawTile(id: number, c: DrawCtx) {
  const art = ART[id];
  if (art) art(c);
}
