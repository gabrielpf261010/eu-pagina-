import type { Point, Rect, RoomDef, RoomKind } from '../types';
import type { FloorId } from '../constants';
import type { MapBuilder } from './MapBuilder';
import { T } from './tiles';
import { furnishRoom } from './layouts';

/**
 * Estruturas reutilizáveis: paredes, portas, salas, cercas, escadas, quadra...
 * Para mexer no mapa basta combinar estas funções em world/groundFloor.ts e firstFloor.ts.
 */

export type Side = 'N' | 'S' | 'E' | 'W';

export interface DoorSpec {
  side: Side;
  /** Coordenada (em tiles) ao longo da parede onde a porta começa. Portas têm 2 tiles de largura. */
  at: number;
  locked?: boolean;
}

export interface RoomSpec {
  id: string;
  name: string;
  kind: RoomKind;
  x: number;
  y: number;
  w: number;
  h: number;
  doors?: DoorSpec[];
  /** Piso (padrão depende do tipo da sala). */
  floor?: number;
  /** Tile de parede (padrão: bege; banheiros e escadas usam azul). */
  wall?: number;
  furnish?: boolean;
  windows?: boolean;
  light?: boolean;
}

export const KIND_FLOOR: Record<RoomKind, number> = {
  classroom: T.FLOOR_CERAMIC,
  office: T.FLOOR_OFFICE,
  library: T.CARPET,
  cafeteria: T.FLOOR_CAFE,
  kitchen: T.FLOOR_KITCHEN,
  lab: T.FLOOR_LAB,
  bathroom: T.FLOOR_BATH,
  storage: T.FLOOR_CERAMIC,
  multi: T.FLOOR_CERAMIC,
  arts: T.FLOOR_WOOD,
  house: T.FLOOR_OFFICE,
  hall: T.FLOOR_HALL,
  stairs: T.FLOOR_HALL,
};

const WINDOW_KINDS = new Set<RoomKind>([
  'classroom',
  'office',
  'library',
  'cafeteria',
  'kitchen',
  'lab',
  'multi',
  'arts',
  'house',
  'storage',
]);

const isDoor = (t: number) => t === T.DOOR_OPEN || t === T.DOOR_LOCKED;

/** Porta de 2 tiles centralizada em uma das paredes da sala. */
export function midDoor(side: Side, x: number, y: number, w: number, h: number, offset = 0, locked = false): DoorSpec {
  const at = side === 'E' || side === 'W' ? y + Math.floor(h / 2) - 1 + offset : x + Math.floor(w / 2) - 1 + offset;
  return { side, at, locked };
}

/** Contorno de paredes (nunca sobrescreve portas já abertas em paredes compartilhadas). */
export function wallRect(b: MapBuilder, x: number, y: number, w: number, h: number, tile: number = T.WALL) {
  const put = (px: number, py: number) => {
    if (!isDoor(b.getObj(px, py))) b.setObj(px, py, tile);
  };
  for (let i = 0; i < w; i++) {
    put(x + i, y);
    put(x + i, y + h - 1);
  }
  for (let j = 0; j < h; j++) {
    put(x, y + j);
    put(x + w - 1, y + j);
  }
}

/** Contorno de cerca. */
export function fenceRect(b: MapBuilder, x: number, y: number, w: number, h: number) {
  wallRect(b, x, y, w, h, T.FENCE);
}

/** Abre uma passagem sem porta (remove objetos e define o chão). */
export function openPassage(b: MapBuilder, x: number, y: number, w: number, h: number, floor: number) {
  b.clearObjects(x, y, w, h);
  b.fillGround(x, y, w, h, floor);
}

function doorTiles(spec: DoorSpec, r: Rect): Point[] {
  switch (spec.side) {
    case 'W':
      return [
        { x: r.x, y: spec.at },
        { x: r.x, y: spec.at + 1 },
      ];
    case 'E':
      return [
        { x: r.x + r.w - 1, y: spec.at },
        { x: r.x + r.w - 1, y: spec.at + 1 },
      ];
    case 'N':
      return [
        { x: spec.at, y: r.y },
        { x: spec.at + 1, y: r.y },
      ];
    case 'S':
      return [
        { x: spec.at, y: r.y + r.h - 1 },
        { x: spec.at + 1, y: r.y + r.h - 1 },
      ];
  }
}

const INWARD: Record<Side, Point> = {
  W: { x: 1, y: 0 },
  E: { x: -1, y: 0 },
  N: { x: 0, y: 1 },
  S: { x: 0, y: -1 },
};

/** Casca de um prédio / bloco: paredes + chão + zona nomeada (sem mobiliário). */
export function buildShell(
  b: MapBuilder,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  floor: number,
  wall: number = T.WALL,
) {
  b.fillGround(x + 1, y + 1, w - 2, h - 2, floor);
  b.clearObjects(x + 1, y + 1, w - 2, h - 2);
  wallRect(b, x, y, w, h, wall);
  b.zone(name, x, y, w, h);
}

/** Cria uma sala: paredes, chão, portas, mobiliário, janelas, tapetes e luzes. */
export function makeRoom(b: MapBuilder, spec: RoomSpec): RoomDef {
  const rect: Rect = { x: spec.x, y: spec.y, w: spec.w, h: spec.h };
  const floor = spec.floor ?? KIND_FLOOR[spec.kind];
  const wallTile = spec.wall ?? (spec.kind === 'bathroom' || spec.kind === 'stairs' ? T.WALL_BLUE : T.WALL);

  b.fillGround(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, floor);
  b.clearObjects(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  wallRect(b, rect.x, rect.y, rect.w, rect.h, wallTile);

  const doors: Point[] = [];
  const mats: Point[] = [];
  for (const d of spec.doors ?? []) {
    const inward = INWARD[d.side];
    for (const t of doorTiles(d, rect)) {
      b.setObj(t.x, t.y, d.locked ? T.DOOR_LOCKED : T.DOOR_OPEN);
      doors.push(t);
      if (!d.locked) mats.push({ x: t.x + inward.x, y: t.y + inward.y });
    }
  }

  const room: RoomDef = { id: spec.id, name: spec.name, kind: spec.kind, rect, doors };
  b.rooms.push(room);
  b.zone(spec.name, rect.x, rect.y, rect.w, rect.h);
  if (spec.furnish !== false) furnishRoom(b, room);

  // janelas na parede norte (a "face" da parede fica voltada para dentro da sala)
  if (wallTile === T.WALL && (spec.windows ?? WINDOW_KINDS.has(spec.kind))) {
    for (let x = rect.x + 1; x <= rect.x + rect.w - 2; x++) {
      if ((x - rect.x) % 3 === 2 && b.getObj(x, rect.y) === T.WALL) b.setObj(x, rect.y, T.WALL_WINDOW);
    }
  }

  // capachos junto às portas
  if (spec.kind === 'classroom' || spec.kind === 'office') {
    for (const m of mats) if (b.getObj(m.x, m.y) === 0) b.setObj(m.x, m.y, T.RUG);
  }

  // iluminação
  if (spec.light !== false) {
    const color =
      spec.kind === 'bathroom' || spec.kind === 'lab' || spec.kind === 'stairs'
        ? 'rgba(170,215,255,0.16)'
        : 'rgba(255,226,150,0.17)';
    const nx = Math.max(1, Math.round(rect.w / 10));
    const ny = Math.max(1, Math.round(rect.h / 10));
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const cx = rect.x + ((i + 0.5) * rect.w) / nx;
        const cy = rect.y + ((j + 0.5) * rect.h) / ny;
        b.light(Math.floor(cx), Math.floor(cy), Math.max(rect.w / nx, rect.h / ny) * 0.8, color);
      }
    }
  }
  return room;
}

/** Coloca um objeto apenas se a célula de objetos estiver livre. */
export function prop(b: MapBuilder, x: number, y: number, tile: number, onlyOn?: number) {
  if (b.getObj(x, y) !== 0) return;
  if (onlyOn !== undefined && b.getGround(x, y) !== onlyOn) return;
  b.setObj(x, y, tile);
}

export function props(b: MapBuilder, tile: number, list: Array<[number, number]>, onlyOn?: number) {
  for (const [x, y] of list) prop(b, x, y, tile, onlyOn);
}

/** Troca um tile de parede comum por uma variante decorativa (mural, janela...). */
export function wallDecor(b: MapBuilder, x: number, y: number, tile: number) {
  if (b.getObj(x, y) === T.WALL) b.setObj(x, y, tile);
}

/** Grade de objetos (ex.: árvores) com passo. */
export function propLine(
  b: MapBuilder,
  tile: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stepX: number,
  stepY: number,
  onlyOn?: number,
) {
  for (let y = y0; y <= y1; y += stepY) {
    for (let x = x0; x <= x1; x += stepX) prop(b, x, y, tile, onlyOn);
  }
}

/** Fileira de armários coloridos ao longo de um corredor vertical, pulando faixas (portas). */
export function lockerColumn(b: MapBuilder, x: number, y0: number, y1: number, skip: Array<[number, number]>) {
  for (let y = y0; y <= y1; y++) {
    if (skip.some(([a, z]) => y >= a && y <= z)) continue;
    prop(b, x, y, T.LOCKER);
  }
}

/** Marcação de quadra poliesportiva. */
export function courtLines(b: MapBuilder, x0: number, y0: number, x1: number, y1: number) {
  for (let x = x0; x <= x1; x++) {
    b.setGround(x, y0, T.COURT_LH);
    b.setGround(x, y1, T.COURT_LH);
  }
  for (let y = y0; y <= y1; y++) {
    b.setGround(x0, y, T.COURT_LV);
    b.setGround(x1, y, T.COURT_LV);
  }
  const midY = Math.floor((y0 + y1) / 2);
  const midX = Math.floor((x0 + x1) / 2);
  for (let x = x0; x <= x1; x++) b.setGround(x, midY, T.COURT_LH);
  b.setGround(x0, y0, T.COURT_LX);
  b.setGround(x1, y0, T.COURT_LX);
  b.setGround(x0, y1, T.COURT_LX);
  b.setGround(x1, y1, T.COURT_LX);
  b.setGround(x0, midY, T.COURT_LX);
  b.setGround(x1, midY, T.COURT_LX);
  // garrafões
  for (let x = midX - 3; x <= midX + 3; x++) {
    b.setGround(x, y0 + 4, T.COURT_LH);
    b.setGround(x, y1 - 4, T.COURT_LH);
  }
  for (let y = y0 + 1; y <= y0 + 4; y++) {
    b.setGround(midX - 3, y, y === y0 + 4 ? T.COURT_LX : T.COURT_LV);
    b.setGround(midX + 3, y, y === y0 + 4 ? T.COURT_LX : T.COURT_LV);
  }
  for (let y = y1 - 4; y <= y1 - 1; y++) {
    b.setGround(midX - 3, y, y === y1 - 4 ? T.COURT_LX : T.COURT_LV);
    b.setGround(midX + 3, y, y === y1 - 4 ? T.COURT_LX : T.COURT_LV);
  }
}

export interface StairsSpec {
  id: string;
  label: string;
  floor: FloorId;
  /** Retângulo das escadas em tiles (use largura ímpar para a seta ficar centralizada). */
  rect: Rect;
  direction: 'up' | 'down';
  /** Tile (no andar de destino) onde o jogador reaparece. */
  target: { floor: FloorId; tx: number; ty: number };
}

/** Desenha os degraus e registra o portal para o outro andar. */
export function placeStairs(b: MapBuilder, s: StairsSpec) {
  b.fillObjects(s.rect.x, s.rect.y, s.rect.w, s.rect.h, s.direction === 'up' ? T.STAIRS_UP : T.STAIRS_DOWN);
  b.portals.push({
    id: s.id,
    label: s.label,
    floor: s.floor,
    rect: s.rect,
    direction: s.direction,
    target: s.target,
  });
}
