/** Tamanho (em pixels "nativos") de cada tile do mapa. */
export const TILE = 16;

/** Identificadores dos andares disponíveis. Para novos andares, basta adicionar aqui e em world/World.ts */
export type FloorId = 'ground' | 'first';

export const FLOOR_NAMES: Record<FloorId, string> = {
  ground: 'Térreo',
  first: '1º Andar',
};
