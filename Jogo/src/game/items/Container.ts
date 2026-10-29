import { TILE, type FloorId } from '../constants';
import type { Rect } from '../types';
import { T } from '../world/tiles';
import { Inventory } from './Inventory';
import type { ContainerKind, Tier } from './types';

export interface ContainerTemplate {
  kind: ContainerKind;
  name: string;
  capacity: number;
  /** Segundos vasculhando na primeira abertura (o jogador fica parado e exposto). */
  searchTime: number;
  /** Quanto tira da paciência da Lucivana se vasculhado durante a aula. */
  mischief: number;
}

/** Tiles do mapa que viram recipientes interativos. */
export const CONTAINER_TILES: Record<number, ContainerTemplate> = {
  [T.CABINET]: { kind: 'cabinet', name: 'Armário', capacity: 8, searchTime: 1.6, mischief: 6 },
  [T.LOCKER]: { kind: 'locker', name: 'Armário de corredor', capacity: 4, searchTime: 1.1, mischief: 4 },
  [T.CRATE]: { kind: 'crate', name: 'Caixa de madeira', capacity: 8, searchTime: 1.8, mischief: 4 },
  [T.TEACHER_DESK]: { kind: 'drawer', name: 'Gaveta da mesa da professora', capacity: 6, searchTime: 1.3, mischief: 12 },
  [T.DESK_PC]: { kind: 'drawer', name: 'Gaveta da mesa', capacity: 4, searchTime: 1.0, mischief: 5 },
  [T.FRIDGE]: { kind: 'fridge', name: 'Geladeira', capacity: 6, searchTime: 1.2, mischief: 4 },
  [T.BACKPACK]: { kind: 'backpack', name: 'Mochila de aluno', capacity: 4, searchTime: 0.9, mischief: 5 },
  [T.BOOKSHELF]: { kind: 'shelf', name: 'Estante de livros', capacity: 3, searchTime: 1.5, mischief: 4 },
};

/** Recipientes que não devem existir (ocupados por puzzles/marcadores das rotas). */
export const SKIP_CONTAINERS = new Set(['ground:114,36']);

/** Um recipiente do mapa. Cada um guarda seu próprio conteúdo e se lembra de já ter sido vasculhado. */
export class Container {
  readonly inv: Inventory;
  readonly kind: ContainerKind;
  readonly name: string;
  readonly searchTime: number;
  readonly mischief: number;
  searched = false;

  constructor(
    readonly id: string,
    readonly floor: FloorId,
    readonly tx: number,
    readonly ty: number,
    tpl: ContainerTemplate,
    readonly tier: Tier,
    readonly roomId: string | null,
  ) {
    this.inv = new Inventory(tpl.capacity);
    this.kind = tpl.kind;
    this.name = tpl.name;
    // áreas difíceis demoram mais para vasculhar
    this.searchTime = tpl.searchTime + (tier === 'hard' ? 0.4 : 0);
    this.mischief = tpl.mischief;
  }

  get rect(): Rect {
    return { x: this.tx * TILE, y: this.ty * TILE, w: TILE, h: TILE };
  }
}
