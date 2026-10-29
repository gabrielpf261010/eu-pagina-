/**
 * Configurações do jogador (persistidas em localStorage).
 * Módulo independente: não conhece Game, apenas valores.
 */
export interface GameSettings {
  muted: boolean;
  music: boolean;
  /** 0 = baixo, 1 = normal, 2 = alto (alcance da câmera) */
  quality: 0 | 1 | 2;
}

const KEY = 'escape-do-gil:settings:v1';

export const DEFAULT_SETTINGS: GameSettings = { muted: false, music: true, quality: 1 };

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const p = JSON.parse(raw) as Partial<GameSettings>;
    return {
      muted: !!p.muted,
      music: p.music !== false,
      quality: p.quality === 0 || p.quality === 2 ? p.quality : 1,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: GameSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* armazenamento indisponível */
  }
}
