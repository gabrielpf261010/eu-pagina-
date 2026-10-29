import { TILE, type FloorId } from '../constants';
import type { Game } from '../Game';
import type { Character } from '../entities/Character';
import { Decoy } from '../entities/Decoy';
import { Elaine } from '../entities/Elaine';
import type { Entity } from '../entities/Entity';
import { Biscaia, Marli, Wagner } from '../entities/MiniBosses';
import { Gil } from '../entities/Gil';
import { captorIdentity, type CaptorIdentity } from '../entities/captors';
import type { Hunter } from '../entities/Hunter';
import { PaperBall } from '../entities/PaperBall';
import type { PersonLook } from '../entities/sprites';
import { Student } from '../entities/Student';
import { Teacher } from '../entities/Teacher';
import type { Interactable } from '../systems/interaction';
import { nearestFree } from '../systems/pathfinding';
import type { Seat } from '../systems/seating';
import type { Container } from '../items/Container';
import type { Facing, Point, Rect, RoomDef } from '../types';
import { T } from '../world/tiles';
import { CHAPTER1 } from './config';
import {
  PANIC_LINES,
  PLAYER_TALK,
  PRANKS,
  STUDENT_REPLIES,
  THRESHOLD_LINES,
  pick,
  type PropAction,
} from './dialogue';
import {
  INITIAL_STORY_HUD,
  type StoryHud,
  type StoryPhase,
  type Subtitle,
  type SubtitleKind,
} from './types';

interface Lane {
  inner: Point;
  outer: Point;
}

interface RoomInfo {
  lanes: Lane[];
  spots: Point[];
  teacherRoute: Point[];
}

interface CutsceneState {
  step: 'intro' | 'walk' | 'press';
  t: number;
  pressed: boolean;
}

const FACING_VEC: Record<Facing, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Ações de "interagir com objetos" da sala — cada uma tira um pouco da paciência. */
const PROP_ACTIONS: Record<number, PropAction> = {
  [T.TRASH]: { label: 'Chutar a lixeira', message: 'BLAM! Você chutou a lixeira!', cost: 7, sfx: 'thud' },
  [T.PLANT]: { label: 'Mexer na planta', message: 'Você arrancou uma folhinha da planta.', cost: 5, sfx: 'pop' },
  // armários, gavetas e mochilas agora são recipientes (ItemSystem) — vasculhá-los também irrita a professora
  [T.WALL_BOARD]: { label: 'Desenhar no quadro', message: 'Você desenhou um boneco no quadro!', cost: 9, sfx: 'pop' },
  [T.WALL_PANIC]: {
    label: 'Mexer no botão vermelho',
    message: 'Você encostou no botão?! A Lucivana viu!',
    cost: 15,
    sfx: 'thud',
  },
};

const HAIRS = ['#2a1a10', '#4a2e1a', '#c9a24a', '#111114', '#8a3a1a', '#6b4a2a'];
const SKINS = ['#f0c08f', '#d9a577', '#b97f55', '#8a5a3c', '#f5d0b0'];
const SHIRTS: Array<[string, string]> = [
  ['#f2f2f2', '#ffffff'],
  ['#f2f2f2', '#ffffff'],
  ['#e8c23a', '#f6dc6a'],
  ['#3a7bd5', '#5b97ea'],
  ['#e0553a', '#f07a62'],
  ['#3aa66a', '#5cc88a'],
  ['#8a5cc8', '#a67ee0'],
];
const PANTS = ['#2a3350', '#3a3a44', '#2f4a7a', '#4a3a2a'];

function studentLook(i: number): PersonLook {
  const [shirt, shirtHi] = SHIRTS[(i * 3 + 1) % SHIRTS.length];
  const girl = i % 2 === 1;
  return {
    hair: HAIRS[(i * 5 + 2) % HAIRS.length],
    skin: SKINS[(i * 3) % SKINS.length],
    shirt,
    shirtHi,
    pants: PANTS[i % PANTS.length],
    shoe: '#15151c',
    bag: i % 3 === 0 ? '#c9892e' : null,
    eye: '#1b1b24',
    hairStyle: girl ? 'long' : 'short',
    skirt: girl && i % 4 === 1,
  };
}

/**
 * Capítulo 1 — "O Botão do Pânico".
 *
 * Máquina de estados (StoryPhase): AULA → BAGUNCA → ALERTA → CUTSCENE → CONTAGEM →
 * EXPLORACAO → CAPTURADO. Cada evento "único" passa por `once()`, que garante execução
 * uma vez por tentativa (a lista é limpa em `teardown()` ao recomeçar).
 */
export class StoryController {
  phase: StoryPhase = 'AULA';
  patience = 100;
  attempt = 1;
  time = 0;
  countdown: number | null = null;
  students: Student[] = [];
  teacher: Teacher | null = null;
  gil: Gil | null = null;

  private ceiling = 100;
  private fired = new Set<string>();
  private props: Interactable[] = [];
  private studentInteractables: Interactable[] = [];
  private roomSeats: Seat[] = [];
  private room: RoomInfo | null = null;
  private roomRect: Rect | null = null;
  private playerSeat: Seat | null = null;
  private subtitle: { sub: Subtitle; until: number } | null = null;
  private banner: { text: string; until: number } | null = null;
  private lastMischief = 0;
  private cd = { talk: 0, throwBall: 0, prank: 0, stand: 0 };
  private cs: CutsceneState | null = null;
  private visitors = 0;
  private suppress = false;
  private capturedAt = 0;
  private alarmOn = false;
  private lastBeep = 0;
  private propUsed = new Map<string, number>();
  private nextId = 0;

  constructor(private game: Game) {}

  // ------------------------------------------------------------ consultas
  get classInSession() {
    return this.phase === 'AULA' || this.phase === 'BAGUNCA' || this.phase === 'ALERTA';
  }

  /** Cutscene e tela de captura bloqueiam os controles do jogador. */
  get controlsLocked() {
    return this.phase === 'CUTSCENE' || this.phase === 'CAPTURADO';
  }

  get alarmActive() {
    return this.alarmOn;
  }

  /** Inspetora Elaine (mini-chefe da Rota 3). */
  elaine: Elaine | null = null;
  /** Quem capturou o jogador na tentativa atual (nome/fala/retrato vêm dele). */
  captor: CaptorIdentity | null = null;
  /** Guarda o retrato do captor para a tela de derrota. */
  captorLook: PersonLook | null = null;
  /** Mini-bosses: Wagner e Marli (térreo), Biscaia (1º andar). */
  wagner: Wagner | null = null;
  marli: Marli | null = null;
  biscaia: Biscaia | null = null;

  /** Qualquer caçador em perseguição conta para o alerta no HUD. */
  get chased() {
    return (
      this.gil?.alertLevel === 'chase' ||
      this.elaine?.alertLevel === 'chase' ||
      this.wagner?.alertLevel === 'chase' ||
      this.marli?.alertLevel === 'chase' ||
      this.biscaia?.alertLevel === 'chase'
    );
  }

  /**
   * Entra direto em EXPLORACAO (usado por "Continuar" do menu): monta a sala,
   * levanta o jogador, dispensa a turma e ativa Gil + inspetores, sem repetir
   * aula, cutscene ou contagem. Idempotente.
   */
  enterExplorationDirect() {
    const game = this.game;
    if (!this.room) this.setup();
    this.suppress = true;
    if (game.player.seat) game.seats.stand(game.player);
    this.suppress = false;
    for (const st of this.students) game.removeEntity(st);
    this.students = [];
    for (const it of this.studentInteractables) game.interactions.remove(it);
    this.studentInteractables = [];
    this.patience = 0;
    this.countdown = null;
    this.alarmOn = false;
    game.audio.alarmStop();
    // consome a trava de "uma vez" e ativa os caçadores sem cutscene
    this.fired.add('gil');
    const gid = game.entities.find((e) => e.id === 'gil');
    if (!gid) this.spawnBossesDirect();
    this.setPhase('EXPLORACAO');
    game.quests.announceMain();
    game.snapCamera();
  }

  /** Ativa Gil, Elaine e os mini-bosses fora da sequência normal (Continuar). */
  private spawnBossesDirect() {
    const game = this.game;
    const world = game.world;
    const snap = (floor: FloorId, p: Point) => nearestFree(world, floor, p.x, p.y, 6) ?? p;
    const spawn = snap('ground', CHAPTER1.gilSpawn);
    const patrol: Record<FloorId, Point[]> = {
      ground: CHAPTER1.patrol.ground.map((p) => snap('ground', p)),
      first: CHAPTER1.patrol.first.map((p) => snap('first', p)),
    };
    const gil = new Gil('gil', 'ground', (spawn.x + 0.5) * TILE, (spawn.y + 0.5) * TILE, patrol);
    game.addEntity(gil);
    this.gil = gil;
    const el = snap('first', { x: 44, y: 30 });
    const elaine = new Elaine('elaine', 'first', (el.x + 0.5) * TILE, (el.y + 0.5) * TILE, CHAPTER1.elainePatrol);
    game.addEntity(elaine);
    this.elaine = elaine;
    const w = snap('ground', { x: 28, y: 44 });
    const wagner = new Wagner('wagner', 'ground', (w.x + 0.5) * TILE, (w.y + 0.5) * TILE, [
      { x: 28, y: 30 },
      { x: 28, y: 60 },
      { x: 60, y: 79 },
      { x: 90, y: 80 },
    ]);
    game.addEntity(wagner);
    this.wagner = wagner;
    const mr = snap('ground', { x: 90, y: 84 });
    const marli = new Marli('marli', 'ground', (mr.x + 0.5) * TILE, (mr.y + 0.5) * TILE, [
      { x: 90, y: 70 },
      { x: 90, y: 86 },
      { x: 77, y: 60 },
      { x: 77, y: 90 },
    ]);
    game.addEntity(marli);
    this.marli = marli;
    const bi = snap('first', { x: 44, y: 60 });
    const biscaia = new Biscaia('biscaia', 'first', (bi.x + 0.5) * TILE, (bi.y + 0.5) * TILE, [
      { x: 44, y: 25 },
      { x: 44, y: 60 },
      { x: 61, y: 40 },
      { x: 16, y: 60 },
    ]);
    game.addEntity(biscaia);
    this.biscaia = biscaia;
  }

  /** Posição do botão do pânico em pixels do mundo (para a luz pulsante). */
  get buttonPixel(): Point {
    return { x: (CHAPTER1.buttonTile.x + 0.5) * TILE, y: (CHAPTER1.buttonTile.y + 0.5) * TILE };
  }

  private once(key: string): boolean {
    if (this.fired.has(key)) return false;
    this.fired.add(key);
    return true;
  }

  private setPhase(phase: StoryPhase) {
    if (this.phase === phase) return;
    this.phase = phase;
    this.game.events.emit('storyPhase', { phase, attempt: this.attempt });
  }

  // ------------------------------------------------------------ montagem do capítulo
  /** Cria (ou recria) a sala de aula: jogador sentado, professora e alunos. Idempotente. */
  setup() {
    this.teardown();
    const game = this.game;
    const map = game.world.map('ground');
    const room = map.rooms.find((r) => r.id === CHAPTER1.roomId);
    if (!room) return;

    this.room = this.computeRoom(room);
    this.roomRect = room.rect;
    const R = room.rect;
    this.roomSeats = game.seats
      .list()
      .filter(
        (s) =>
          s.floor === 'ground' &&
          s.tx > R.x &&
          s.tx < R.x + R.w - 1 &&
          s.ty > R.y &&
          s.ty < R.y + R.h - 1 &&
          map.objects[s.ty * map.width + s.tx] === T.CHAIR_U,
      );
    if (this.roomSeats.length === 0) return;

    const hint = CHAPTER1.playerSeatHint;
    const dist = (s: Seat) => Math.hypot(s.tx - hint.x, s.ty - hint.y);
    this.playerSeat = [...this.roomSeats].sort((a, b) => dist(a) - dist(b))[0];

    this.suppress = true;
    const p = game.player;
    if (p.seat) game.seats.stand(p);
    game.seats.sit(p, this.playerSeat);
    p.moving = false;
    p.arms = 'down';
    this.suppress = false;

    // alunos NPC espalhados pelas carteiras
    const key = (s: Seat) => ((s.tx * 73856093) ^ (s.ty * 19349663)) >>> 0;
    const free = this.roomSeats
      .filter((s) => s !== this.playerSeat)
      .sort((a, b) => key(a) - key(b))
      .slice(0, CHAPTER1.studentCount);
    free.forEach((seat, i) => {
      const st = new Student(`student-${i}`, 0, 0, studentLook(i), seat);
      game.seats.sit(st, seat);
      game.addEntity(st);
      this.students.push(st);
      const it: Interactable = {
        id: `student:${st.id}`,
        floor: 'ground',
        get rect() {
          return { x: st.x - 7, y: st.y - 9, w: 14, h: 14 };
        },
        range: 12,
        priority: 1,
        label: () => (this.classInSession && st.state === 'seated' && st.seat ? 'Conversar' : null),
        interact: () => this.doTalk(st),
      };
      this.studentInteractables.push(it);
      game.addInteractable(it);
    });

    // professora Lucivana na frente da sala
    const ts = CHAPTER1.teacherStart;
    const teacher = new Teacher('lucivana', 'ground', 0, 0, {
      write: CHAPTER1.teacherWriteSpots,
      roam: CHAPTER1.teacherRoamSpots,
    });
    teacher.setTilePos(ts.x, ts.y);
    game.addEntity(teacher);
    this.teacher = teacher;

    this.registerProps(room);

    this.patience = 100;
    this.ceiling = 100;
    this.lastMischief = this.time;
    this.setPhase('AULA');
    game.snapCamera();
  }

  /** Remove tudo que a história criou (NPCs, Gil, bolinhas, interações) e zera os eventos. */
  private teardown() {
    const game = this.game;
    this.suppress = true;
    for (const e of [...game.entities]) {
      if (
        e instanceof Student ||
        e instanceof Teacher ||
        e instanceof Gil ||
        e instanceof PaperBall ||
        e instanceof Decoy ||
        e instanceof Elaine
      ) {
        game.removeEntity(e);
      }
    }
    for (const it of [...this.props, ...this.studentInteractables]) game.interactions.remove(it);
    this.suppress = false;

    this.students = [];
    this.teacher = null;
    this.gil = null;
    this.props = [];
    this.studentInteractables = [];
    this.propUsed.clear();
    this.fired.clear();
    this.cs = null;
    this.subtitle = null;
    this.banner = null;
    this.countdown = null;
    this.visitors = 0;
    this.cd = { talk: 0, throwBall: 0, prank: 0, stand: 0 };
    this.patience = 100;
    this.ceiling = 100;
    if (this.alarmOn) game.audio.alarmStop();
    this.alarmOn = false;
    game.cameraFocus = null;
    this.phase = 'AULA';
  }

  private computeRoom(room: RoomDef): RoomInfo {
    const world = this.game.world;
    const R = room.rect;
    const cx = R.x + R.w / 2;
    const cy = R.y + R.h / 2;
    const d0 = room.doors[0];
    const horizontal = Math.abs(d0.x + 0.5 - cx) > Math.abs(d0.y + 0.5 - cy);
    const ox = horizontal ? (d0.x + 0.5 > cx ? 1 : -1) : 0;
    const oy = horizontal ? 0 : d0.y + 0.5 > cy ? 1 : -1;

    const lanes: Lane[] = room.doors.map((d) => ({
      inner: { x: d.x - ox, y: d.y - oy },
      outer: { x: d.x + ox, y: d.y + oy },
    }));
    const base = lanes[0].outer;

    // esconderijos espalhados pelo corredor (norte e sul da porta)
    const spots: Point[] = [];
    for (let i = 0; i < 24; i++) {
      const south = i % 3 !== 0;
      const step = Math.floor(i / 3);
      const along = south ? 6 + step * 3.2 : -(5 + step * 1.7);
      const lateral = i % 3;
      const raw = horizontal
        ? { x: base.x + ox * lateral, y: Math.round(base.y + along) }
        : { x: Math.round(base.x + along), y: base.y + oy * lateral };
      spots.push(nearestFree(world, 'ground', raw.x, raw.y, 4) ?? raw);
    }

    const last = lanes[lanes.length - 1];
    const farRaw = horizontal ? { x: base.x + ox, y: base.y + 22 } : { x: base.x + 22, y: base.y + oy };
    const far = nearestFree(world, 'ground', farRaw.x, farRaw.y, 5) ?? farRaw;
    return { lanes, spots, teacherRoute: [last.inner, last.outer, far] };
  }

  private registerProps(room: RoomDef) {
    const game = this.game;
    const map = game.world.map('ground');
    const R = room.rect;
    for (let ty = R.y; ty < R.y + R.h; ty++) {
      for (let tx = R.x; tx < R.x + R.w; tx++) {
        const action = PROP_ACTIONS[map.objects[ty * map.width + tx]];
        if (!action) continue;
        const key = `${tx},${ty}`;
        const it: Interactable = {
          id: `prop:${key}`,
          floor: 'ground',
          rect: { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE },
          range: 9,
          priority: 1,
          label: () =>
            this.classInSession && this.time >= (this.propUsed.get(key) ?? 0) ? action.label : null,
          interact: () => this.useProp(key, action),
        };
        this.props.push(it);
        game.addInteractable(it);
      }
    }
  }

  // ------------------------------------------------------------ ciclo
  update(dt: number) {
    this.time += dt;
    if (!this.teacher) return;
    switch (this.phase) {
      case 'AULA':
      case 'BAGUNCA':
      case 'ALERTA':
        this.updateClass(dt);
        break;
      case 'CUTSCENE':
        this.updateCutscene(dt);
        break;
      case 'CONTAGEM':
        this.updateCountdown(dt);
        break;
      case 'CAPTURADO':
        if (
          this.time - this.capturedAt > 1.2 &&
          (this.game.input.wasPressed('interact') || this.game.input.wasPressed('skip'))
        ) {
          this.retry();
        }
        break;
      default:
        break;
    }
  }

  private updateClass(dt: number) {
    const game = this.game;
    const p = game.player;
    const input = game.input;

    if (!game.inputLocked) {
      if (input.wasPressed('talk')) this.doTalk(null);
      if (input.wasPressed('throw')) this.doThrow();
      if (input.wasPressed('prank')) this.doPrank();
    }

    if (!p.seat && !game.inputLocked) {
      // andar pela sala durante a aula irrita a professora aos poucos
      this.reducePatience(CHAPTER1.costs.standDrainPerSecond * dt);
    } else if (this.time - this.lastMischief > 8 && this.patience > 15 && this.patience < this.ceiling) {
      this.patience = Math.min(this.ceiling, this.patience + CHAPTER1.costs.recoverPerSecond * dt);
    }
  }

  // ------------------------------------------------------------ paciência
  private reducePatience(amount: number) {
    if (!this.classInSession || amount <= 0) return;
    const prev = this.patience;
    this.patience = Math.max(0, prev - amount);
    this.lastMischief = this.time;
    if (this.phase === 'AULA' && this.patience < 100) this.setPhase('BAGUNCA');
    this.checkThresholds(prev, this.patience);
  }

  private checkThresholds(prev: number, next: number) {
    let line: (typeof THRESHOLD_LINES)[number] | null = null;
    for (const l of THRESHOLD_LINES) {
      if (prev > l.at && next <= l.at && this.once(`line-${l.at}`)) {
        line = l; // a lista é decrescente: a última cruzada é a mais grave
        this.ceiling = Math.min(this.ceiling, l.at);
      }
    }
    if (line) {
      if (line.at === 15) this.setPhase('ALERTA');
      this.sayTeacher(line.text, line.kind);
    }
    if (next <= 0) this.startCutscene();
  }

  private sayTeacher(text: string, kind: SubtitleKind) {
    this.subtitle = { sub: { speaker: 'Profª Lucivana', text, kind }, until: this.time + 4 };
    const t = this.teacher;
    if (t) {
      t.say(text, 3800, kind !== 'normal');
      if (kind !== 'normal') t.scold();
    }
    this.game.audio.blip();
  }

  private mischief(cost: number) {
    this.reducePatience(cost);
    if (!this.classInSession) return;
    this.teacher?.scold(cost >= 5);
    const p = this.game.player;
    for (const s of this.students) {
      if (Math.hypot(s.x - p.x, s.y - p.y) < 70 && Math.random() < 0.7) s.laughAt();
    }
  }

  // ------------------------------------------------------------ ações de bagunça
  /** Chamado pelo jogo sempre que alguém senta ou levanta. */
  onSeatChange(entity: Entity, kind: 'sit' | 'stand') {
    if (entity !== this.game.player || this.suppress) return;
    if (kind === 'stand' && this.classInSession && this.time >= this.cd.stand) {
      this.cd.stand = this.time + 1.5;
      this.game.showMessage('Você levantou da cadeira! A Lucivana notou...');
      this.mischief(CHAPTER1.costs.stand);
    }
  }

  /** Conversar (tecla Q, botão touch ou "Conversar" ao lado de um colega). */
  doTalk(target: Student | null) {
    if (!this.classInSession || this.time < this.cd.talk) return;
    const game = this.game;
    const p = game.player;
    let st = target;
    if (!st) {
      let best = 48;
      for (const s of this.students) {
        if (s.state !== 'seated' || !s.seat) continue;
        const d = Math.hypot(s.x - p.x, s.y - p.y);
        if (d < best) {
          best = d;
          st = s;
        }
      }
    }
    if (!st) {
      game.showMessage('Ninguém por perto para conversar.');
      return;
    }
    this.cd.talk = this.time + 1.8;
    if (!p.seat) p.faceToward(st.x, st.y);
    p.say(pick(PLAYER_TALK), 1800);
    st.reactTalk(pick(STUDENT_REPLIES));
    game.audio.blip();
    this.mischief(CHAPTER1.costs.talk);
  }

  doThrow() {
    if (!this.classInSession || this.time < this.cd.throwBall) return;
    const game = this.game;
    const p = game.player;
    this.cd.throwBall = this.time + 0.9;
    const f = FACING_VEC[p.facing];

    const targets: Character[] = this.students.filter((s) => s.state === 'seated');
    if (this.teacher && this.teacher.mode === 'teach') targets.push(this.teacher);
    let best: Character | null = null;
    let bestScore = Infinity;
    for (const t of targets) {
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 10 || d > 150) continue;
      const cos = (dx * f.x + dy * f.y) / d;
      if (cos < 0.55) continue;
      const score = d * (2 - cos);
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    }

    let dirX = f.x;
    let dirY = f.y;
    let life = 0.7;
    if (best) {
      const dx = best.x - p.x;
      const dy = best.y - p.y;
      const d = Math.hypot(dx, dy);
      dirX = dx / d;
      dirY = dy / d;
      life = d / 170 + 0.15;
    }
    game.addEntity(
      new PaperBall(`ball-${this.nextId++}`, 'ground', p.x + f.x * 6, p.y + f.y * 6, dirX, dirY, life, p),
    );
    game.audio.whoosh();
    this.mischief(CHAPTER1.costs.throwBall);
  }

  doPrank() {
    if (!this.classInSession || this.time < this.cd.prank) return;
    const game = this.game;
    const prank = pick(PRANKS);
    this.cd.prank = this.time + 2.2;
    game.showMessage(prank.message);
    if (prank.bubble) game.player.say(prank.bubble, 1800, prank.sfx === 'raspberry');
    game.audio[prank.sfx]();
    this.mischief(prank.cost);
  }

  private useProp(key: string, action: PropAction) {
    if (!this.classInSession) return;
    this.propUsed.set(key, this.time + 8);
    this.game.audio[action.sfx]();
    this.game.showMessage(action.message);
    this.mischief(action.cost);
  }

  /** Vasculhar um recipiente da sala durante a aula também irrita a professora. */
  onContainerOpened(c: Container) {
    const R = this.roomRect;
    if (!this.classInSession || !R || c.floor !== 'ground') return;
    if (c.tx < R.x || c.tx >= R.x + R.w || c.ty < R.y || c.ty >= R.y + R.h) return;
    this.game.showMessage(`Você mexeu em: ${c.name}. A Lucivana notou!`);
    this.mischief(c.mischief);
  }

  /** A bolinha de papel acertou alguém. */
  onPaperHit(target: Character) {
    if (!this.classInSession) return;
    if (target instanceof Teacher) {
      target.say('QUEM JOGOU ISSO?!', 2400, true);
      target.scold();
      this.game.showMessage('A bolinha acertou a Lucivana!');
      this.game.audio.pop();
      this.reducePatience(CHAPTER1.costs.hitTeacher);
    } else if (target instanceof Student) {
      target.onHitByPaper();
      this.game.audio.pop();
      this.reducePatience(CHAPTER1.costs.hitStudent);
    }
  }

  // ------------------------------------------------------------ visitas entre alunos
  reserveVisitor(): boolean {
    if (this.phase !== 'BAGUNCA' && this.phase !== 'ALERTA') return false;
    if (this.visitors >= 1) return false;
    this.visitors++;
    return true;
  }

  releaseVisitor() {
    this.visitors = Math.max(0, this.visitors - 1);
  }

  freeSeatFor(student: Student): Seat | null {
    let best: Seat | null = null;
    let bestD = Infinity;
    for (const s of this.roomSeats) {
      if (s.occupant) continue;
      const d = Math.hypot((s.tx + 0.5) * TILE - student.x, (s.ty + 0.5) * TILE - student.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  // ------------------------------------------------------------ cutscene do botão
  private startCutscene() {
    if (!this.once('cutscene')) return;
    const game = this.game;
    const t = this.teacher;
    if (!t) return;
    this.setPhase('CUTSCENE');
    this.cs = { step: 'intro', t: 0, pressed: false };
    game.input.releaseAll();
    t.beginCutscene();
    t.say('CHEGA! JÁ DEU!', 2400, true);
    t.showEmote('angry', 1500);
    this.subtitle = {
      sub: { speaker: 'Profª Lucivana', text: 'CHEGA! Eu avisei, turma...', kind: 'shout' },
      until: this.time + 3.2,
    };
    game.cameraFocus = t;
    game.audio.sting();
    for (const s of this.students) if (s.state === 'seated') s.showEmote('exclaim', 1400);
  }

  private updateCutscene(dt: number) {
    const game = this.game;
    const cs = this.cs;
    const t = this.teacher;
    if (!cs || !t) {
      this.finishCutscene();
      return;
    }
    if (game.input.wasPressed('skip')) {
      this.skipCutscene();
      return;
    }
    cs.t += dt;
    switch (cs.step) {
      case 'intro':
        if (cs.t >= 1.5) {
          t.goToButton(game, CHAPTER1.buttonStand);
          cs.step = 'walk';
          cs.t = 0;
        }
        break;
      case 'walk':
        if (t.mode === 'pressing') {
          cs.step = 'press';
          cs.t = 0;
        } else if (cs.t > 8) {
          t.snapToButton(CHAPTER1.buttonStand);
          cs.step = 'press';
          cs.t = 0;
        }
        break;
      case 'press':
        if (!cs.pressed && t.pressT >= 0.55) {
          this.doPress();
          cs.t = 0;
        }
        if (cs.pressed && cs.t >= 2.4) this.finishCutscene();
        break;
    }
  }

  /** O momento do clique: alarme, banner, tremor de tela e a turma entra em pânico. */
  private doPress() {
    if (!this.once('press')) return;
    const game = this.game;
    if (this.cs) this.cs.pressed = true;
    this.alarmOn = true;
    game.audio.thud();
    game.audio.alarmStart();
    game.shake(3, 0.8);
    this.banner = { text: 'PROTOCOLO GIL ATIVADO!', until: this.time + 2.6 };
    this.subtitle = null;

    // o jogador se levanta, assustado, sem custo de paciência
    const p = game.player;
    if (p.seat) {
      this.suppress = true;
      game.seats.stand(p);
      this.suppress = false;
    }
    p.showEmote('exclaim', 2000);

    this.panicStudents();
  }

  /** Alunos levantam, gritam e correm para a porta. Saída escalonada e dividida entre as faixas da porta. */
  private panicStudents() {
    if (!this.once('panic') || !this.room) return;
    const room = this.room;
    const ref = room.lanes[0].inner;
    const sorted = [...this.students].sort(
      (a, b) => Math.hypot(a.x - (ref.x + 0.5) * TILE, a.y - (ref.y + 0.5) * TILE) - Math.hypot(b.x - (ref.x + 0.5) * TILE, b.y - (ref.y + 0.5) * TILE),
    );
    sorted.forEach((s, i) => {
      s.panic(this.game, {
        delay: 0.25 + i * 0.11 + Math.random() * 0.25,
        lane: room.lanes[i % room.lanes.length],
        spot: room.spots[i % room.spots.length],
        line: i % 3 === 0 ? PANIC_LINES[Math.floor(i / 3) % PANIC_LINES.length] : null,
      });
    });
  }

  private skipCutscene() {
    const t = this.teacher;
    if (t && !this.cs?.pressed) {
      t.snapToButton(CHAPTER1.buttonStand);
      this.doPress();
    }
    this.finishCutscene();
  }

  private finishCutscene() {
    if (!this.once('cutsceneEnd')) return;
    const game = this.game;
    this.cs = null;
    this.banner = null;
    game.cameraFocus = null;
    game.input.releaseAll();
    if (this.teacher && this.room) this.teacher.flee(this.room.teacherRoute);
    this.countdown = CHAPTER1.countdownSeconds;
    this.lastBeep = Math.ceil(this.countdown);
    this.setPhase('CONTAGEM');
    game.showMessage('Corra! O Gil está a caminho!', 3000);
  }

  // ------------------------------------------------------------ contagem e Gil
  private updateCountdown(dt: number) {
    if (this.countdown === null) return;
    this.countdown -= dt;
    const sec = Math.ceil(this.countdown);
    if (sec <= 5 && sec > 0 && sec !== this.lastBeep) {
      this.lastBeep = sec;
      this.game.audio.beep();
    }
    if (this.countdown <= 0) this.spawnGil();
  }

  private spawnGil() {
    if (!this.once('gil')) return;
    const game = this.game;
    const world = game.world;
    const snap = (floor: FloorId, p: Point) => nearestFree(world, floor, p.x, p.y, 6) ?? p;
    const spawn = snap('ground', CHAPTER1.gilSpawn);
    const patrol: Record<FloorId, Point[]> = {
      ground: CHAPTER1.patrol.ground.map((p) => snap('ground', p)),
      first: CHAPTER1.patrol.first.map((p) => snap('first', p)),
    };
    const gil = new Gil('gil', 'ground', (spawn.x + 0.5) * TILE, (spawn.y + 0.5) * TILE, patrol);
    game.addEntity(gil);
    this.gil = gil;
    gil.investigate(game, snap('ground', CHAPTER1.gilFirstTarget));

    // Elaine, a inspetora: patrulha o 1º andar (a rota do terraço fica arriscada)
    const el = snap('first', { x: 44, y: 30 });
    const elaine = new Elaine(
      'elaine',
      'first',
      (el.x + 0.5) * TILE,
      (el.y + 0.5) * TILE,
      CHAPTER1.elainePatrol,
    );
    game.addEntity(elaine);
    this.elaine = elaine;

    // mini-bosses: Wagner e Marli em áreas livres (corredor e pátio), Biscaia no 1º andar
    const w = snap('ground', { x: 28, y: 44 });
    const wagner = new Wagner(
      'wagner',
      'ground',
      (w.x + 0.5) * TILE,
      (w.y + 0.5) * TILE,
      [
        { x: 28, y: 30 },
        { x: 28, y: 60 },
        { x: 60, y: 79 },
        { x: 90, y: 80 },
      ],
    );
    game.addEntity(wagner);
    this.wagner = wagner;

    const mr = snap('ground', { x: 90, y: 84 });
    const marli = new Marli(
      'marli',
      'ground',
      (mr.x + 0.5) * TILE,
      (mr.y + 0.5) * TILE,
      [
        { x: 90, y: 70 },
        { x: 90, y: 86 },
        { x: 77, y: 60 },
        { x: 77, y: 90 },
      ],
    );
    game.addEntity(marli);
    this.marli = marli;

    const bi = snap('first', { x: 44, y: 60 });
    const biscaia = new Biscaia(
      'biscaia',
      'first',
      (bi.x + 0.5) * TILE,
      (bi.y + 0.5) * TILE,
      [
        { x: 44, y: 25 },
        { x: 44, y: 60 },
        { x: 61, y: 40 },
        { x: 16, y: 60 },
      ],
    );
    game.addEntity(biscaia);
    this.biscaia = biscaia;

    this.countdown = null;
    this.alarmOn = false;
    game.audio.alarmStop();
    game.audio.growl();
    game.shake(3, 0.9);
    this.banner = { text: 'O GIL ESTÁ SOLTO!', until: this.time + 2.6 };
    this.setPhase('EXPLORACAO');
  }

  // ------------------------------------------------------------ captura e nova tentativa
  /**
   * Captura centralizada. Recebe o NPC que realmente encostou no jogador e extrai
   * nome, fala, cor e retrato do cadastro dele (`entities/captors.ts`).
   * Nenhum texto fixo é usado — nunca se assume "Gil".
   * Apenas o primeiro evento de captura válido é processado.
   */
  capturePlayer(captor: Entity & Hunter) {
    // bloqueia capturas duplicadas enquanto a tela de derrota está aberta
    if (this.phase === 'CAPTURADO' || this.phase !== 'EXPLORACAO') return;

    // proteção improvisada: absorve a captura e atordoa quem chegou perto
    if (this.game.items.consumeShield()) {
      captor.stagger(3.4);
      this.game.audio.thud();
      this.game.shake(3, 0.4);
      this.game.showMessage(`🛡️ A proteção absorveu o golpe de ${captorIdentity(captor.captorKey).name}! Corra!`, 3200);
      return;
    }

    const id = captorIdentity(captor.captorKey);
    this.captor = id;
    this.captorLook = captor.look;
    // estatísticas: quem capturou o jogador
    this.game.stats.capturesBy[id.key] = (this.game.stats.capturesBy[id.key] ?? 0) + 1;
    this.game.stats.lastCaptor = id.name;

    captor.freeze();
    this.setPhase('CAPTURADO');
    this.capturedAt = this.time;
    this.game.input.releaseAll();
    this.game.audio.capture();
    this.game.shake(4, 0.5);
  }

  /** Volta para a sala (sem repetir a cutscene) e o Gil recomeça a patrulhar. */
  retry() {
    if (this.phase !== 'CAPTURADO') return;
    const game = this.game;
    game.fadeThen(() => {
      this.attempt++;
      const p = game.player;
      this.suppress = true;
      if (p.seat) game.seats.stand(p);
      const seat = this.playerSeat;
      if (seat && game.seats.sit(p, seat)) {
        game.seats.stand(p);
      } else if (this.room) {
        p.floor = 'ground';
        p.setTilePos(this.room.lanes[0].inner.x, this.room.lanes[0].inner.y);
      }
      this.suppress = false;
      p.moving = false;

      const spawn = nearestFree(game.world, 'ground', CHAPTER1.gilSpawn.x, CHAPTER1.gilSpawn.y, 6) ?? CHAPTER1.gilSpawn;
      this.gil?.reset(spawn.x, spawn.y, CHAPTER1.gilGraceAfterRetry);
      this.setPhase('EXPLORACAO');
      game.snapCamera();
      game.showMessage('O Gil voltou a patrulhar... Cuidado!', 3000);
    });
  }

  /** Recomeça o capítulo inteiro, desde a aula. */
  restart() {
    if (this.phase !== 'CAPTURADO') return;
    const game = this.game;
    game.fadeThen(() => {
      this.attempt++;
      this.setup();
      game.snapCamera();
    });
  }

  // ------------------------------------------------------------ HUD
  getHud(): StoryHud {
    const phase = this.phase;
    const inClass = this.classInSession;
    const sub = this.subtitle && this.time < this.subtitle.until ? this.subtitle.sub : null;
    const banner = this.banner && this.time < this.banner.until ? this.banner.text : null;

    let objective: string | null = null;
    if (phase === 'CONTAGEM') objective = 'Saia da sala e se esconda antes que o Gil chegue!';
    else if (phase === 'EXPLORACAO' || phase === 'CAPTURADO') objective = 'Encontre uma maneira de escapar da escola!';

    return {
      ...INITIAL_STORY_HUD,
      phase,
      attempt: this.attempt,
      patience: Math.ceil(this.patience - 1e-6),
      showPatience: inClass || phase === 'CUTSCENE',
      subtitle: sub,
      banner,
      countdown: this.countdown === null ? null : Math.max(0, Math.ceil(this.countdown)),
      objective,
      classActions: inClass,
      canSkip: phase === 'CUTSCENE',
      captured: phase === 'CAPTURADO',
      captor:
        phase === 'CAPTURADO' && this.captor ? { ...this.captor, look: this.captorLook } : null,
      gilAlert: this.gil?.alertLevel ?? 'none',
    };
  }
}


