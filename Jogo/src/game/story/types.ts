/**
 * Estados claros da história (capítulo 1 — "O Botão do Pânico"):
 *  AULA       aula normal, ninguém aprontou nada ainda
 *  BAGUNCA    o jogador já fez bagunça; a paciência está caindo
 *  ALERTA     paciência ≤ 15% — a Lucivana ameaçou apertar o botão
 *  CUTSCENE   paciência 0%: ela caminha até o botão e aperta (controles bloqueados)
 *  CONTAGEM   20 segundos de fuga antes do Gil aparecer
 *  EXPLORACAO o Gil está solto; objetivo: escapar da escola
 *  CAPTURADO  o Gil pegou o jogador (tela de tentar novamente)
 */
export type StoryPhase = 'AULA' | 'BAGUNCA' | 'ALERTA' | 'CUTSCENE' | 'CONTAGEM' | 'EXPLORACAO' | 'CAPTURADO';

import type { PersonLook } from '../entities/sprites';

export type SubtitleKind = 'normal' | 'angry' | 'shout';

export interface Subtitle {
  speaker: string;
  text: string;
  kind: SubtitleKind;
}

/** Dados da história que a interface React precisa para desenhar o HUD. */
export interface StoryHud {
  phase: StoryPhase;
  attempt: number;
  /** 0..100 (inteiro). */
  patience: number;
  showPatience: boolean;
  subtitle: Subtitle | null;
  banner: string | null;
  /** Segundos restantes (inteiro) ou null quando não há contagem. */
  countdown: number | null;
  objective: string | null;
  /** Mostra os controles de bagunça (conversar, bolinha, zoar). */
  classActions: boolean;
  canSkip: boolean;
  captured: boolean;
  /** NPC que capturou o jogador (nome, fala, cor e retrato). Null quando não há captura. */
  captor: CaptorInfo | null;
  gilAlert: 'none' | 'search' | 'chase';
}

/** Cópia leve da identidade do captor, pronta para a interface React. */
export interface CaptorInfo {
  key: string;
  name: string;
  headline: string;
  line: string;
  accent: string;
  /** Paleta usada para desenhar o retrato do NPC na tela de derrota. */
  look: PersonLook | null;
}

export const INITIAL_STORY_HUD: StoryHud = {
  phase: 'AULA',
  attempt: 1,
  patience: 100,
  showPatience: true,
  subtitle: null,
  banner: null,
  countdown: null,
  objective: null,
  classActions: true,
  canSkip: false,
  captured: false,
  captor: null,
  gilAlert: 'none',
};
