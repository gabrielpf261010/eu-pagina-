import type { FloorId } from '../constants';
import type { Game } from '../Game';
import type { QuestSystem } from '../quests/QuestSystem';

/**
 * Salvamento local (localStorage, quando disponível).
 * Guarda: posição/andar, mochila, recipientes, missões, enigmas resolvidos,
 * rotas reveladas, estatísticas, portas destrancadas e progresso de crafting.
 * O salvamento só é oferecido após a aula (fase EXPLORACAO): ao continuar,
 * o jogo entra direto em exploração, sem repetir aula/cutscene.
 */
const KEY = 'escape-do-gil:save:v1';

export interface SaveData {
  v: 1;
  savedAt: number;
  floor: FloorId;
  x: number;
  y: number;
  inv: Array<{ id: string; qty: number }>;
  containers: Array<{ id: string; searched: boolean; items: Array<{ id: string; qty: number }> }>;
  doors: string[];
  progress: { climb: boolean; clues: boolean; shield: number; secrets: string[] };
  quests: ReturnType<QuestSystem['serialize']>;
  puzzles: string[];
  stats: { itemsCollected: number; crafted: number; detections: number; playTime: number };
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* indisponível */
  }
}

export function saveGame(game: Game): boolean {
  try {
    const data: SaveData = {
      v: 1,
      savedAt: Date.now(),
      floor: game.player.floor,
      x: Math.round(game.player.x),
      y: Math.round(game.player.y),
      inv: game.items.inv.slots.filter((s) => s !== null).map((s) => ({ id: s!.id, qty: s!.qty })),
      containers: game.items.containers.map((c) => ({
        id: c.id,
        searched: c.searched,
        items: c.inv.slots.filter((s) => s !== null).map((s) => ({ id: s!.id, qty: s!.qty })),
      })),
      doors: (game.items as unknown as { unlockedDoors?: () => string[] }).unlockedDoors?.() ?? [],
      progress: {
        climb: game.items.progress.climb,
        clues: game.items.progress.clues,
        shield: game.items.progress.shield,
        secrets: [...game.items.progress.secrets],
      },
      quests: game.quests.serialize(),
      puzzles: game.puzzles.serialize(),
      stats: { ...game.stats },
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSaveData(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== 1 || !d.inv || !d.quests) return null;
    return d;
  } catch {
    return null;
  }
}
