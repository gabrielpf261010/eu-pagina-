import type { Game } from '../Game';
import { isHunter } from '../entities/Hunter';

/**
 * Nível de alerta global 0–4, calculado a partir dos caçadores ativos:
 *  0 calmo · 1 desconfiado (alguém procurando) · 2 perseguindo (1 caçador)
 *  3 cerco (2+ caçadores perseguindo) · 4 Gil em perseguição.
 *
 * Também centraliza o "alerta regional": quando um caçador avista o jogador,
 * aliados próximos passam a investigar a última posição conhecida.
 */
export class AlertSystem {
  level: 0 | 1 | 2 | 3 | 4 = 0;
  /** Última posição conhecida do jogador (para investigação em grupo). */
  lastKnown: { x: number; y: number; floor: string } | null = null;

  constructor(private game: Game) {}

  update() {
    const hunters = this.game.entities.filter(isHunter);
    let chase = 0;
    let search = 0;
    let gilChase = false;
    for (const h of hunters) {
      if (h.alertLevel === 'chase') {
        chase++;
        if (h.id === 'gil') gilChase = true;
      } else if (h.alertLevel === 'search') search++;
    }
    const p = this.game.player;
    if (chase > 0) this.lastKnown = { x: p.x, y: p.y, floor: p.floor };
    this.level = gilChase ? 4 : chase >= 2 ? 3 : chase === 1 ? 2 : search > 0 ? 1 : 0;
  }

  /** Alerta regional: aliados num raio passam a procurar (habilidade da Marli/Biscaia). */
  raiseRegional(x: number, y: number, floor: string, radiusPx: number) {
    for (const e of this.game.entities) {
      if (!isHunter(e) || e.alertLevel === 'chase') continue;
      if (e.floor !== (floor as never)) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= radiusPx && 'investigate' in e && typeof (e as { investigate?: unknown }).investigate === 'function') {
        (e as unknown as { investigate: (g: Game, p: { x: number; y: number }) => void }).investigate(this.game, {
          x,
          y,
        });
      }
    }
  }

  get label(): string {
    return ['CALMO', 'DESCONFIADO', 'PERSEGUIÇÃO', 'CERCO!', 'O GIL VEM AÍ!'][this.level];
  }

  get color(): string {
    return ['#4ade80', '#facc15', '#fb923c', '#f87171', '#ef4444'][this.level];
  }
}
