import { TILE, type FloorId } from '../constants';
import type { GameMap } from '../types';
import { buildGroundFloor } from './groundFloor';
import { buildFirstFloor } from './firstFloor';
import { drawTile } from './tileArt';
import { SOLID, T, isWallLike } from './tiles';

/** Renderiza o mapa inteiro em um canvas offscreen (feito uma única vez por andar). */
function bakeMap(map: GameMap): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = map.width * TILE;
  cv.height = map.height * TILE;
  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  for (const layer of [map.ground, map.objects]) {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const id = layer[y * map.width + x];
        if (id) drawTile(id, { g, x: x * TILE, y: y * TILE, tx: x, ty: y, map });
      }
    }
  }
  // iluminação ambiente (lâmpadas de salas e corredores)
  for (const l of map.lights) {
    const grad = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    grad.addColorStop(0, l.color);
    grad.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = grad;
    g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  return cv;
}

/**
 * Contém todos os andares. Para adicionar um andar novo: criar o builder,
 * incluir em `FloorId` (constants.ts) e registrar aqui.
 */
export class World {
  readonly maps: Record<FloorId, GameMap>;
  readonly baked: Record<FloorId, HTMLCanvasElement>;

  constructor() {
    this.maps = { ground: buildGroundFloor(), first: buildFirstFloor() };
    this.baked = { ground: bakeMap(this.maps.ground), first: bakeMap(this.maps.first) };
  }

  map(floor: FloorId) {
    return this.maps[floor];
  }

  isSolidTile(floor: FloorId, tx: number, ty: number): boolean {
    const m = this.maps[floor];
    if (tx < 0 || ty < 0 || tx >= m.width || ty >= m.height) return true;
    const i = ty * m.width + tx;
    return SOLID[m.ground[i]] === 1 || SOLID[m.objects[i]] === 1;
  }

  /** Testa colisão de uma caixa (centro cx,cy; tamanho w,h; em pixels) contra os tiles sólidos. */
  boxCollides(floor: FloorId, cx: number, cy: number, w: number, h: number): boolean {
    const x0 = Math.floor((cx - w / 2) / TILE);
    const x1 = Math.floor((cx + w / 2 - 0.001) / TILE);
    const y0 = Math.floor((cy - h / 2) / TILE);
    const y1 = Math.floor((cy + h / 2 - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.isSolidTile(floor, tx, ty)) return true;
      }
    }
    return false;
  }

  /** Destranca uma porta (troca por porta aberta). Chame `rebake` depois para atualizar o desenho. */
  unlockDoor(floor: FloorId, tx: number, ty: number) {
    const m = this.maps[floor];
    const i = ty * m.width + tx;
    if (m.objects[i] === T.DOOR_LOCKED) m.objects[i] = T.DOOR_OPEN;
  }

  /** Redesenha o andar inteiro no canvas pré-renderizado (usado após mudanças no mapa). */
  rebake(floor: FloorId) {
    this.baked[floor] = bakeMap(this.maps[floor]);
  }

  /** Tiles que bloqueiam a linha de visão (paredes, portas trancadas, árvores, vazio). */
  blocksSight(floor: FloorId, tx: number, ty: number): boolean {
    const m = this.maps[floor];
    if (tx < 0 || ty < 0 || tx >= m.width || ty >= m.height) return true;
    const i = ty * m.width + tx;
    const o = m.objects[i];
    return m.ground[i] === T.VOID || isWallLike(o) || o === T.DOOR_LOCKED || o === T.TREE;
  }

  zoneAt(floor: FloorId, tx: number, ty: number): string {
    const m = this.maps[floor];
    let name = m.name;
    for (const z of m.zones) {
      const r = z.rect;
      if (tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h) name = z.name;
    }
    return name;
  }
}
