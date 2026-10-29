import type { Game } from '../Game';
import { PAPER_HIT_STUDENT, STUDENT_CHAT, pick } from '../story/dialogue';
import type { Seat } from '../systems/seating';
import type { Point } from '../types';
import { Character } from './Character';
import type { PersonLook } from './sprites';

type StudentState = 'seated' | 'walkToVisit' | 'visitChat' | 'walkHome' | 'panicWait' | 'fleeing' | 'hiding';
type SeatedAct = 'none' | 'chat' | 'lookL' | 'lookR' | 'shuffle' | 'laugh' | 'write' | 'hand';

export interface PanicPlan {
  /** Atraso (s) antes de sair correndo — escalona a saída pela porta. */
  delay: number;
  /** Faixa da porta (dentro/fora) que este aluno usa — divide a turma entre os dois tiles da porta. */
  lane: { inner: Point; outer: Point };
  /** Esconderijo no corredor. */
  spot: Point;
  line: string | null;
}

const VISITING: StudentState[] = ['walkToVisit', 'visitChat', 'walkHome'];

/**
 * Aluno NPC. Sentado: conversa, olha para os lados, mexe na carteira, ri, levanta a mão.
 * Em bagunça: às vezes se levanta para visitar um colega. No pânico: levanta, grita e corre
 * pela porta desviando de móveis (pathfinding) e de colegas (separação).
 */
export class Student extends Character {
  state: StudentState = 'seated';

  private act: SeatedAct = 'none';
  private actT = 0;
  private idleT = 1 + Math.random() * 3;
  private visitT = 12 + Math.random() * 14;
  private visitTarget: Student | null = null;
  private chatT = 0;
  private sideA: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
  private hitT = 0;
  private panicT = 0;
  private plan: PanicPlan | null = null;
  private hideT = 1 + Math.random() * 3;
  private tick = Math.random() * 10;
  private readonly runSpeed = 98 + Math.random() * 22;

  constructor(
    id: string,
    x: number,
    y: number,
    look: PersonLook,
    readonly home: Seat,
  ) {
    super(id, home.floor, x, y, look);
  }

  update(dt: number, game: Game) {
    this.tick += dt;
    this.moving = false;
    switch (this.state) {
      case 'seated':
        this.updateSeated(dt, game);
        break;
      case 'walkToVisit':
        this.arms = 'down';
        if (this.followPath(dt, game, 40)) {
          this.state = 'visitChat';
          this.chatT = 2.4 + Math.random() * 1.6;
          if (this.visitTarget) this.faceToward(this.visitTarget.x, this.visitTarget.y);
          this.showEmote('dots', 1500);
          if (Math.random() < 0.7) this.say(pick(STUDENT_CHAT), 2200);
        }
        break;
      case 'visitChat':
        this.chatT -= dt;
        this.bob = Math.floor(this.tick * 6) % 2 === 0 ? 0 : -1;
        if (this.chatT <= 0) {
          this.bob = 0;
          this.state = 'walkHome';
          if (!this.walkTo(game, this.home.tx, this.home.ty, true)) this.reseat(game);
        }
        break;
      case 'walkHome':
        if (this.followPath(dt, game, 40)) this.reseat(game);
        break;
      case 'panicWait':
        this.panicT -= dt;
        this.arms = 'up';
        this.bob = Math.floor(this.tick * 12) % 2 === 0 ? 0 : -1;
        if (this.plan) this.faceToward((this.plan.lane.inner.x + 0.5) * 16, (this.plan.lane.inner.y + 0.5) * 16);
        if (this.panicT <= 0 && this.plan) {
          this.bob = 0;
          this.setRoute([this.plan.lane.inner, this.plan.lane.outer, this.plan.spot]);
          this.state = 'fleeing';
        }
        break;
      case 'fleeing':
        this.arms = 'up';
        if (this.runRoute(dt, game, this.runSpeed)) {
          this.state = 'hiding';
          this.facing = 'down';
        }
        break;
      case 'hiding':
        this.arms = 'up';
        this.bob = Math.floor(this.tick * 9) % 2 === 0 ? 0 : -1;
        this.hideT -= dt;
        if (this.hideT <= 0) {
          this.showEmote(pick(['sweat', 'exclaim', 'dots'] as const), 1400);
          this.hideT = 2 + Math.random() * 3;
        }
        break;
    }
  }

  // ------------------------------------------------------------ em aula
  private updateSeated(dt: number, game: Game) {
    this.arms = 'down';
    this.headTurn = null;
    this.bob = 0;
    if (!this.seat) return;

    if (this.hitT > 0) {
      this.hitT -= dt;
      this.headTurn = 'left';
      return;
    }

    if (this.act !== 'none') {
      this.actT -= dt;
      switch (this.act) {
        case 'chat':
          this.headTurn = this.sideA;
          this.bob = Math.floor(this.tick * 6) % 2 === 0 ? 0 : -1;
          break;
        case 'lookL':
          this.headTurn = 'left';
          break;
        case 'lookR':
          this.headTurn = 'right';
          break;
        case 'shuffle':
          this.bob = Math.floor(this.tick * 7) % 2 === 0 ? 0 : -1;
          break;
        case 'laugh':
          this.bob = Math.floor(this.tick * 11) % 2 === 0 ? 0 : -1;
          break;
        case 'write':
          this.bob = 1;
          break;
        case 'hand':
          this.arms = 'up';
          break;
      }
      if (this.actT <= 0) this.act = 'none';
    } else {
      this.idleT -= dt;
      if (this.idleT <= 0) this.startAct(game);
    }

    // bagunça: às vezes visita um colega
    this.visitT -= dt;
    if (this.visitT <= 0) {
      this.visitT = 14 + Math.random() * 16;
      if (this.act === 'none' && game.story.reserveVisitor()) this.startVisit(game);
    }
  }

  private startAct(game: Game) {
    const chaos = 1 - game.story.patience / 100;
    const r = Math.random();
    const chat = 0.26 + chaos * 0.3;
    if (r < chat) {
      this.act = 'chat';
      this.actT = 1.8 + Math.random() * 1.6;
      this.sideA = Math.random() < 0.5 ? 'left' : 'right';
      this.showEmote('dots', this.actT * 1000);
      if (Math.random() < 0.4) this.say(pick(STUDENT_CHAT), 2200);
    } else if (r < chat + 0.22) {
      this.act = Math.random() < 0.5 ? 'lookL' : 'lookR';
      this.actT = 1 + Math.random() * 1.2;
    } else if (r < chat + 0.38) {
      this.act = 'shuffle';
      this.actT = 0.8 + Math.random() * 0.8;
    } else if (r < chat + 0.5 && chaos > 0.1) {
      this.act = 'laugh';
      this.actT = 1.2;
      this.showEmote('laugh', 1200);
    } else if (r < chat + 0.64) {
      this.act = 'write';
      this.actT = 1.5 + Math.random() * 1.5;
    } else if (r < chat + 0.72 && game.story.patience > 60) {
      this.act = 'hand';
      this.actT = 2 + Math.random();
    }
    this.idleT = (1.2 + Math.random() * 3.2) * (1 - chaos * 0.4);
  }

  private startVisit(game: Game) {
    const others = game.story.students.filter((s) => s !== this && s.state === 'seated' && s.seat);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const offsets: Array<[number, number]> = [
      [-1, 0],
      [1, 0],
      [0, 1],
    ];
    for (const target of others) {
      for (const [ox, oy] of offsets) {
        const tx = target.home.tx + ox;
        const ty = target.home.ty + oy;
        if (game.world.isSolidTile(this.floor, tx, ty)) continue;
        game.seats.stand(this);
        if (this.walkTo(game, tx, ty)) {
          this.visitTarget = target;
          this.state = 'walkToVisit';
          return;
        }
        // não achou caminho: volta a sentar
        this.state = 'walkHome';
        if (!this.walkTo(game, this.home.tx, this.home.ty, true)) this.reseat(game);
        return;
      }
    }
    game.story.releaseVisitor();
  }

  private reseat(game: Game) {
    game.story.releaseVisitor();
    this.visitTarget = null;
    this.arms = 'down';
    const seat = !this.home.occupant || this.home.occupant === this ? this.home : game.story.freeSeatFor(this);
    if (seat && game.seats.sit(this, seat)) {
      this.state = 'seated';
      this.act = 'none';
      this.idleT = 1.5;
    } else {
      this.state = 'seated'; // sem lugar: fica em pé, parado
    }
  }

  // ------------------------------------------------------------ reações
  /** Bolinha de papel acertou o aluno. */
  onHitByPaper() {
    if (this.state !== 'seated') return;
    this.hitT = 1.4;
    this.showEmote('exclaim', 1200);
    this.say(pick(PAPER_HIT_STUDENT), 1500);
  }

  laughAt() {
    if (this.state !== 'seated' || this.hitT > 0) return;
    this.act = 'laugh';
    this.actT = 1.4;
    this.showEmote('laugh', 1400);
  }

  reactTalk(line: string) {
    if (this.state !== 'seated') return;
    this.say(line, 2200);
    this.act = 'chat';
    this.actT = 1.6;
  }

  /** Protocolo Gil: levanta, grita e corre para a porta. */
  panic(game: Game, plan: PanicPlan) {
    if (VISITING.includes(this.state)) game.story.releaseVisitor();
    this.plan = plan;
    this.panicT = plan.delay;
    this.state = 'panicWait';
    this.stopWalking();
    if (this.seat) game.seats.stand(this);
    this.arms = 'up';
    this.act = 'none';
    this.showEmote('exclaim', 1400);
    if (plan.line) this.say(plan.line, 2600, true);
  }
}
