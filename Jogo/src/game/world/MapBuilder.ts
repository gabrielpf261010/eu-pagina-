import { TILE, type FloorId } from '../constants';
import type { GameMap, LightDef, Point, PortalDef, RoomDef, ZoneDef } from '../types';
import { SOLID, isSeatTile } from './tiles';

const LIGHT_WARM = 'rgba(255,226,150,0.17)';

/**
 * Ferramenta de baixo nível para montar um andar. As "estruturas" de alto nível
 * (salas, prédios, cercas...) ficam em structures.ts e usam este builder.
 */
export class MapBuilder {
  readonly ground: Uint8Array;
  readonly objects: Uint8Array;
  readonly rooms: RoomDef[] = [];
  readonly zones: ZoneDef[] = [];
  readonly portals: PortalDef[] = [];
  readonly lights: LightDef[] = [];
  spawnHint: Point = { x: 1, y: 1 };

  constructor(
    readonly id: FloorId,
    readonly name: string,
    readonly width: number,
    readonly height: number,
    baseGround: number,
  ) {
    this.ground = new Uint8Array(width * height).fill(baseGround);
    this.objects = new Uint8Array(width * height);
  }

  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  setGround(x: number, y: number, t: number) {
    if (this.inBounds(x, y)) this.ground[y * this.width + x] = t;
  }
  getGround(x: number, y: number) {
    return this.inBounds(x, y) ? this.ground[y * this.width + x] : 0;
  }
  setObj(x: number, y: number, t: number) {
    if (this.inBounds(x, y)) this.objects[y * this.width + x] = t;
  }
  getObj(x: number, y: number) {
    return this.inBounds(x, y) ? this.objects[y * this.width + x] : 0;
  }

  fillGround(x: number, y: number, w: number, h: number, t: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.setGround(x + i, y + j, t);
  }
  fillObjects(x: number, y: number, w: number, h: number, t: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.setObj(x + i, y + j, t);
  }
  clearObjects(x: number, y: number, w: number, h: number) {
    this.fillObjects(x, y, w, h, 0);
  }

  zone(name: string, x: number, y: number, w: number, h: number) {
    this.zones.push({ name, rect: { x, y, w, h } });
  }

  /** Luz decorativa (centro e raio em tiles). */
  light(tx: number, ty: number, radiusTiles: number, color = LIGHT_WARM) {
    this.lights.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, r: radiusTiles * TILE, color });
  }

  /** Fileira de luzes (lâmpadas de corredor) de (x0,y0) a (x1,y1). */
  lightsAlong(x0: number, y0: number, x1: number, y1: number, step: number, radiusTiles: number, color = LIGHT_WARM) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.max(Math.abs(dx), Math.abs(dy));
    for (let d = 0; d <= len; d += step) {
      const t = len === 0 ? 0 : d / len;
      this.light(Math.round(x0 + dx * t), Math.round(y0 + dy * t), radiusTiles, color);
    }
  }

  private isFree(x: number, y: number) {
    if (!this.inBounds(x, y)) return false;
    const o = this.getObj(x, y);
    return !SOLID[this.getGround(x, y)] && !SOLID[o] && !isSeatTile(o);
  }

  /** Procura o tile livre mais próximo do ponto desejado. */
  private findFree(p: Point): Point {
    for (let rad = 0; rad < 12; rad++) {
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          if (this.isFree(p.x + dx, p.y + dy)) return { x: p.x + dx, y: p.y + dy };
        }
      }
    }
    return p;
  }

  build(): GameMap {
    return {
      id: this.id,
      name: this.name,
      width: this.width,
      height: this.height,
      ground: this.ground,
      objects: this.objects,
      rooms: this.rooms,
      zones: this.zones,
      portals: this.portals,
      lights: this.lights,
      spawn: this.findFree(this.spawnHint),
    };
  }
}
