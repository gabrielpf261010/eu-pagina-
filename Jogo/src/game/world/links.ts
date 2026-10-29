import type { FloorId } from '../constants';

/**
 * Pontos de chegada (em tiles) das escadas. Ficam centralizados aqui para que os dois
 * andares possam se referenciar sem dependência circular.
 *  - Escada A: bloco oeste (térreo: lobby ao lado do corredor / 1º andar: topo da Ala Oeste)
 *  - Escada B: ao lado do banheiro (térreo / Ala Central, junto à passarela superior)
 */
export interface Landing {
  floor: FloorId;
  tx: number;
  ty: number;
}

export const LANDINGS: Record<'groundA' | 'groundB' | 'firstA' | 'firstB', Landing> = {
  groundA: { floor: 'ground', tx: 35, ty: 33 },
  groundB: { floor: 'ground', tx: 83, ty: 60 },
  firstA: { floor: 'first', tx: 23, ty: 24 },
  firstB: { floor: 'first', tx: 51, ty: 59 },
};
