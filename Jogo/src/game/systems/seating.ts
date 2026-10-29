import { TILE, type FloorId } from '../constants';
import type { Entity } from '../entities/Entity';
import type { Facing } from '../types';
import { SEAT_FACING } from '../world/tiles';
import type { World } from '../world/World';
import type { Interactable } from './interaction';

/** Um lugar onde se pode sentar (cadeira, banco...). Gerado automaticamente a partir do mapa. */
export interface Seat {
  id: string;
  floor: FloorId;
  tx: number;
  ty: number;
  /** Para onde o ocupante olha. */
  facing: Facing;
  occupant: Entity | null;
}

const VEC: Record<Facing, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const faceFromVec = (x: number, y: number): Facing =>
  Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';

/**
 * Sistema de assentos reutilizável: funciona para QUALQUER Entity.
 *   game.seats.sit(npc, seat)   /   game.seats.stand(npc)
 * O jogador usa o mesmo caminho através de um Interactable ("Sentar" / "Levantar").
 */
export class SeatSystem {
  private seats = new Map<string, Seat>();
  private interactables = new Map<string, Interactable>();

  /** `onChange` avisa o jogo quando QUALQUER entidade senta ou levanta (usado pela história). */
  constructor(
    private world: World,
    private onChange?: (entity: Entity, kind: 'sit' | 'stand', seat: Seat) => void,
  ) {
    for (const floor of Object.keys(world.maps) as FloorId[]) {
      const m = world.map(floor);
      for (let ty = 0; ty < m.height; ty++) {
        for (let tx = 0; tx < m.width; tx++) {
          const facing = SEAT_FACING[m.objects[ty * m.width + tx]];
          if (!facing) continue;
          const seat: Seat = { id: `${floor}:${tx},${ty}`, floor, tx, ty, facing, occupant: null };
          this.seats.set(seat.id, seat);
          this.interactables.set(seat.id, this.makeInteractable(seat));
        }
      }
    }
  }

  list(): Seat[] {
    return [...this.seats.values()];
  }

  seatAt(floor: FloorId, tx: number, ty: number): Seat | undefined {
    return this.seats.get(`${floor}:${tx},${ty}`);
  }

  interactableFor(seat: Seat): Interactable {
    return this.interactables.get(seat.id)!;
  }

  allInteractables(): Interactable[] {
    return [...this.interactables.values()];
  }

  /** Posiciona a entidade na cadeira e entra no estado sentado. */
  sit(entity: Entity, seat: Seat): boolean {
    if (seat.occupant && seat.occupant !== entity) return false;
    if (entity.seat) this.stand(entity);
    entity.seat = seat;
    seat.occupant = entity;
    entity.floor = seat.floor;
    entity.x = (seat.tx + 0.5) * TILE;
    entity.y = (seat.ty + 0.5) * TILE;
    entity.facing = seat.facing;
    this.onChange?.(entity, 'sit', seat);
    return true;
  }

  /** Levanta a entidade e a coloca em um tile livre ao lado da cadeira. */
  stand(entity: Entity): boolean {
    const seat = entity.seat;
    if (!seat) return false;

    const f = VEC[seat.facing];
    const back = { x: -f.x, y: -f.y };
    const side = { x: f.y, y: f.x };
    const cands = [
      back,
      side,
      { x: -side.x, y: -side.y },
      f,
      { x: back.x + side.x, y: back.y + side.y },
      { x: back.x - side.x, y: back.y - side.y },
      { x: f.x + side.x, y: f.y + side.y },
      { x: f.x - side.x, y: f.y - side.y },
      { x: back.x * 2, y: back.y * 2 },
      { x: side.x * 2, y: side.y * 2 },
      { x: -side.x * 2, y: -side.y * 2 },
    ];

    let placed = false;
    for (const c of cands) {
      if (this.tryPlace(entity, seat.tx + c.x, seat.ty + c.y)) {
        entity.facing = faceFromVec(c.x, c.y);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // última tentativa: varre um quadrado maior em volta da cadeira
      outer: for (let rad = 1; rad <= 3; rad++) {
        for (let dy = -rad; dy <= rad; dy++) {
          for (let dx = -rad; dx <= rad; dx++) {
            if (this.tryPlace(entity, seat.tx + dx, seat.ty + dy)) {
              entity.facing = faceFromVec(dx, dy);
              break outer;
            }
          }
        }
      }
    }

    seat.occupant = null;
    entity.seat = null;
    this.onChange?.(entity, 'stand', seat);
    return true;
  }

  private tryPlace(entity: Entity, tx: number, ty: number): boolean {
    const seat = entity.seat!;
    const cx = (tx + 0.5) * TILE;
    const cy = (ty + 0.5) * TILE;
    if (this.world.boxCollides(seat.floor, cx, cy, entity.w, entity.h)) return false;
    entity.x = cx;
    entity.y = cy;
    return true;
  }

  private makeInteractable(seat: Seat): Interactable {
    return {
      id: `seat:${seat.id}`,
      floor: seat.floor,
      rect: { x: seat.tx * TILE, y: seat.ty * TILE, w: TILE, h: TILE },
      range: 12,
      priority: 0,
      label: (game) => {
        if (seat.occupant === game.player) return 'Levantar';
        return seat.occupant ? null : 'Sentar';
      },
      interact: (_game, actor) => {
        if (actor.seat === seat) this.stand(actor);
        else this.sit(actor, seat);
      },
    };
  }
}
