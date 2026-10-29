import type { Game } from '../Game';
import { moveWithCollision } from '../engine/collision';
import { Character } from './Character';
import type { PersonLook } from './sprites';

const WALK_SPEED = 70; // px/s
const RUN_SPEED = 115;

/** Energia: correr gasta, descansar recupera. Zerou = sem fôlego até recuperar um pouco. */
export const MAX_ENERGY = 100;
const RUN_DRAIN = 9; // por segundo correndo (~11 s de corrida contínua)
const REGEN_WALK = 5;
const REGEN_IDLE = 9;
const RECOVER_THRESHOLD = 25;

const PLAYER_LOOK: PersonLook = {
  hair: '#3a2414',
  skin: '#f0c08f',
  shirt: '#2f6fd6',
  shirtHi: '#4a8af0',
  pants: '#2a3350',
  shoe: '#15151c',
  bag: '#b83232',
  eye: '#1b1b24',
  hairStyle: 'short',
};

/** O aluno controlado pelo jogador. Usa o mesmo desenhista e a mesma base dos NPCs. */
export class Player extends Character {
  energy = MAX_ENERGY;
  /** Sem fôlego: só volta a correr depois de recuperar um pouco de energia. */
  exhausted = false;

  private runningFlag = false;

  constructor(id: string, floor: Character['floor'], x: number, y: number) {
    super(id, floor, x, y, PLAYER_LOOK);
  }

  /** true enquanto o jogador está de fato correndo (o Gil "ouve" o barulho). */
  get running() {
    return this.moving && this.runningFlag;
  }

  restoreEnergy(amount: number) {
    this.energy = Math.min(MAX_ENERGY, this.energy + amount);
    if (this.exhausted && this.energy >= RECOVER_THRESHOLD) this.exhausted = false;
  }

  update(dt: number, game: Game) {
    this.moving = false;
    this.runningFlag = false;

    if (!this.seat && !game.inputLocked) {
      const a = game.input.axis();
      if (a.x !== 0 || a.y !== 0) {
        this.moving = true;
        const run = game.input.isDown('run') && !this.exhausted && this.energy > 0;
        this.runningFlag = run;
        const speed = run ? RUN_SPEED : WALK_SPEED;
        moveWithCollision(game.world, this, a.x * speed * dt, a.y * speed * dt);

        if (Math.abs(a.x) > Math.abs(a.y)) this.facing = a.x > 0 ? 'right' : 'left';
        else this.facing = a.y > 0 ? 'down' : 'up';
        this.walkT += dt * (speed / WALK_SPEED);
      }
    }

    // energia
    if (this.runningFlag) {
      this.energy -= RUN_DRAIN * dt;
      if (this.energy <= 0) {
        this.energy = 0;
        this.exhausted = true;
      }
    } else {
      this.energy = Math.min(MAX_ENERGY, this.energy + (this.moving ? REGEN_WALK : REGEN_IDLE) * dt);
      if (this.exhausted && this.energy >= RECOVER_THRESHOLD) this.exhausted = false;
    }
  }
}
