import type { PersonLook } from './sprites';

/**
 * Identidade de cada caçador (mini-boss / inspetor).
 *
 * A tela de derrota, as falas, as estatísticas e o retrato NUNCA usam um texto
 * fixo: tudo vem daqui, a partir do `captorKey` do NPC que realmente encostou
 * no jogador. Para adicionar um novo inspetor, acrescente uma entrada nesta
 * tabela e declare `captorKey` na classe dele.
 */
export type CaptorKey = 'gil' | 'wagner' | 'marli' | 'biscaia' | 'elaine';

export interface CaptorIdentity {
  key: CaptorKey;
  /** Nome exibido no singular. */
  name: string;
  /** Título grande da tela de derrota (já com a contração correta). */
  headline: string;
  /** Fala do captor na tela de derrota. */
  line: string;
  /** Cor de destaque da tela de captura. */
  accent: string;
}

export const CAPTORS: Record<CaptorKey, CaptorIdentity> = {
  gil: {
    key: 'gil',
    name: 'Gil',
    headline: 'VOCÊ FOI PEGO PELO GIL!',
    line: 'EU SABIA QUE IA TE ENCONTRAR!',
    accent: '#ef4444',
  },
  wagner: {
    key: 'wagner',
    name: 'Wagner',
    headline: 'VOCÊ FOI PEGO PELO WAGNER!',
    line: 'ACABOU A BRINCADEIRA!',
    accent: '#e05263',
  },
  marli: {
    key: 'marli',
    name: 'Marli',
    headline: 'VOCÊ FOI PEGO PELA MARLI!',
    line: 'EU AVISEI!',
    accent: '#34d399',
  },
  biscaia: {
    key: 'biscaia',
    name: 'Biscaia',
    headline: 'VOCÊ FOI PEGO PELO BISCAIA!',
    line: 'DIRETO PARA A DIRETORIA!',
    accent: '#a78bfa',
  },
  elaine: {
    key: 'elaine',
    name: 'Elaine',
    headline: 'VOCÊ FOI PEGO PELA ELAINE!',
    line: 'ACHOU QUE IA CORRER MAIS QUE EU?',
    accent: '#f062c8',
  },
};

/**
 * Identidade de um captor. Se por algum motivo o `captorKey` não for
 * reconhecido, usamos uma identidade neutra — nunca atribuímos ao Gil.
 */
const UNKNOWN: CaptorIdentity = {
  key: 'gil',
  name: 'um inspetor',
  headline: 'VOCÊ FOI PEGO!',
  line: 'SEM SAÍDA!',
  accent: '#9ca3af',
};

export function captorIdentity(key: string): CaptorIdentity {
  return Object.prototype.hasOwnProperty.call(CAPTORS, key) ? CAPTORS[key as CaptorKey] : UNKNOWN;
}

/** Qualquer coisa que pode capturar o jogador precisa declarar quem é. */
export interface Captor {
  readonly captorKey: CaptorKey;
  readonly look: PersonLook;
}
