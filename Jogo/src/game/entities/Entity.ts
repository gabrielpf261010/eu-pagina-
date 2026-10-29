import type { FloorId } from '../constants';
import type { Game } from '../Game';
import type { Seat } from '../systems/seating';
import type { Facing } from '../types';

/**
 * Base de tudo que existe no mundo e se move/desenha: jogador, NPCs, inimigos, itens...
 * `x`/`y` é o centro da caixa de colisão, em pixels do mundo.
 *
 * `facing` e `seat` permitem que qualquer entidade (jogador, alunos, professora...)
 * use o sistema de assentos (systems/seating.ts).
 */
export abstract class Entity {
  x: number;
  y: number;
  w = 10;
  h = 10;
  facing: Facing = 'down';
  seat: Seat | null = null;
  /** Entidades "globais" continuam sendo atualizadas mesmo em outro andar (ex.: o Gil). */
  global = false;
  /** Marcada para remoção: o jogo a retira da lista ao final do quadro. */
  done = false;

  constructor(
    readonly id: string,
    public floor: FloorId,
    x: number,
    y: number,
  ) {
    this.x = x;
    this.y = y;
  }

  get sitting() {
    return this.seat !== null;
  }

  abstract update(dt: number, game: Game): void;
  abstract draw(g: CanvasRenderingContext2D, game: Game): void;

  /** Camada desenhada por cima de tudo (balões de fala, emotes, indicadores). */
  drawOverlay(_g: CanvasRenderingContext2D, _game: Game): void {
    /* opcional */
  }
}
