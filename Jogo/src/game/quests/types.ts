/** Tipos do diário de missões, puzzles e rotas de fuga. */

export type QuestStatus = 'locked' | 'active' | 'done';

export interface ObjectiveDef {
  id: string;
  text: string;
  /** Quantos passos para concluir (padrão 1). */
  target?: number;
  /** Recompensa descritiva mostrada no diário. */
  reward?: string;
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  objectives: ObjectiveDef[];
  rewards: string[];
  /** Sempre ativa (missão principal). */
  alwaysActive?: boolean;
}

/** Estado de uma missão na partida. */
export interface QuestState {
  status: QuestStatus;
  prog: Record<string, number>;
}

export interface QuestNotice {
  id: number;
  kind: 'objective' | 'quest' | 'info';
  title: string;
  text: string;
  born: number;
}

// ---------------------------------------------------------------- puzzles
export type PuzzleKind = 'sequence' | 'code' | 'riddle';

export interface PuzzleDef {
  id: string;
  title: string;
  /** Texto mostrado no topo do painel. */
  prompt: string;
  hint: string;
  kind: PuzzleKind;
  /** sequence: botões que o jogador aperta na ordem. */
  options?: Array<{ label: string; icon: string }>;
  solution?: string[];
  /** code: quantidade de dígitos. */
  digits?: number;
  /** riddle: perguntas de múltipla escolha. */
  questions?: Array<{ q: string; options: string[]; answer: number; explain?: string }>;
  /** Item entregue ao resolver (opcional). */
  grants?: string;
  /** Final especial (rota 4). */
  ending?: 'segredo';
}

// ---------------------------------------------------------------- rotas
export type RouteId = 'jardim' | 'biblioteca' | 'terraco' | 'segredo';

export interface RouteDef {
  id: RouteId;
  questId: string;
  name: string;
  difficulty: string;
  /** Tile do ponto de fuga (marcador no cenário). */
  floor: 'ground' | 'first';
  tx: number;
  ty: number;
  /** Item que revela o marcador no mapa. */
  revealItem: string;
  puzzle: string;
  /** Texto do marcador e da fuga. */
  markerName: string;
  examine: string;
  escapeLabel: string;
  ending: string;
}
