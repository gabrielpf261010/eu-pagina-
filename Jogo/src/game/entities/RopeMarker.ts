import { TILE } from '../constants';
import { Entity } from './Entity';

/** Corda com gancho pendurada no muro depois que o kit de escalada é usado (rota desbloqueada). */
export class RopeMarker extends Entity {
  private tx: number;
  private ty: number;

  constructor(id: string, floor: Entity['floor'], tx: number, ty: number) {
    super(id, floor, (tx + 0.5) * TILE, (ty + 1) * TILE);
    this.tx = tx;
    this.ty = ty;
  }

  update() {
    /* decorativo */
  }

  draw(g: CanvasRenderingContext2D) {
    const x = this.tx * TILE;
    const y = this.ty * TILE;
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(x + 8, y + 2, 3, 22);
    g.fillStyle = '#c9a24a';
    g.fillRect(x + 5, y - 2, 6, 3);
    g.fillStyle = '#8a6a1e';
    g.fillRect(x + 5, y, 6, 1);
    g.fillStyle = '#b08a4a';
    g.fillRect(x + 7, y + 1, 2, 22);
    g.fillStyle = '#6a4a22';
    for (let k = 4; k < 22; k += 4) g.fillRect(x + 7, y + k, 2, 1);
    g.fillStyle = '#6a4a22';
    g.fillRect(x + 6, y + 22, 4, 2);
  }
}
