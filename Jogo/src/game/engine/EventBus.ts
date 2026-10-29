import type { FloorId } from '../constants';
import type { StoryPhase } from '../story/types';

/**
 * Eventos do jogo. Futuros sistemas (missões, inventário, NPCs, inimigos) podem
 * escutar estes eventos sem acoplamento direto com o motor.
 */
export interface GameEvents {
  floorChanged: { from: FloorId; to: FloorId };
  zoneChanged: { floor: FloorId; zone: string };
  interacted: { id: string };
  seated: { entityId: string; seatId: string };
  stood: { entityId: string; seatId: string };
  storyPhase: { phase: StoryPhase; attempt: number };
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<keyof GameEvents>>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<keyof GameEvents>);
    return () => set!.delete(handler as Handler<keyof GameEvents>);
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]) {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }
}
