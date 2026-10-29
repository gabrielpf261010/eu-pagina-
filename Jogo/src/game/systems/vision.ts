import { TILE, type FloorId } from '../constants';
import type { World } from '../world/World';

/** Linha de visão em pixels do mundo: paredes, portas trancadas e árvores bloqueiam. */
export function hasLineOfSight(world: World, floor: FloorId, x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.ceil(Math.hypot(dx, dy) / 5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (world.blocksSight(floor, Math.floor((x0 + dx * t) / TILE), Math.floor((y0 + dy * t) / TILE))) return false;
  }
  return true;
}

/** Diferença angular normalizada em (-π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}
