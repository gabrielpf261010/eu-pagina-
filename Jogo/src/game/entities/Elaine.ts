import { TILE, type FloorId } from '../constants';
import type { Game } from '../Game';
import { nearestFree } from '../systems/pathfinding';
import { angleDiff, hasLineOfSight } from '../systems/vision';
import type { Point } from '../types';
import { Character } from './Character';
import type { Hunter } from './Hunter';
import type { CaptorKey } from './captors';
import type { PersonLook } from './sprites';

export type ElaineState = 'patrol' | 'spotted' | 'chase' | 'search' | 'frozen';

const PATROL_SPEED = 44;
const CHASE_SPEED = 88;
const SIGHT = 140;
const FOV = Math.PI * 0.6;
const PROX = 34;
const CATCH = 12;

const LOOK: PersonLook = {
  hair: '#6b2f1e',
  skin: '#e8b48a',
  shirt: '#7a2f6b',
  shirtHi: '#a24793',
  pants: '#2b2340',
  shoe: '#1a1a22',
  bag: null,
  eye: '#1b1b24',
  hairStyle: 'long',
  glasses: true,
  aura: 'rgba(200,60,190,0.22)',
};

/**
 * Elaine, a inspetora (mini-chefe da Rota 3). Patrulha o 1º andar com um campo de visão,
 * persegue ao ver o jogador e chama atenção com um emote. Fica no 1º andar de propósito:
 * torna a rota do terraço arriscada sem fechar o resto da escola.
 */
export class Elaine extends Character implements Hunter {
  global = true;
  readonly isHunter = true as const;
  readonly captorKey: CaptorKey = 'elaine';
  state: ElaineState = 'patrol';

  private heading = Math.PI / 2;
  private grace = 0;
  private waitT = 1;
  private stateT = 0;
  private loseT = 0;
  private repathT = 0;
  private lookT = 0;
  private lookPhase = 0;

  constructor(
    id: string,
    floor: FloorId,
    x: number,
    y: number,
    private waypoints: Point[],
  ) {
    super(id, floor, x, y, LOOK);
  }

  get alertLevel(): 'none' | 'search' | 'chase' {
    if (this.state === 'chase' || this.state === 'spotted') return 'chase';
    if (this.state === 'search') return 'search';
    return 'none';
  }

  freeze() {
    this.state = 'frozen';
    this.stopWalking();
  }

  /** Elaine não cai em distrator (só o Gil se distrai), mas pode ser atordoada. */
  lure() {
    return false;
  }

  stagger(seconds: number) {
    if (this.state === 'frozen') return;
    this.stopWalking();
    this.state = 'patrol';
    this.grace = 2.5;
    this.waitT = 0.6;
    this.loseT = 0;
    this.showEmote('sweat', seconds * 1000);
  }

  private perceive(game: Game): 'sight' | 'near' | null {
    const p = game.player;
    if (p.floor !== this.floor) return null;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 210 && hasLineOfSight(game.world, this.floor, this.x, this.y - 4, p.x, p.y - 4)) {
      if (d <= PROX) return 'near';
      if (d <= SIGHT && Math.abs(angleDiff(Math.atan2(dy, dx), this.heading)) <= FOV / 2) return 'sight';
    }
    return null;
  }

  private turnToward(angle: number, k = 0.3) {
    this.heading += angleDiff(angle, this.heading) * k;
  }

  private faceFromHeading() {
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    this.facing = Math.abs(c) > Math.abs(s) ? (c > 0 ? 'right' : 'left') : s > 0 ? 'down' : 'up';
  }

  private move(dt: number, game: Game, speed: number): boolean {
    const bx = this.x;
    const by = this.y;
    const done = this.followPath(dt, game, speed);
    const dx = this.x - bx;
    const dy = this.y - by;
    if (dx * dx + dy * dy > 0.01) this.turnToward(Math.atan2(dy, dx), 0.35);
    return done;
  }

  private spot(game: Game) {
    this.state = 'spotted';
    this.stateT = 0.5;
    this.stopWalking();
    this.showEmote('exclaim', 1100);
    this.say('EI, VOCÊ AÍ!', 2000, true);
    game.audio.spotted();
    game.stats.detections++;
  }

  update(dt: number, game: Game) {
    this.moving = false;
    if (this.state === 'frozen') return;
    this.grace = Math.max(0, this.grace - dt);

    const p = game.player;
    if (this.grace <= 0 && p.floor === this.floor && !p.seat && Math.hypot(p.x - this.x, p.y - this.y) < CATCH) {
      game.story.capturePlayer(this);
      return;
    }

    switch (this.state) {
      case 'patrol': {
        const sense = this.grace <= 0 ? this.perceive(game) : null;
        if (sense) {
          this.spot(game);
          return;
        }
        if (this.walking) {
          if (this.move(dt, game, PATROL_SPEED)) this.waitT = 0.8 + Math.random() * 1.6;
          return;
        }
        this.faceFromHeading();
        this.waitT -= dt;
        if (this.waitT <= 0) this.nextWaypoint(game);
        return;
      }
      case 'spotted':
        this.stateT -= dt;
        this.turnToward(Math.atan2(p.y - this.y, p.x - this.x), 0.5);
        this.faceFromHeading();
        if (this.stateT <= 0) {
          this.state = 'chase';
          this.loseT = 0;
          this.repathT = 0;
        }
        return;
      case 'chase': {
        if (p.floor !== this.floor) {
          this.state = 'search';
          this.lookT = 2;
          return;
        }
        const sees = this.grace <= 0 && this.perceive(game) !== null;
        if (sees) this.loseT = 0;
        else this.loseT += dt;
        this.repathT -= dt;
        if (this.repathT <= 0 || !this.walking) {
          this.repathT = 0.3;
          this.walkTo(game, p.tile().x, p.tile().y, true);
        }
        const done = this.move(dt, game, CHASE_SPEED);
        this.faceFromHeading();
        if (this.loseT > 2.6 || (done && !sees)) {
          this.state = 'search';
          this.lookT = 2.4;
        }
        return;
      }
      case 'search':
        if (this.walking) {
          if (this.move(dt, game, 52)) this.lookT = 2;
          return;
        }
        this.lookPhase += dt * 2.4;
        this.heading += Math.sin(this.lookPhase) * dt * 2.4;
        this.faceFromHeading();
        this.lookT -= dt;
        if (this.lookT <= 0) {
          this.state = 'patrol';
          this.waitT = 0.4;
        }
        return;
    }
  }

  private nextWaypoint(game: Game) {
    for (let i = 0; i < 4 && this.waypoints.length > 0; i++) {
      const w = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
      const t = nearestFree(game.world, this.floor, w.x, w.y, 6);
      if (t && this.walkTo(game, t.x, t.y)) return;
    }
    this.waitT = 1.5;
  }

  drawOverlay(g: CanvasRenderingContext2D, game: Game) {
    if (this.state !== 'frozen') this.drawCone(g, game);
    super.drawOverlay(g, game);
  }

  private drawCone(g: CanvasRenderingContext2D, game: Game) {
    const ox = this.x;
    const oy = this.y - 4;
    const rays = 16;
    g.save();
    g.beginPath();
    g.moveTo(ox, oy);
    for (let i = 0; i <= rays; i++) {
      const a = this.heading - FOV / 2 + (FOV * i) / rays;
      const cx = Math.cos(a);
      const cy = Math.sin(a);
      let r = 6;
      while (r < SIGHT) {
        const px = ox + cx * r;
        const py = oy + cy * r;
        if (game.world.blocksSight(this.floor, Math.floor(px / TILE), Math.floor(py / TILE))) break;
        r += 5;
      }
      g.lineTo(ox + cx * r, oy + cy * r);
    }
    g.closePath();
    const chase = this.state === 'chase' || this.state === 'spotted';
    g.fillStyle = chase ? 'rgba(230,60,220,0.20)' : 'rgba(200,60,190,0.09)';
    g.fill();
    g.restore();
  }
}
