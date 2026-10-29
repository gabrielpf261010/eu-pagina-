import { TILE } from '../constants';
import type { Entity } from '../entities/Entity';
import type { World } from '../world/World';

/**
 * Move a entidade com colisão AABB contra tiles sólidos, eixo por eixo
 * (permite deslizar nas paredes). Reutilizável por jogador, NPCs e inimigos.
 */
export function moveWithCollision(world: World, e: Entity, dx: number, dy: number) {
  if (dx !== 0) {
    const nx = e.x + dx;
    if (!world.boxCollides(e.floor, nx, e.y, e.w, e.h)) {
      e.x = nx;
    } else if (dx > 0) {
      e.x = Math.floor((nx + e.w / 2) / TILE) * TILE - e.w / 2 - 0.01;
    } else {
      e.x = (Math.floor((nx - e.w / 2) / TILE) + 1) * TILE + e.w / 2 + 0.01;
    }
  }
  if (dy !== 0) {
    const ny = e.y + dy;
    if (!world.boxCollides(e.floor, e.x, ny, e.w, e.h)) {
      e.y = ny;
    } else if (dy > 0) {
      e.y = Math.floor((ny + e.h / 2) / TILE) * TILE - e.h / 2 - 0.01;
    } else {
      e.y = (Math.floor((ny - e.h / 2) / TILE) + 1) * TILE + e.h / 2 + 0.01;
    }
  }
}
