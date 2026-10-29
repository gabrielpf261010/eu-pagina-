import { TILE } from '../constants';
import type { Game } from '../Game';
import { Character } from './Character';
import { Entity } from './Entity';

const SPEED = 170;

/** Bolinha de papel (fictícia). Voa em arco por cima das carteiras, para nas paredes e acerta pessoas. */
export class PaperBall extends Entity {
  private vx: number;
  private vy: number;
  private age = 0;
  private landed = false;
  private landedT = 0;

  constructor(
    id: string,
    floor: Entity['floor'],
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    private life: number,
    private owner: Entity,
  ) {
    super(id, floor, x, y);
    this.vx = dirX * SPEED;
    this.vy = dirY * SPEED;
  }

  update(dt: number, game: Game) {
    if (this.landed) {
      this.landedT += dt;
      if (this.landedT > 4) this.done = true;
      return;
    }
    this.age += dt;
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    if (game.world.blocksSight(this.floor, Math.floor(nx / TILE), Math.floor(ny / TILE))) {
      this.landed = true;
      return;
    }
    this.x = nx;
    this.y = ny;

    for (const e of game.entities) {
      if (e === this.owner || !(e instanceof Character) || e.floor !== this.floor) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) < 8) {
        game.story.onPaperHit(e);
        this.done = true;
        return;
      }
    }
    if (this.age >= this.life) this.landed = true;
  }

  draw(g: CanvasRenderingContext2D) {
    const t = this.landed ? 1 : Math.min(1, this.age / this.life);
    const z = this.landed ? 0 : Math.sin(t * Math.PI) * 6 + 3;
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(x - 1, y + 1, 3, 1);
    g.fillStyle = '#f4f4ee';
    g.fillRect(x - 1, y - Math.round(z) - 1, 3, 3);
    g.fillStyle = '#c9c9c0';
    g.fillRect(x, y - Math.round(z) + 1, 2, 1);
  }
}
