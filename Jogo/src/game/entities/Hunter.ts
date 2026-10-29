import type { Game } from '../Game';
import type { Point } from '../types';
import type { Entity } from './Entity';
import type { CaptorKey } from './captors';
import type { PersonLook } from './sprites';

/**
 * Qualquer inimigo que caça o jogador (o Gil hoje; mini-bosses no futuro).
 * Os sistemas de itens usam esta interface — aviso de perigo, distrator, proteção —
 * então novos inimigos funcionam com eles apenas implementando-a.
 */
export interface Hunter {
  readonly isHunter: true;
  readonly alertLevel: 'none' | 'search' | 'chase';
  /** Quem é este caçador: nome, fala e retrato da tela de captura vêm daqui. */
  readonly captorKey: CaptorKey;
  readonly look: PersonLook;
  /** Paralisa o inimigo (usado na cutscene de vitória). */
  freeze(): void;
  /** Atrai o inimigo para um tile (ignora se ele já está perseguindo). Retorna true se atraiu. */
  lure(game: Game, tile: Point): boolean;
  /** Deixa o inimigo atordoado por alguns segundos. */
  stagger(seconds: number): void;
}

export const isHunter = (e: unknown): e is Entity & Hunter => !!e && (e as Hunter).isHunter === true;
