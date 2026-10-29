import { TILE, type FloorId } from '../constants';
import type { Entity } from '../entities/Entity';
import type { Game } from '../Game';
import type { PortalDef, Rect } from '../types';
import { hasLineOfSight } from './vision';

export const DEFAULT_LABEL = 'Interagir';

/**
 * Qualquer coisa com a qual um ator pode interagir (tecla E / botão touch):
 * escadas, cadeiras, portas trancadas... e futuramente NPCs, itens, armários, terminais.
 *
 * `label` pode ser dinâmico (ex.: "Sentar" / "Levantar"); retornar null esconde a interação.
 */
export interface Interactable {
  id: string;
  floor: FloorId;
  /** Área do objeto em pixels do mundo. */
  rect: Rect;
  /** Distância máxima (px) entre o ator e a área. Padrão: 10. */
  range?: number;
  /** Desempata quando há vários candidatos próximos. */
  priority?: number;
  label?: string | ((game: Game) => string | null);
  interact(game: Game, actor: Entity): void;
}

export interface InteractionTarget {
  target: Interactable;
  label: string;
}

export class InteractionSystem {
  private byFloor = new Map<FloorId, Interactable[]>();

  add(i: Interactable) {
    const list = this.byFloor.get(i.floor) ?? [];
    list.push(i);
    this.byFloor.set(i.floor, list);
  }

  remove(i: Interactable) {
    const list = this.byFloor.get(i.floor);
    if (!list) return;
    const idx = list.indexOf(i);
    if (idx >= 0) list.splice(idx, 1);
  }

  static labelOf(i: Interactable, game: Game): string | null {
    if (i.label === undefined) return DEFAULT_LABEL;
    return typeof i.label === 'function' ? i.label(game) : i.label;
  }

  /** Melhor interagível ao alcance do ator (considera distância e para onde ele olha). */
  find(actor: Entity, game: Game): InteractionTarget | null {
    const list = this.byFloor.get(actor.floor);
    if (!list) return null;
    const fx = actor.facing === 'left' ? -1 : actor.facing === 'right' ? 1 : 0;
    const fy = actor.facing === 'up' ? -1 : actor.facing === 'down' ? 1 : 0;

    let best: (InteractionTarget & { score: number }) | null = null;
    for (const i of list) {
      const range = i.range ?? 10;
      const r = i.rect;
      if (actor.x < r.x - range || actor.x > r.x + r.w + range) continue;
      if (actor.y < r.y - range || actor.y > r.y + r.h + range) continue;
      const dx = Math.max(r.x - actor.x, 0, actor.x - (r.x + r.w));
      const dy = Math.max(r.y - actor.y, 0, actor.y - (r.y + r.h));
      const d = Math.hypot(dx, dy);
      if (d > range) continue;
      // sem ativar objetos através de paredes: exige linha de visão do ator ao objeto
      if (d > 2 && !hasLineOfSight(game.world, actor.floor, actor.x, actor.y, r.x + r.w / 2, r.y + r.h / 2))
        continue;
      const label = InteractionSystem.labelOf(i, game);
      if (label === null) continue;
      const cx = r.x + r.w / 2 - actor.x;
      const cy = r.y + r.h / 2 - actor.y;
      const len = Math.hypot(cx, cy) || 1;
      const facingBias = (cx * fx + cy * fy) / len;
      const score = d - facingBias * 3 - (i.priority ?? 0);
      if (!best || score < best.score) best = { target: i, label, score };
    }
    return best ? { target: best.target, label: best.label } : null;
  }
}

export function createPortalInteractable(def: PortalDef): Interactable {
  return {
    id: def.id,
    floor: def.floor,
    rect: { x: def.rect.x * TILE, y: def.rect.y * TILE, w: def.rect.w * TILE, h: def.rect.h * TILE },
    range: 6,
    priority: 2,
    label: def.label,
    interact(game) {
      game.changeFloor(def.target.floor, def.target.tx, def.target.ty);
    },
  };
}

/** Interação simples que mostra uma mensagem (ex.: porta trancada). Base para portas/itens futuros. */
export function createMessageInteractable(opts: {
  id: string;
  floor: FloorId;
  tx: number;
  ty: number;
  label: string;
  message: string;
}): Interactable {
  return {
    id: opts.id,
    floor: opts.floor,
    rect: { x: opts.tx * TILE, y: opts.ty * TILE, w: TILE, h: TILE },
    range: 9,
    label: opts.label,
    interact(game) {
      game.showMessage(opts.message);
    },
  };
}
