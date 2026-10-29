import { TILE, type FloorId } from '../constants';
import type { Game } from '../Game';
import { nearestFree } from '../systems/pathfinding';
import { angleDiff, hasLineOfSight } from '../systems/vision';
import type { Point } from '../types';
import { Character } from './Character';
import type { Hunter } from './Hunter';
import type { CaptorKey } from './captors';
import type { PersonLook } from './sprites';

type MiniState = 'patrol' | 'spotted' | 'chase' | 'search' | 'guard' | 'frozen';

interface MiniTuning {
  patrol: number;
  chase: number;
  sight: number;
  fov: number;
  prox: number;
  spotTime: number;
  loseTime: number;
  stunResist: number;
}

abstract class MiniBoss extends Character implements Hunter {
  global = true;
  readonly isHunter = true as const;
  /** Quem é este inspetor (define nome/fala/retrato da tela de captura). */
  abstract readonly captorKey: CaptorKey;
  state: MiniState = 'patrol';

  protected heading = Math.PI / 2;
  protected grace = 0;
  protected waitT = 1;
  protected stateT = 0;
  protected loseT = 0;
  protected repathT = 0;
  protected lookT = 0;
  protected guardT = 0;

  constructor(
    id: string,
    floor: FloorId,
    x: number,
    y: number,
    look: PersonLook,
    protected waypoints: Point[],
    protected tune: MiniTuning,
  ) {
    super(id, floor, x, y, look);
  }

  get alertLevel(): 'none' | 'search' | 'chase' {
    if (this.state === 'chase' || this.state === 'spotted') return 'chase';
    if (this.state === 'search' || this.state === 'guard') return 'search';
    return 'none';
  }

  freeze() {
    this.state = 'frozen';
    this.stopWalking();
  }

  lure(game: Game, tile: Point): boolean {
    if (this.state === 'chase' || this.state === 'frozen' || this.state === 'spotted') return false;
    this.state = 'search';
    this.lookT = 4;
    this.walkTo(game, tile.x, tile.y);
    return true;
  }

  stagger(seconds: number) {
    if (this.state === 'frozen') return;
    this.stopWalking();
    this.state = 'patrol';
    this.grace = 2.5;
    this.waitT = 0.6;
    this.loseT = 0;
    this.showEmote('sweat', seconds * 1000 * this.tune.stunResist);
  }

  investigate(game: Game, p: Point) {
    if (this.state === 'chase' || this.state === 'frozen') return;
    this.state = 'search';
    this.lookT = 3;
    this.walkTo(game, p.x, p.y);
  }

  protected perceive(game: Game): 'sight' | 'near' | null {
    const p = game.player;
    if (p.floor !== this.floor) return null;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 220 && hasLineOfSight(game.world, this.floor, this.x, this.y - 4, p.x, p.y - 4)) {
      if (d <= this.tune.prox) return 'near';
      if (d <= this.tune.sight && Math.abs(angleDiff(Math.atan2(dy, dx), this.heading)) <= this.tune.fov / 2)
        return 'sight';
    }
    return null;
  }

  protected turnToward(angle: number, k = 0.3) {
    this.heading += angleDiff(angle, this.heading) * k;
  }

  protected faceFromHeading() {
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    this.facing = Math.abs(c) > Math.abs(s) ? (c > 0 ? 'right' : 'left') : s > 0 ? 'down' : 'up';
  }

  protected stepMove(dt: number, game: Game, speed: number): boolean {
    const bx = this.x;
    const by = this.y;
    const done = this.followPath(dt, game, speed);
    const dx = this.x - bx;
    const dy = this.y - by;
    if (dx * dx + dy * dy > 0.01) this.turnToward(Math.atan2(dy, dx), 0.35);
    return done;
  }

  protected spot(game: Game, shout: string) {
    this.state = 'spotted';
    this.stateT = this.tune.spotTime;
    this.stopWalking();
    this.showEmote('exclaim', 1100);
    this.say(shout, 2000, true);
    game.audio.spotted();
    game.stats.detections++;
    this.onSpotted(game);
  }

  /** Gancho das habilidades especiais (sobrescrito por cada mini-boss). */
  protected onSpotted(_game: Game) {}

  private nextWaypoint(game: Game) {
    for (let i = 0; i < 4 && this.waypoints.length > 0; i++) {
      const w = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
      const t = nearestFree(game.world, this.floor, w.x, w.y, 6);
      if (t && this.walkTo(game, t.x, t.y)) return;
    }
    this.waitT = 1.5;
  }

  update(dt: number, game: Game) {
    this.moving = false;
    if (this.state === 'frozen') return;
    this.grace = Math.max(0, this.grace - dt);

    const p = game.player;
    if (this.grace <= 0 && p.floor === this.floor && !p.seat && Math.hypot(p.x - this.x, p.y - this.y) < 12) {
      game.story.capturePlayer(this);
      return;
    }

    switch (this.state) {
      case 'patrol': {
        if (this.grace <= 0 && this.perceive(game)) {
          this.spot(game, this.shoutLine());
          return;
        }
        if (this.walking) {
          if (this.stepMove(dt, game, this.tune.patrol)) this.waitT = 0.8 + Math.random() * 1.6;
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
          this.onLostFloor(game);
          return;
        }
        const sees = this.grace <= 0 && this.perceive(game) !== null;
        this.loseT = sees ? 0 : this.loseT + dt;
        this.repathT -= dt;
        if (this.repathT <= 0 || !this.walking) {
          this.repathT = 0.35;
          this.walkTo(game, p.tile().x, p.tile().y, true);
        }
        const done = this.stepMove(dt, game, this.tune.chase);
        this.faceFromHeading();
        if (this.loseT > this.tune.loseTime || (done && !sees)) this.onLostSight(game);
        return;
      }
      case 'search':
        if (this.walking) {
          if (this.stepMove(dt, game, 52)) this.lookT = 2;
          return;
        }
        this.heading += dt * 1.8;
        this.faceFromHeading();
        this.lookT -= dt;
        if (this.lookT <= 0) {
          this.state = 'patrol';
          this.waitT = 0.4;
        }
        return;
      case 'guard':
        if (this.walking) {
          if (this.stepMove(dt, game, this.tune.patrol + 14)) this.guardT = 9;
          return;
        }
        this.faceFromHeading();
        if (this.grace <= 0 && this.perceive(game)) {
          this.spot(game, this.shoutLine());
          return;
        }
        this.guardT -= dt;
        if (this.guardT <= 0) {
          this.state = 'search';
          this.lookT = 2;
        }
        return;
    }
  }

  protected onLostFloor(game: Game) {
    this.state = 'search';
    this.lookT = 2;
    void game;
  }

  protected onLostSight(game: Game) {
    this.state = 'search';
    this.lookT = 2.4;
    void game;
  }

  protected shoutLine(): string {
    return 'EI, VOCÊ AÍ!';
  }

  drawOverlay(g: CanvasRenderingContext2D, game: Game) {
    if (this.state !== 'frozen') this.drawCone(g, game);
    super.drawOverlay(g, game);
  }

  private drawCone(g: CanvasRenderingContext2D, game: Game) {
    const ox = this.x;
    const oy = this.y - 4;
    const rays = 14;
    g.save();
    g.beginPath();
    g.moveTo(ox, oy);
    for (let i = 0; i <= rays; i++) {
      const a = this.heading - this.tune.fov / 2 + (this.tune.fov * i) / rays;
      const cx = Math.cos(a);
      const cy = Math.sin(a);
      let r = 6;
      while (r < this.tune.sight) {
        const px = ox + cx * r;
        const py = oy + cy * r;
        if (game.world.blocksSight(this.floor, Math.floor(px / TILE), Math.floor(py / TILE))) break;
        r += 5;
      }
      g.lineTo(ox + cx * r, oy + cy * r);
    }
    g.closePath();
    const chase = this.state === 'chase' || this.state === 'spotted';
    g.fillStyle = chase ? 'rgba(230,120,40,0.20)' : 'rgba(230,150,60,0.08)';
    g.fill();
    g.restore();
  }
}

// ---------------------------------------------------------------- Wagner
const WAGNER_LOOK: PersonLook = {
  hair: '#3a2a1a',
  skin: '#e8b48a',
  shirt: '#7a1f3d',
  shirtHi: '#a83255',
  pants: '#23232e',
  shoe: '#101014',
  bag: null,
  eye: '#1b1b24',
  hairStyle: 'long',
  aura: 'rgba(220,60,60,0.22)',
};

/**
 * WAGNER — "príncipe" de barba grande. Detecta muito rápido e, ao perder o
 * jogador de vista, corre para guardar a escada/saída mais próxima (bloqueio
 * temporário e fictício de passagem).
 */
export class Wagner extends MiniBoss {
  readonly captorKey: CaptorKey = 'wagner';

  constructor(id: string, floor: FloorId, x: number, y: number, waypoints: Point[]) {
    super(id, floor, x, y, WAGNER_LOOK, waypoints, {
      patrol: 46,
      chase: 90,
      sight: 120,
      fov: Math.PI * 0.5,
      prox: 40,
      spotTime: 0.22,
      loseTime: 2.2,
      stunResist: 1,
    });
  }

  protected shoutLine() {
    return 'PARE AÍ, RAPAZ!';
  }

  protected onLostSight(game: Game) {
    // corre para guardar a escada mais próxima do jogador
    const map = game.world.map(this.floor);
    const p = game.player.tile();
    let best: Point | null = null;
    let bestD = Infinity;
    for (const portal of map.portals) {
      const cx = portal.rect.x + portal.rect.w / 2;
      const cy = portal.rect.y + portal.rect.h / 2;
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < bestD) {
        bestD = d;
        best = { x: Math.floor(cx), y: Math.floor(cy) };
      }
    }
    if (best) {
      const t = nearestFree(game.world, this.floor, best.x, best.y + 1, 6);
      if (t && this.walkTo(game, t.x, t.y)) {
        this.state = 'guard';
        this.say('NINGUÉM PASSA POR AQUI!', 2000, true);
        return;
      }
    }
    super.onLostSight(game);
  }
}

// ---------------------------------------------------------------- Marli
const MARLI_LOOK: PersonLook = {
  hair: '#111114',
  skin: '#d9a577',
  shirt: '#2f6b4f',
  shirtHi: '#47936e',
  pants: '#1f2a33',
  shoe: '#101014',
  bag: null,
  eye: '#1b1b24',
  hairStyle: 'bun',
  glasses: true,
  aura: 'rgba(60,200,120,0.20)',
};

/**
 * MARLI — campo de visão ampliado; ao avistar o jogador, alerta os outros
 * caçadores próximos (alerta regional real via AlertSystem).
 */
export class Marli extends MiniBoss {
  readonly captorKey: CaptorKey = 'marli';

  constructor(id: string, floor: FloorId, x: number, y: number, waypoints: Point[]) {
    super(id, floor, x, y, MARLI_LOOK, waypoints, {
      patrol: 40,
      chase: 82,
      sight: 185,
      fov: Math.PI * 0.78,
      prox: 34,
      spotTime: 0.5,
      loseTime: 2.6,
      stunResist: 1,
    });
  }

  protected shoutLine() {
    return 'EU VI! TODO MUNDO PRA CÁ!';
  }

  protected onSpotted(game: Game) {
    game.alert.raiseRegional(this.x, this.y, this.floor, 340);
    game.showMessage('📢 Marli alertou os outros inspetores!', 2400);
  }
}

// ---------------------------------------------------------------- Biscaia
const BISCAIA_LOOK: PersonLook = {
  hair: '#4a4a52',
  skin: '#c9a06a',
  shirt: '#3d3d4d',
  shirtHi: '#55556a',
  pants: '#1a1a22',
  shoe: '#0c0c10',
  bag: '#5a3a1a',
  eye: '#1b1b24',
  hairStyle: 'short',
  aura: 'rgba(150,150,180,0.22)',
};

/**
 * BISCAIA — patrulha áreas importantes, resiste a atordoamentos (metade do
 * tempo) e aumenta o alerta regional ao entrar em perseguição.
 */
export class Biscaia extends MiniBoss {
  readonly captorKey: CaptorKey = 'biscaia';

  constructor(id: string, floor: FloorId, x: number, y: number, waypoints: Point[]) {
    super(id, floor, x, y, BISCAIA_LOOK, waypoints, {
      patrol: 42,
      chase: 86,
      sight: 140,
      fov: Math.PI * 0.6,
      prox: 36,
      spotTime: 0.45,
      loseTime: 3.4,
      stunResist: 0.5,
    });
  }

  protected shoutLine() {
    return 'ÁREA RESTRITA! VOLTE JÁ!';
  }

  protected onSpotted(game: Game) {
    game.alert.raiseRegional(this.x, this.y, this.floor, 260);
  }
}
