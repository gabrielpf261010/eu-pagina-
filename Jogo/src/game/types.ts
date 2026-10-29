import type { FloorId } from './constants';
import type { StoryHud } from './story/types';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Facing = 'up' | 'down' | 'left' | 'right';

export type RoomKind =
  | 'classroom'
  | 'office'
  | 'library'
  | 'cafeteria'
  | 'kitchen'
  | 'lab'
  | 'bathroom'
  | 'storage'
  | 'multi'
  | 'arts'
  | 'house'
  | 'hall'
  | 'stairs';

/** Uma sala do mapa (coordenadas em tiles, retângulo externo incluindo paredes). */
export interface RoomDef {
  id: string;
  name: string;
  kind: RoomKind;
  rect: Rect;
  /** Tiles de porta pertencentes à sala (úteis para IA / spawn / mobiliário). */
  doors: Point[];
}

/** Área nomeada (usada no HUD e futuramente por missões/triggers). */
export interface ZoneDef {
  name: string;
  rect: Rect;
}

/** Ligação entre andares (escadas). `rect` em tiles. */
export interface PortalDef {
  id: string;
  label: string;
  floor: FloorId;
  rect: Rect;
  direction: 'up' | 'down';
  target: { floor: FloorId; tx: number; ty: number };
}

/** Luz decorativa "assada" no mapa (coordenadas em pixels). */
export interface LightDef {
  x: number;
  y: number;
  r: number;
  color: string;
}

export interface GameMap {
  id: FloorId;
  name: string;
  width: number;
  height: number;
  /** Camada de chão (sempre preenchida). */
  ground: Uint8Array;
  /** Camada de objetos (0 = vazio): paredes, portas, móveis, árvores... */
  objects: Uint8Array;
  rooms: RoomDef[];
  zones: ZoneDef[];
  portals: PortalDef[];
  lights: LightDef[];
  /** Tile inicial sugerido para o jogador neste andar. */
  spawn: Point;
}

export type ThreatLevel = 'none' | 'near' | 'chase';

/** Status do jogador exibido no HUD. */
export interface PlayerHud {
  energy: number;
  exhausted: boolean;
  shield: boolean;
  clues: boolean;
  bagUsed: number;
  bagCap: number;
  /** Janela de inventário/recipiente aberta. */
  uiOpen: boolean;
}

export interface HudState {
  /** Estado da história (paciência, contagem, objetivo...). */
  story: StoryHud;
  player: PlayerHud;
  /** Inimigo por perto / perseguindo. */
  threat: ThreatLevel;
  floorName: string;
  zoneName: string;
  /** Texto da ação disponível (ex.: "Sentar"). Null quando não há nada para interagir. */
  prompt: string | null;
  /** Mensagem temporária (toast). */
  message: string | null;
  seated: boolean;
}
