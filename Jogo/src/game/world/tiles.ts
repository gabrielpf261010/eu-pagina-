import type { Facing } from '../types';

/**
 * Catálogo de tiles. O mapa possui duas camadas (chão e objetos) que usam o mesmo
 * espaço de IDs. Para criar um novo tile: adicione o ID aqui, marque se é sólido
 * e registre o desenho em tileArt.ts.
 */
export const T = {
  NONE: 0,

  // ---------- Chão ----------
  GRASS: 1,
  CONCRETE: 2,
  ASPHALT: 3,
  CROSSWALK: 4,
  FLOOR_WOOD: 5,
  FLOOR_HALL: 6,
  FLOOR_BATH: 7,
  FLOOR_CAFE: 8,
  FLOOR_KITCHEN: 9,
  CARPET: 10,
  PAVER: 11,
  COURT: 12,
  COURT_LH: 13,
  COURT_LV: 14,
  COURT_LX: 15,
  VOID: 16,
  FLOOR_LAB: 17,
  SIDEWALK: 18,
  FLOOR_OFFICE: 19,
  FLOOR_CERAMIC: 20,
  STEPS: 21,

  // ---------- Objetos ----------
  WALL: 100,
  WALL_BOARD: 101,
  DOOR_OPEN: 102,
  DOOR_LOCKED: 103,
  GATE: 104,
  FENCE: 105,
  TREE: 106,
  BUSH: 107,
  BENCH: 108,
  PLANT: 109,
  DESK: 110,
  TEACHER_DESK: 111,
  DESK_PC: 112,
  COMPUTER: 113,
  BOOKSHELF: 114,
  TABLE: 115,
  CABINET: 116,
  LOCKER: 117,
  TOILET: 118,
  SINK: 119,
  STALL: 120,
  COUNTER: 121,
  STOVE: 122,
  FRIDGE: 123,
  CRATE: 124,
  GAS_TANK: 125,
  HOOP: 126,
  BED: 127,
  STAIRS_UP: 128,
  STAIRS_DOWN: 129,
  PILLAR: 130,
  LAMP: 131,
  VENDING: 132,
  TRASH: 133,
  WALL_WINDOW: 134,
  WALL_BLUE: 135,
  WALL_MURAL: 136,
  WALL_PANIC: 137, // parede com o botão vermelho do pânico

  // cadeiras: o sufixo indica para onde o ocupante olha
  CHAIR_U: 140,
  CHAIR_D: 141,
  CHAIR_L: 142,
  CHAIR_R: 143,
  OFFICE_CHAIR_U: 144,
  OFFICE_CHAIR_D: 145,
  BENCH_U: 146,
  TROPHY: 147,
  RUG: 148, // decoração sem colisão
  BACKPACK: 149, // mochila de aluno no chão (recipiente interativo, sem colisão)
} as const;

/** Tiles que bloqueiam o movimento. (RUG, STEPS e portas abertas são decorativos/atravessáveis.) */
const SOLID_IDS: number[] = [
  T.VOID,
  T.WALL,
  T.WALL_BOARD,
  T.WALL_WINDOW,
  T.WALL_BLUE,
  T.WALL_MURAL,
  T.WALL_PANIC,
  T.DOOR_LOCKED,
  T.GATE,
  T.FENCE,
  T.TREE,
  T.BUSH,
  T.BENCH,
  T.BENCH_U,
  T.PLANT,
  T.DESK,
  T.TEACHER_DESK,
  T.DESK_PC,
  T.COMPUTER,
  T.BOOKSHELF,
  T.TABLE,
  T.CABINET,
  T.LOCKER,
  T.TOILET,
  T.SINK,
  T.STALL,
  T.COUNTER,
  T.STOVE,
  T.FRIDGE,
  T.CRATE,
  T.GAS_TANK,
  T.HOOP,
  T.BED,
  T.PILLAR,
  T.LAMP,
  T.VENDING,
  T.TRASH,
  T.CHAIR_U,
  T.CHAIR_D,
  T.CHAIR_L,
  T.CHAIR_R,
  T.OFFICE_CHAIR_U,
  T.OFFICE_CHAIR_D,
  T.TROPHY,
];

export const SOLID = new Uint8Array(256);
SOLID_IDS.forEach((id) => {
  SOLID[id] = 1;
});

const WALL_IDS = [T.WALL, T.WALL_BOARD, T.WALL_WINDOW, T.WALL_BLUE, T.WALL_MURAL, T.WALL_PANIC];
export const isWallLike = (id: number) => WALL_IDS.includes(id as never);

/** Tiles onde é possível sentar, e para onde o ocupante fica olhando. */
export const SEAT_FACING: Record<number, Facing> = {
  [T.CHAIR_U]: 'up',
  [T.CHAIR_D]: 'down',
  [T.CHAIR_L]: 'left',
  [T.CHAIR_R]: 'right',
  [T.OFFICE_CHAIR_U]: 'up',
  [T.OFFICE_CHAIR_D]: 'down',
  [T.BENCH]: 'down',
  [T.BENCH_U]: 'up',
};

export const isSeatTile = (id: number) => SEAT_FACING[id] !== undefined;
