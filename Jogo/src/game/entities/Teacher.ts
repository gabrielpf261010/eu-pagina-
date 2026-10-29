import type { Game } from '../Game';
import { TEACHER_LESSON, pick } from '../story/dialogue';
import type { Point } from '../types';
import { Character } from './Character';
import type { PersonLook } from './sprites';

export type TeacherMode = 'teach' | 'cutsceneIdle' | 'toButton' | 'pressing' | 'leaving' | 'hiding';

export interface TeacherSpots {
  write: Point[];
  roam: Point[];
}

const LOOK: PersonLook = {
  hair: '#2b1a14',
  skin: '#e0a87a',
  shirt: '#b03a6a',
  shirtHi: '#d4568a',
  pants: '#2a2a44',
  shoe: '#1a1a22',
  bag: null,
  eye: '#1b1b24',
  hairStyle: 'bun',
  skirt: true,
  glasses: true,
};

/**
 * Professora Lucivana. Dá aula de português (escreve no quadro, explica, anda pela frente da
 * sala), repreende o jogador quando ele apronta e, na cutscene, aperta o botão do pânico.
 */
export class Teacher extends Character {
  mode: TeacherMode = 'teach';
  /** Tempo (s) em que está com o braço no botão. */
  pressT = 0;

  private t = 0;
  private action: 'write' | 'talk' | 'walk' = 'talk';
  private after: 'write' | 'talk' = 'talk';
  private segT = 3;
  private lessonT = 5;
  private scoldT = 0;
  private hideT = 2;

  constructor(
    id: string,
    floor: Character['floor'],
    x: number,
    y: number,
    private spots: TeacherSpots,
  ) {
    super(id, floor, x, y, LOOK);
    this.facing = 'up';
    this.action = 'write';
  }

  update(dt: number, game: Game) {
    this.t += dt;
    this.moving = false;
    this.bob = 0;
    switch (this.mode) {
      case 'teach':
        this.updateTeach(dt, game);
        break;
      case 'cutsceneIdle':
        this.arms = 'down';
        this.facing = 'down';
        break;
      case 'toButton':
        this.arms = 'down';
        if (this.followPath(dt, game, 64)) this.startPress();
        break;
      case 'pressing':
        this.pressT += dt;
        this.facing = 'up';
        this.arms = 'reach';
        break;
      case 'leaving':
        this.arms = 'up';
        if (this.runRoute(dt, game, 86)) {
          this.mode = 'hiding';
          this.facing = 'down';
        }
        break;
      case 'hiding':
        this.arms = 'up';
        this.bob = Math.floor(this.t * 9) % 2 === 0 ? 0 : -1;
        this.hideT -= dt;
        if (this.hideT <= 0) {
          this.showEmote(pick(['sweat', 'exclaim'] as const), 1400);
          this.hideT = 2.5 + Math.random() * 2;
        }
        break;
    }
  }

  private updateTeach(dt: number, game: Game) {
    this.arms = 'down';

    if (this.scoldT > 0) {
      this.scoldT -= dt;
      this.faceToward(game.player.x, game.player.y);
      return;
    }

    if (this.action === 'walk') {
      if (this.followPath(dt, game, 46)) {
        this.action = this.after;
        this.segT = 3.5 + Math.random() * 3;
      }
      return;
    }

    this.segT -= dt;
    this.lessonT -= dt;
    if (this.action === 'write') {
      this.facing = 'up';
      this.arms = Math.floor(this.t * 3) % 2 === 0 ? 'reach' : 'down';
    } else {
      this.facing = 'down';
    }

    if (this.lessonT <= 0 && !this.bubble && game.story.patience > 70) {
      this.say(pick(TEACHER_LESSON), 3400);
      this.lessonT = 7 + Math.random() * 5;
    }

    if (this.segT <= 0) {
      const toWrite = this.action === 'talk';
      const list = toWrite ? this.spots.write : this.spots.roam;
      const s = pick(list);
      if (this.walkTo(game, s.x, s.y)) {
        this.after = toWrite ? 'write' : 'talk';
        this.action = 'walk';
      } else {
        this.segT = 2;
      }
    }
  }

  /** Vira para o jogador e fica brava por um instante. */
  scold(angry = true) {
    if (this.mode !== 'teach') return;
    this.scoldT = 1.6;
    if (angry) this.showEmote('angry', 1400);
  }

  // ------------------------------------------------------------ cutscene
  beginCutscene() {
    this.stopWalking();
    this.mode = 'cutsceneIdle';
    this.scoldT = 0;
  }

  goToButton(game: Game, stand: Point) {
    if (this.walkTo(game, stand.x, stand.y)) this.mode = 'toButton';
    else this.snapToButton(stand);
  }

  snapToButton(stand: Point) {
    this.stopWalking();
    this.setTilePos(stand.x, stand.y);
    this.startPress();
  }

  private startPress() {
    this.mode = 'pressing';
    this.pressT = 0;
    this.facing = 'up';
  }

  flee(route: Point[]) {
    this.setRoute(route);
    this.mode = 'leaving';
    this.showEmote('exclaim', 1400);
  }
}
