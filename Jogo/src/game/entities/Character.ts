import { TILE } from '../constants';
import type { Game } from '../Game';
import { moveWithCollision } from '../engine/collision';
import { findPath } from '../systems/pathfinding';
import type { Point } from '../types';
import { Entity } from './Entity';
import {
  drawBubble,
  drawEmote,
  drawPerson,
  type Arms,
  type EmoteKind,
  type PersonLook,
  type PersonPose,
} from './sprites';

/**
 * Qualquer pessoa do jogo (jogador, alunos, professora, Gil...): aparência, balões de fala,
 * emotes e caminhada por pathfinding com desvio de paredes, móveis e de outros personagens.
 */
export abstract class Character extends Entity {
  moving = false;
  walkT = 0;
  arms: Arms = 'down';
  headTurn: 'left' | 'right' | null = null;
  bob = 0;

  bubble: { text: string; until: number; shout: boolean } | null = null;
  emote: { kind: EmoteKind; until: number } | null = null;

  protected path: Point[] = [];
  protected pi = 0;
  protected goal: Point | null = null;
  protected goalSolid = false;
  protected stuckT = 0;
  private repaths = 0;

  // rota com várias etapas (ex.: porta → corredor → esconderijo)
  protected route: Point[] = [];
  protected routeIdx = 0;

  constructor(
    id: string,
    floor: Entity['floor'],
    x: number,
    y: number,
    public look: PersonLook,
  ) {
    super(id, floor, x, y);
  }

  // ------------------------------------------------------------ utilidades
  tile(): Point {
    return { x: Math.floor(this.x / TILE), y: Math.floor(this.y / TILE) };
  }

  setTilePos(tx: number, ty: number) {
    this.x = (tx + 0.5) * TILE;
    this.y = (ty + 0.5) * TILE;
  }

  faceToward(x: number, y: number) {
    const dx = x - this.x;
    const dy = y - this.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  say(text: string, ms = 2400, shout = false) {
    this.bubble = { text, until: performance.now() + ms, shout };
  }

  showEmote(kind: EmoteKind, ms = 1600) {
    this.emote = { kind, until: performance.now() + ms };
  }

  // ------------------------------------------------------------ pathfinding
  get walking() {
    return this.goal !== null;
  }

  /**
   * Calcula o caminho até o tile. Com `intoSolid`, o destino pode ser sólido (ex.: cadeira):
   * o personagem para no tile vizinho.
   */
  walkTo(game: Game, tx: number, ty: number, intoSolid = false): boolean {
    this.repaths = 0;
    return this.computePath(game, tx, ty, intoSolid);
  }

  private computePath(game: Game, tx: number, ty: number, intoSolid: boolean): boolean {
    const t = this.tile();
    const solid = game.world.isSolidTile(this.floor, tx, ty);
    const path = findPath(game.world, this.floor, t.x, t.y, tx, ty, { allowSolidGoal: intoSolid });
    if (!path) {
      this.stopWalking();
      return false;
    }
    if (solid && intoSolid) path.pop();
    this.path = path;
    this.pi = path.length > 1 ? 1 : 0;
    this.goal = { x: tx, y: ty };
    this.goalSolid = intoSolid;
    this.stuckT = 0;
    return true;
  }

  stopWalking() {
    this.path = [];
    this.pi = 0;
    this.goal = null;
    this.moving = false;
  }

  /** Anda um passo pelo caminho. Retorna true quando não há mais caminho a seguir. */
  followPath(dt: number, game: Game, speed: number): boolean {
    if (this.pi >= this.path.length) {
      this.stopWalking();
      return true;
    }
    const wp = this.path[this.pi];
    const tx = (wp.x + 0.5) * TILE;
    const ty = (wp.y + 0.5) * TILE;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.2) {
      this.pi++;
      if (this.pi >= this.path.length) {
        this.stopWalking();
        return true;
      }
      return false;
    }

    const step = Math.min(speed * dt, dist);
    let mx = (dx / dist) * step;
    let my = (dy / dist) * step;
    const sep = this.separation(game);
    mx += sep.x * dt;
    my += sep.y * dt;

    const bx = this.x;
    const by = this.y;
    moveWithCollision(game.world, this, mx, my);
    const moved = Math.hypot(this.x - bx, this.y - by);

    this.moving = true;
    this.walkT += dt * (speed / 70);
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';

    if (moved < step * 0.25) {
      this.stuckT += dt;
      if (this.stuckT > 0.6) this.repath(game);
    } else {
      this.stuckT = 0;
    }
    return false;
  }

  private repath(game: Game) {
    this.stuckT = 0;
    if (!this.goal || this.repaths >= 6) {
      this.stopWalking();
      return;
    }
    this.repaths++;
    this.computePath(game, this.goal.x, this.goal.y, this.goalSolid);
  }

  /** Empurrão suave para não ficar sobreposto aos outros (evita engarrafamento na porta). */
  private separation(game: Game): Point {
    let sx = 0;
    let sy = 0;
    for (const e of game.entities) {
      if (e === this || !(e instanceof Character) || e.floor !== this.floor || e.seat) continue;
      const dx = this.x - e.x;
      const dy = this.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d < 9 && d > 0.01) {
        const f = (9 - d) / 9;
        sx += (dx / d) * f * 26;
        sy += (dy / d) * f * 26;
      }
    }
    return { x: sx, y: sy };
  }

  // ------------------------------------------------------------ rotas de várias etapas
  setRoute(points: Point[]) {
    this.route = points;
    this.routeIdx = 0;
    this.stopWalking();
  }

  /** Segue a rota ponto a ponto (pula etapas inalcançáveis). Retorna true ao terminar. */
  runRoute(dt: number, game: Game, speed: number): boolean {
    if (!this.walking) {
      while (this.routeIdx < this.route.length) {
        const p = this.route[this.routeIdx];
        if (this.walkTo(game, p.x, p.y)) break;
        this.routeIdx++;
      }
      if (this.routeIdx >= this.route.length) return true;
    }
    if (this.followPath(dt, game, speed)) this.routeIdx++;
    return this.routeIdx >= this.route.length && !this.walking;
  }

  // ------------------------------------------------------------ desenho
  protected pose(): PersonPose {
    return {
      x: this.x,
      y: this.y,
      facing: this.facing,
      moving: this.moving,
      walkT: this.walkT,
      sitting: this.seat !== null,
      arms: this.arms,
      headTurn: this.headTurn,
      bob: this.bob,
      talking: this.bubble !== null && this.bubble.until > performance.now(),
    };
  }

  draw(g: CanvasRenderingContext2D) {
    drawPerson(g, this.look, this.pose());
  }

  drawOverlay(g: CanvasRenderingContext2D, game: Game) {
    const now = performance.now();
    if (this.bubble && this.bubble.until <= now) this.bubble = null;
    if (this.emote && this.emote.until <= now) this.emote = null;
    if (!this.bubble && !this.emote) return;

    const head = Math.round(this.y) + 4 - 16 + (this.seat ? 1 : 0) - 2;
    const camX = Math.round(game.camera.x);
    if (this.bubble) {
      drawBubble(g, this.bubble.text, this.x, head, {
        shout: this.bubble.shout,
        minX: camX + 2,
        maxX: camX + game.viewW - 2,
      });
    } else if (this.emote) {
      drawEmote(g, this.emote.kind, this.x, head);
    }
  }
}
