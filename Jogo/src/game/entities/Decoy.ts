import { TILE } from '../constants';
import type { Game } from '../Game';
import { Entity } from './Entity';
import { isHunter } from './Hunter';

const LIFE = 10; // segundos
const LURE_RADIUS = 720; // px: atinge praticamente o andar inteiro

/** Distrator eletrônico (fictício): apita e atrai os inimigos do andar para o local onde caiu. */
export class Decoy extends Entity {
  private age = 0;
  private beepT = 0;
  private lureT = 0;

  update(dt: number, game: Game) {
    this.age += dt;
    this.beepT -= dt;
    this.lureT -= dt;
    if (this.beepT <= 0) {
      this.beepT = 0.9;
      if (game.player.floor === this.floor) game.audio.beep();
    }
    if (this.lureT <= 0) {
      this.lureT = 2;
      const tile = { x: Math.floor(this.x / TILE), y: Math.floor(this.y / TILE) };
      for (const e of game.entities) {
        if (!isHunter(e) || e.floor !== this.floor) continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) <= LURE_RADIUS) e.lure(game, tile);
      }
    }
    if (this.age >= LIFE) this.done = true;
  }

  draw(g: CanvasRenderingContext2D) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    // ondas sonoras
    g.save();
    for (let k = 0; k < 2; k++) {
      const r = (this.age * 22 + k * 14) % 28;
      g.strokeStyle = `rgba(120,225,255,${0.55 * (1 - r / 28)})`;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x, y - 2, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(x - 4, y + 2, 9, 2);
    g.fillStyle = '#23262e';
    g.fillRect(x - 3, y - 4, 7, 6);
    g.fillStyle = '#4a5160';
    g.fillRect(x - 3, y - 4, 7, 1);
    g.fillStyle = Math.floor(this.age * 6) % 2 === 0 ? '#ff4040' : '#7a1a1a';
    g.fillRect(x - 1, y - 2, 3, 2);
    g.fillStyle = '#9aa0b0';
    g.fillRect(x + 2, y - 7, 1, 3);
  }
}
