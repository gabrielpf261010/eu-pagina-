import { TILE } from '../constants';
import type { Game } from '../Game';
import { PUZZLE_BY_ID, PUZZLES } from './quests';
import type { PuzzleDef } from './types';

/**
 * Puzzles das rotas de fuga. Cada puzzle pode ser resolvido UMA vez por partida
 * (o progresso fica guardado aqui, sem duplicar recompensas).
 */
export class PuzzleSystem {
  solved = new Set<string>();
  open: PuzzleDef | null = null;

  /** Estado do puzzle em andamento. */
  input: string[] = [];
  /** riddle: índice da pergunta atual. */
  step = 0;
  wrongT = 0;
  result: 'none' | 'ok' | 'fail' = 'none';

  private listeners = new Set<() => void>();

  constructor(private game: Game) {}

  byId(id: string) {
    return PUZZLE_BY_ID.get(id);
  }

  isSolved(id: string) {
    return this.solved.has(id);
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  /** Exigência para abrir um puzzle (texto do que falta, ou null se liberado). */
  blocker(p: PuzzleDef): string | null {
    const inv = this.game.items.inv;
    const q = this.game.quests;
    switch (p.id) {
      case 'jardim':
        return inv.count('plano_jardim') > 0 ? null : 'Você precisa do Plano do Jardim para entender os símbolos.';
      case 'estante':
        if (inv.count('anotacao_biblioteca') === 0) return 'Você precisa encontrar a anotação com pistas.';
        if (!q.objDone('r2', 'visit')) return 'Entre na biblioteca para achar a estante certa.';
        return null;
      case 'terraco':
        return inv.count('controle_terraco') > 0 ? null : 'Fabricar o Controle do Terraço para ligar o painel.';
      case 'final':
        return q.progressOf('r4', 'docs') >= 4 ? null : 'Faltam documentos do Gil para destravar a porta.';
      default:
        return null;
    }
  }

  tryOpen(id: string): { ok: boolean; text: string } {
    if (this.open) return { ok: false, text: '' };
    const p = this.byId(id);
    if (!p) return { ok: false, text: 'Puzzle desconhecido.' };
    if (this.solved.has(id)) return { ok: false, text: 'Este enigma já foi resolvido.' };
    const b = this.blocker(p);
    if (b) {
      this.game.audio.thud();
      return { ok: false, text: b };
    }
    this.open = p;
    this.input = [];
    this.step = 0;
    this.result = 'none';
    this.wrongT = 0;
    this.game.input.releaseAll();
    this.game.audio.blip();
    this.notify();
    return { ok: true, text: '' };
  }

  close() {
    if (!this.open) return;
    this.open = null;
    this.input = [];
    this.result = 'none';
    this.game.input.releaseAll();
    this.notify();
  }

  update(dt: number) {
    if (!this.open) return;
    if (this.wrongT > 0) this.wrongT = Math.max(0, this.wrongT - dt);
    if (this.game.story.controlsLocked) this.close();
  }

  // ------------------------------------------------------------ serialização (save)
  serialize(): string[] {
    return [...this.solved];
  }

  restore(ids: string[]) {
    this.solved = new Set(ids.filter((id) => this.byId(id)));
    this.close();
  }

  /** sequence: aperta uma opção. */
  press(label: string) {
    const p = this.open;
    if (!p || p.kind !== 'sequence' || this.result === 'ok') return;
    const next = [...this.input, label];
    const solution = p.solution ?? [];
    const matches = solution.slice(0, next.length).every((s, i) => s === next[i]);
    if (!matches) {
      this.input = [];
      this.wrongT = 0.5;
      this.game.audio.thud();
      this.notify();
      return;
    }
    this.input = next;
    this.game.audio.beep();
    if (this.input.length >= solution.length) this.succeed();
    else this.notify();
  }

  /** code: adiciona um dígito. */
  type(digit: string) {
    const p = this.open;
    if (!p || p.kind !== 'code' || this.result === 'ok') return;
    if (digit === '<') {
      this.input = this.input.slice(0, -1);
      this.notify();
      return;
    }
    if (this.input.length >= (p.digits ?? 4)) return;
    this.input = [...this.input, digit];
    this.game.audio.beep();
    if (this.input.length >= (p.digits ?? 4)) {
      const solution = p.solution ?? [];
      if (this.input.every((s, i) => s === solution[i])) this.succeed();
      else {
        this.input = [];
        this.wrongT = 0.6;
        this.game.audio.thud();
      }
    }
    this.notify();
  }

  /** riddle: responde a pergunta atual. */
  answer(index: number) {
    const p = this.open;
    if (!p || p.kind !== 'riddle' || this.result === 'ok') return;
    const q = p.questions?.[this.step];
    if (!q) return;
    if (index === q.answer) {
      this.game.audio.beep();
      if (this.step + 1 >= (p.questions?.length ?? 0)) {
        this.result = 'ok';
        this.succeed();
      } else {
        this.step++;
      }
    } else {
      this.wrongT = 0.5;
      this.game.audio.thud();
    }
    this.notify();
  }

  private succeed() {
    const p = this.open;
    if (!p) return;
    this.result = 'ok';
    this.solved.add(p.id);
    this.game.audio.sting();
    this.game.quests.onPuzzleSolved(p);

    if (p.grants) {
      const def = this.game.items.inv.add(p.grants, 1);
      if (def > 0) this.game.showMessage('Mochila cheia! O item ficou para trás.', 3000);
    }
    this.game.shake(2, 0.3);
    this.notify();
  }

  /** Dica atual para a interface. */
  hintText(p: PuzzleDef): string {
    if (p.kind === 'riddle') return p.questions?.[this.step]?.explain ?? p.hint;
    return p.hint;
  }
}

/** Lista de puzzles (para o diário mostrar o progresso dos enigmas). */
export const ALL_PUZZLES = PUZZLES;

export const puzzlePixel = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
