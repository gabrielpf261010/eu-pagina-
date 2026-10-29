import type { FloorId } from '../constants';
import type { RoomDef } from '../types';
import type { World } from '../world/World';
import { ITEMS, getItem } from './catalog';
import { CONTAINER_TILES, SKIP_CONTAINERS, Container } from './Container';
import type { ContainerKind, ItemDef, Rarity, Tier } from './types';

/**
 * Distribuição do loot conforme a dificuldade da área:
 *   easy   salas de aula do térreo e corredor principal — quase só COMUM
 *   medium 1º andar, refeitório, biblioteca, salas de apoio — aparece INCOMUM e algum RARO
 *   hard   administração, manutenção, laboratório, Casa do Zelador — onde mora o RARO
 * LENDÁRIOS e cartões nunca são aleatórios: ficam em posições garantidas (GUARANTEED).
 */
const RARITY_MULT: Record<Tier, Record<Rarity, number>> = {
  easy: { comum: 1, incomum: 0.22, raro: 0.03, lendario: 0 },
  medium: { comum: 1, incomum: 0.55, raro: 0.14, lendario: 0 },
  hard: { comum: 0.7, incomum: 0.85, raro: 0.45, lendario: 0 },
};

const ROOM_TIER: Record<string, Tier> = {
  prof: 'hard',
  estudos: 'medium',
  orientacao: 'medium',
  manutencao: 'hard',
  secretaria: 'hard',
  diretoria: 'hard',
  pedagogia: 'medium',
  coordenacao: 'hard',
  osvaldo: 'hard',
  refeitorio: 'medium',
  cozinha: 'medium',
  artes: 'medium',
  biblioteca: 'medium',
  multiplo: 'medium',
  zelador: 'hard',
  gas: 'hard',
  'lab-info': 'hard',
  '1-sala-25': 'hard',
  'ban-fem': 'medium',
  'ban-masc': 'medium',
};

/** Itens únicos e cartões em salas específicas (sempre existem, exatamente uma vez). */
const GUARANTEED: Array<{ item: string; room: string }> = [
  { item: 'planta_tunel', room: 'manutencao' },
  { item: 'gancho_dourado', room: 'zelador' },
  { item: 'selo_diretoria', room: 'coordenacao' },
  { item: 'cartao_gas', room: 'secretaria' },
  { item: 'cartao_sala25', room: 'prof' },
];

/** Mínimo de cada material de receita no mundo, para que fabricar seja sempre possível. */
const MIN_WORLD_COUNT: Record<string, number> = {
  corda: 2,
  gancho: 2,
  circuito: 2,
  bateria: 2,
  pedaco_mapa: 4,
  fita: 3,
  tecido: 4,
  espuma: 2,
};

const COUNT: Record<ContainerKind, [number, number]> = {
  locker: [0, 2],
  cabinet: [1, 4],
  crate: [1, 3],
  drawer: [1, 3],
  fridge: [1, 3],
  backpack: [1, 2],
  shelf: [0, 2],
};

/** Tiles reservados para puzzles/marcadores de rota: não viram recipiente. */
const SKIP = SKIP_CONTAINERS;

const LOOT_POOL = ITEMS.filter((i) => i.loot);

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roomAt(rooms: RoomDef[], tx: number, ty: number): RoomDef | null {
  let best: RoomDef | null = null;
  let bestArea = Infinity;
  for (const r of rooms) {
    const q = r.rect;
    if (tx >= q.x && ty >= q.y && tx < q.x + q.w && ty < q.y + q.h && q.w * q.h < bestArea) {
      best = r;
      bestArea = q.w * q.h;
    }
  }
  return best;
}

function tierOf(floor: FloorId, room: RoomDef | null): Tier {
  if (room && ROOM_TIER[room.id]) return ROOM_TIER[room.id];
  return floor === 'ground' ? 'easy' : 'medium';
}

function pickWeighted(pool: ItemDef[], kind: ContainerKind, tier: Tier, rng: () => number): ItemDef | null {
  const cands = pool.filter((d) => d.loot!.kinds.includes(kind));
  const weights = cands.map((d) => d.loot!.weight * RARITY_MULT[tier][d.rarity]);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (let i = 0; i < cands.length; i++) {
    r -= weights[i];
    if (r <= 0) return cands[i];
  }
  return cands[cands.length - 1];
}

function fill(c: Container, rng: () => number) {
  const [lo, hi] = COUNT[c.kind];
  let n = lo + Math.floor(rng() * (hi - lo + 1));
  if (c.kind === 'locker' && rng() < 0.35) n = 0;
  for (let i = 0; i < n; i++) {
    const d = pickWeighted(LOOT_POOL, c.kind, c.tier, rng);
    if (!d) break;
    const { min, max } = d.loot!;
    const qty = Math.min(d.maxStack, min + Math.floor(rng() * (max - min + 1)));
    c.inv.add(d.id, qty);
  }
}

const hasFree = (c: Container) => c.inv.slots.some((s) => s === null);

function placeOne(item: string, candidates: Container[], rng: () => number): boolean {
  const free = candidates.filter(hasFree);
  if (free.length === 0) return false;
  free[Math.floor(rng() * free.length)].inv.add(item, 1);
  return true;
}

/** Cria todos os recipientes do mapa com seu loot (gerado uma vez por partida). */
export function buildContainers(world: World, seed: number): Container[] {
  const rng = mulberry32(seed);
  const list: Container[] = [];

  for (const floor of Object.keys(world.maps) as FloorId[]) {
    const map = world.map(floor);
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const tpl = CONTAINER_TILES[map.objects[ty * map.width + tx]];
        if (!tpl) continue;
        if (SKIP.has(`${floor}:${tx},${ty}`)) continue;
        const room = roomAt(map.rooms, tx, ty);
        const c = new Container(`${floor}:${tx},${ty}`, floor, tx, ty, tpl, tierOf(floor, room), room?.id ?? null);
        fill(c, rng);
        list.push(c);
      }
    }
  }

  // itens únicos e cartões nas salas designadas
  const hard = list.filter((c) => c.tier === 'hard');
  for (const g of GUARANTEED) {
    const inRoom = list.filter((c) => c.roomId === g.room);
    if (!placeOne(g.item, inRoom, rng) && !placeOne(g.item, hard, rng)) placeOne(g.item, list, rng);
  }

  // materiais de receita: garante o mínimo no mundo (os raros só em áreas médias/difíceis)
  for (const [id, min] of Object.entries(MIN_WORLD_COUNT)) {
    const def = getItem(id);
    const eligible = list.filter(
      (c) => def.loot?.kinds.includes(c.kind) && (def.rarity === 'comum' || def.rarity === 'incomum' || c.tier !== 'easy'),
    );
    let guard = 0;
    while (list.reduce((n, c) => n + c.inv.count(id), 0) < min && guard++ < 40) {
      if (!placeOne(id, eligible, rng)) placeOne(id, list, rng);
    }
  }

  return list;
}
