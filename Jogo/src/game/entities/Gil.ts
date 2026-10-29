import type { FloorId } from '../constants';
import { TILE } from '../constants';
import type { Game } from '../Game';
import { nearestFree } from '../systems/pathfinding';
import { angleDiff, hasLineOfSight } from '../systems/vision';
import type { PortalDef, Point } from '../types';
import { Character } from './Character';
import type { Hunter } from './Hunter';
import type { CaptorKey } from './captors';
import type { PersonLook } from './sprites';

export type GilState = 'patrol' | 'spotted' | 'chase' | 'search' | 'toStairs' | 'frozen';

const PATROL_SPEED = 40;
const CHASE_SPEED = 94; // mais rápido que andar (70), mais lento que correr (115)
const SEARCH_SPEED = 54;
const SIGHT = 150; // alcance da visão (px)
const FOV = Math.PI * 0.62; // ~112° de campo de visão
const PROX = 38; // percebe quem está muito perto, mesmo de costas
const HEAR = 95; // ouve o jogador correndo
const CATCH = 12;
const CATCH_SEATED = 19; // cadeira sólida impede de chegar ao centro do tile

const LOOK: PersonLook = {
  hair: '#101014',
  skin: '#c9c9cf',
  shirt: '#26262e',
  shirtHi: '#3c3c4a',
  pants: '#15151c',
  shoe: '#050507',
  bag: null,
  eye: '#ff2020',
  hairStyle: 'short',
  aura: 'rgba(255,30,30,0.28)',
};

/**
 * O Gil. Patrulha os corredores, enxerga em um cone (bloqueado por paredes), ouve passos
 * rápidos, persegue pelo caminho mais curto (A*), contorna obstáculos e até sobe/desce escadas
 * atrás do jogador. Sem combate: ao encostar, o jogador é capturado.
 */
export class Gil extends Character implements Hunter {
  global = true;
  readonly isHunter = true as const;
  readonly captorKey: CaptorKey = 'gil';
  state: GilState = 'patrol';
  /** Atordoado (proteção improvisada): fica parado até o tempo acabar. */
  private stunT = 0;

  private heading = Math.PI / 2;
  private grace = 0;
  private waitT = 1;
  private stateT = 0;
  private lookT = 0;
  private loseT = 0;
  private repathT = 0;
  private stairsT = 0;
  private lastKnown: Point | null = null;
  private portal: PortalDef | null = null;
  private lookPhase = 0;

  constructor(
    id: string,
    floor: FloorId,
    x: number,
    y: number,
    private patrol: Record<FloorId, Point[]>,
  ) {
    super(id, floor, x, y, LOOK);
  }

  get alertLevel(): 'none' | 'search' | 'chase' {
    if (this.state === 'chase' || this.state === 'spotted' || this.state === 'toStairs') return 'chase';
    if (this.state === 'search') return 'search';
    return 'none';
  }

  // ------------------------------------------------------------ controle externo
  freeze() {
    this.state = 'frozen';
    this.stopWalking();
  }

  /** Distrator: faz o Gil ir investigar o tile (ignora se ele já está perseguindo ou atordoado). */
  lure(game: Game, tile: Point): boolean {
    if (this.state === 'frozen' || this.stunT > 0 || this.alertLevel === 'chase') return false;
    if (this.state === 'toStairs') return false;
    this.investigate(game, tile);
    return true;
  }

  /** Atordoa o Gil e dá ao jogador tempo para fugir. */
  stagger(seconds: number) {
    if (this.state === 'frozen') return;
    this.stopWalking();
    this.state = 'patrol';
    this.stunT = seconds;
    this.grace = 2.5; // tolerância depois que o atordoamento passa
    this.waitT = 0.6;
    this.loseT = 0;
    this.lastKnown = null;
    this.showEmote('sweat', seconds * 1000);
  }

  /** Volta ao ponto inicial e patrulha de novo (com alguns segundos de tolerância). */
  reset(tx: number, ty: number, grace: number, floor: FloorId = 'ground') {
    this.floor = floor;
    this.setTilePos(tx, ty);
    this.state = 'patrol';
    this.grace = grace;
    this.waitT = 1;
    this.loseT = 0;
    this.lastKnown = null;
    this.portal = null;
    this.stopWalking();
  }

  investigate(game: Game, tile: Point) {
    this.state = 'search';
    this.lastKnown = tile;
    this.lookT = 2.6;
    this.walkTo(game, tile.x, tile.y, true);
  }

  // ------------------------------------------------------------ percepção
  private perceive(game: Game): 'sight' | 'near' | 'hear' | null {
    const p = game.player;
    if (p.floor !== this.floor) return null;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 220 && hasLineOfSight(game.world, this.floor, this.x, this.y - 4, p.x, p.y - 4)) {
      if (d <= PROX) return 'near';
      if (d <= SIGHT && Math.abs(angleDiff(Math.atan2(dy, dx), this.heading)) <= FOV / 2) return 'sight';
    }
    if (p.running && d <= HEAR) return 'hear';
    return null;
  }

  /** Já está perseguindo: enxerga em qualquer direção dentro do alcance. */
  private canTrack(game: Game): boolean {
    const p = game.player;
    if (p.floor !== this.floor) return false;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    return d <= SIGHT * 1.35 && hasLineOfSight(game.world, this.floor, this.x, this.y - 4, p.x, p.y - 4);
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
    this.stateT = 0.55;
    this.stopWalking();
    this.showEmote('exclaim', 1000);
    game.audio.spotted();
    game.stats.detections++;
  }

  // ------------------------------------------------------------ atualização
  update(dt: number, game: Game) {
    this.moving = false;
    if (this.state === 'frozen') return;
    if (this.stunT > 0) {
      this.stunT -= dt;
      this.grace = Math.max(this.grace, 0.5);
      return;
    }
    this.grace = Math.max(0, this.grace - dt);

    const p = game.player;
    if (this.grace <= 0 && p.floor === this.floor && this.state !== 'toStairs') {
      const reach = p.seat ? CATCH_SEATED : CATCH;
      if (Math.hypot(p.x - this.x, p.y - this.y) < reach) {
        game.story.capturePlayer(this);
        return;
      }
    }

    switch (this.state) {
      case 'patrol':
        this.updatePatrol(dt, game);
        break;
      case 'spotted':
        this.stateT -= dt;
        this.turnToward(Math.atan2(p.y - this.y, p.x - this.x), 0.5);
        this.faceFromHeading();
        if (this.stateT <= 0) {
          this.state = 'chase';
          this.loseT = 0;
          this.repathT = 0;
          this.lastKnown = p.tile();
        }
        break;
      case 'chase':
        this.updateChase(dt, game);
        break;
      case 'search':
        this.updateSearch(dt, game);
        break;
      case 'toStairs':
        this.updateStairs(dt, game);
        break;
    }
  }

  private updatePatrol(dt: number, game: Game) {
    const sense = this.grace <= 0 ? this.perceive(game) : null;
    if (sense === 'sight' || sense === 'near') {
      this.spot(game);
      return;
    }
    if (sense === 'hear') {
      this.investigate(game, game.player.tile());
      return;
    }
    if (this.walking) {
      if (this.move(dt, game, PATROL_SPEED)) this.waitT = 0.8 + Math.random() * 1.8;
      return;
    }
    this.faceFromHeading();
    this.waitT -= dt;
    if (this.waitT <= 0) this.nextWaypoint(game);
  }

  private nextWaypoint(game: Game) {
    const list = this.patrol[this.floor] ?? [];
    for (let i = 0; i < 5 && list.length > 0; i++) {
      const w = list[Math.floor(Math.random() * list.length)];
      const t = nearestFree(game.world, this.floor, w.x, w.y, 6);
      if (t && this.walkTo(game, t.x, t.y)) return;
    }
    this.waitT = 1.5;
  }

  private updateChase(dt: number, game: Game) {
    const p = game.player;
    if (p.floor !== this.floor) {
      this.beginStairs(game);
      return;
    }
    const sees = this.canTrack(game);
    if (sees) {
      this.loseT = 0;
      this.lastKnown = p.tile();
    } else {
      this.loseT += dt;
    }

    this.repathT -= dt;
    if (this.repathT <= 0 || !this.walking) {
      this.repathT = 0.28;
      const g = sees ? p.tile() : (this.lastKnown ?? p.tile());
      this.walkTo(game, g.x, g.y, true);
    }
    const done = this.move(dt, game, CHASE_SPEED);
    this.faceFromHeading();

    if (this.loseT > 3.2 || (done && !sees)) {
      this.state = 'search';
      this.lookT = 2.6;
      if (this.lastKnown && !this.walking) this.walkTo(game, this.lastKnown.x, this.lastKnown.y, true);
    }
  }

  private updateSearch(dt: number, game: Game) {
    const sense = this.grace <= 0 ? this.perceive(game) : null;
    if (sense === 'sight' || sense === 'near') {
      this.spot(game);
      return;
    }
    if (game.player.floor !== this.floor && this.lastKnown === null) {
      this.state = 'patrol';
      return;
    }
    if (this.walking) {
      if (this.move(dt, game, SEARCH_SPEED)) this.lookT = 2.6;
      return;
    }
    // olha ao redor
    this.lookPhase += dt * 2.5;
    this.heading += Math.sin(this.lookPhase) * dt * 2.6;
    this.faceFromHeading();
    this.lookT -= dt;
    if (this.lookT <= 0) {
      this.state = 'patrol';
      this.lastKnown = null;
      this.waitT = 0.3;
    }
  }

  // ------------------------------------------------------------ escadas
  private beginStairs(game: Game) {
    const target = game.player.floor;
    const options = game.world.map(this.floor).portals.filter((p) => p.target.floor === target);
    let best: PortalDef | null = null;
    let bestD = Infinity;
    for (const o of options) {
      const d = Math.abs((o.rect.x + o.rect.w / 2) * TILE - this.x) + Math.abs((o.rect.y + o.rect.h / 2) * TILE - this.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    if (!best) {
      this.state = 'patrol';
      return;
    }
    const cx = best.rect.x + Math.floor(best.rect.w / 2);
    const cy = best.rect.y + Math.floor(best.rect.h / 2);
    if (!this.walkTo(game, cx, cy)) {
      this.state = 'patrol';
      return;
    }
    this.portal = best;
    this.stairsT = 0.9;
    this.state = 'toStairs';
  }

  private updateStairs(dt: number, game: Game) {
    if (game.player.floor === this.floor) {
      this.state = 'search';
      this.lookT = 1.2;
      return;
    }
    if (this.walking) {
      this.move(dt, game, CHASE_SPEED * 0.92);
      this.faceFromHeading();
      return;
    }
    this.stairsT -= dt;
    if (this.stairsT <= 0 && this.portal) {
      const t = this.portal.target;
      this.floor = t.floor;
      this.setTilePos(t.tx, t.ty);
      this.state = 'search';
      this.lastKnown = { x: t.tx, y: t.ty };
      this.lookT = 2.2;
      this.grace = 1;
      this.portal = null;
      this.stopWalking();
    }
  }

  // ------------------------------------------------------------ desenho
  drawOverlay(g: CanvasRenderingContext2D, game: Game) {
    if (this.state !== 'frozen') this.drawCone(g, game);
    super.drawOverlay(g, game);
  }

  /** Cone de visão (recortado pelas paredes) — ajuda o jogador a aprender a se esconder. */
  private drawCone(g: CanvasRenderingContext2D, game: Game) {
    const ox = this.x;
    const oy = this.y - 4;
    const rays = 18;
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
    g.fillStyle = chase ? 'rgba(255,40,40,0.20)' : 'rgba(255,70,50,0.10)';
    g.fill();
    g.restore();
  }
}
