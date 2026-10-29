import type { RoomDef } from '../types';
import type { MapBuilder } from './MapBuilder';
import { T } from './tiles';
import { hash } from './tileArt';

/**
 * Layouts de mobiliário reutilizáveis. Cada tipo de sala (RoomKind) possui uma função
 * que posiciona móveis dentro do interior da sala, sempre mantendo as portas livres.
 *
 * Convenção de cadeiras: o sufixo (U/D/L/R) indica para onde o ocupante olha.
 * Uma carteira em (x,y) tem a cadeira em (x,y+1) olhando para cima (CHAIR_U).
 */
class Placer {
  readonly ix0: number;
  readonly iy0: number;
  readonly ix1: number;
  readonly iy1: number;

  constructor(
    readonly b: MapBuilder,
    readonly room: RoomDef,
  ) {
    this.ix0 = room.rect.x + 1;
    this.iy0 = room.rect.y + 1;
    this.ix1 = room.rect.x + room.rect.w - 2;
    this.iy1 = room.rect.y + room.rect.h - 2;
  }

  get iw() {
    return this.ix1 - this.ix0 + 1;
  }

  inside(x: number, y: number) {
    return x >= this.ix0 && x <= this.ix1 && y >= this.iy0 && y <= this.iy1;
  }

  /** Mantém livre a faixa logo na frente das portas. */
  nearDoor(x: number, y: number) {
    return this.room.doors.some((d) => Math.abs(d.x - x) <= 1 && Math.abs(d.y - y) <= 1);
  }

  put(x: number, y: number, t: number): boolean {
    if (!this.inside(x, y) || this.nearDoor(x, y) || this.b.getObj(x, y) !== 0) return false;
    this.b.setObj(x, y, t);
    return true;
  }

  /** Móvel + cadeira associada (a cadeira só entra se o móvel entrou). */
  seated(x: number, y: number, furniture: number, cx: number, cy: number, chair: number) {
    if (this.put(x, y, furniture)) this.put(cx, cy, chair);
  }
}

function classroom(p: Placer) {
  const { b, ix0, iy0, ix1, iy1, iw, room } = p;

  // quadro-negro na parede norte
  const boardW = Math.min(iw - 2, 6);
  const bx = ix0 + Math.floor((iw - boardW) / 2);
  for (let x = bx; x < bx + boardW; x++) {
    if (b.getObj(x, room.rect.y) === T.WALL) b.setObj(x, room.rect.y, T.WALL_BOARD);
  }

  // mesa do professor + cadeira
  const tx = ix0 + Math.floor(iw / 2) - 1;
  p.put(tx, iy0, T.TEACHER_DESK);
  p.put(tx + 1, iy0, T.TEACHER_DESK);
  p.put(tx, iy0 + 1, T.OFFICE_CHAIR_U);

  // carteiras em fileiras de duplas, com corredores entre as duplas
  const groups = Math.max(1, Math.floor((iw - 1) / 3));
  const total = groups * 3 - 1;
  const off = ix0 + Math.floor((iw - total) / 2);
  for (let y = iy0 + 3; y <= iy1 - 2; y += 3) {
    for (let g = 0; g < groups; g++) {
      for (let k = 0; k < 2; k++) {
        const x = off + g * 3 + k;
        p.seated(x, y, T.DESK, x, y + 1, T.CHAIR_U);
      }
    }
  }

  // mochilas dos alunos largadas no chão, ao lado das cadeiras (recipientes interativos)
  for (let y = iy0 + 3; y <= iy1 - 2; y += 3) {
    for (let g = 0; g < groups; g++) {
      if (hash(g, y, 21 + room.rect.x) > 0.55) p.put(off + g * 3 + 2, y + 1, T.BACKPACK);
    }
  }

  // decoração
  p.put(ix0, iy0, T.TRASH);
  p.put(ix1, iy0, T.PLANT);
  p.put(ix1, iy1, T.CABINET);
  p.put(ix0, iy1, T.PLANT);
}

/**
 * Ambientes administrativos: balcão de atendimento, computadores de trabalho,
 * cadeiras de espera e armários — nunca carteiras de aluno.
 * Cada sala tem uma identidade: coordenação (atendimento), diretoria
 * (executiva), sala dos professores (convivência) e demais (apoio).
 */
function office(p: Placer) {
  const { room } = p;
  switch (room.id) {
    case 'coordenacao':
    case 'secretaria':
    case 'pedagogia':
    case 'orientacao':
      return adminAtendimento(p);
    case 'diretoria':
      return adminDiretoria(p);
    case 'prof':
      return adminProfessores(p);
    default:
      return adminApoio(p);
  }
}

/** Balcão de atendimento com cadeiras dos dois lados + estações de trabalho. */
function adminAtendimento(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  // armários e arquivos junto à parede norte
  for (let x = ix0; x <= ix1; x++) {
    const k = (x - ix0) % 5;
    if (k <= 2) p.put(x, iy0, T.CABINET);
    else if (k === 3) p.put(x, iy0, T.BOOKSHELF);
    else p.put(x, iy0, T.PLANT);
  }
  // balcão de atendimento no meio da sala (funcionários atrás, visitantes na frente)
  const cy = iy0 + Math.max(3, Math.floor((iy1 - iy0) / 2));
  for (let x = ix0 + 1; x <= ix1 - 1; x++) p.put(x, cy, T.COUNTER);
  for (let x = ix0 + 1; x <= ix1 - 1; x += 2) {
    p.put(x, cy - 1, T.OFFICE_CHAIR_D);
    p.put(x, cy + 1, T.OFFICE_CHAIR_U);
  }
  // estações de trabalho (computadores) junto à parede leste
  for (let y = iy0 + 2; y <= iy1 - 2; y += 3) {
    p.seated(ix1, y, T.DESK_PC, ix1, y + 1, T.OFFICE_CHAIR_U);
  }
  // espera + decoração
  p.put(ix0, iy1, T.TRASH);
  p.put(ix1, iy1, T.PLANT);
  p.put(ix0, iy0 + 1, T.TROPHY);
}

/** Diretoria: mesa executiva, cadeiras de reunião, estante e tapete. */
function adminDiretoria(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  for (let x = ix0; x <= ix1; x++) {
    if ((x - ix0) % 4 === 3) p.put(x, iy0, T.PLANT);
    else p.put(x, iy0, (x - ix0) % 2 === 0 ? T.CABINET : T.BOOKSHELF);
  }
  // mesa executiva central com cadeira da direção + cadeiras de reunião
  const mx = ix0 + Math.floor((ix1 - ix0) / 2);
  const my = iy0 + 3;
  p.put(mx, my, T.TEACHER_DESK);
  p.put(mx + 1, my, T.TEACHER_DESK);
  p.put(mx, my - 1, T.OFFICE_CHAIR_D);
  p.put(mx - 1, my + 1, T.CHAIR_R);
  p.put(mx + 2, my + 1, T.CHAIR_L);
  // tapete sob a mesa + símbolos da direção
  p.put(mx, my + 2, T.RUG);
  p.put(mx + 1, my + 2, T.RUG);
  p.put(ix0, iy0 + 1, T.TROPHY);
  p.put(ix1, iy0 + 1, T.TROPHY);
  p.put(ix0, iy1, T.PLANT);
  p.put(ix1, iy1, T.TRASH);
  // computador de trabalho no canto
  p.seated(ix1, iy1 - 2, T.DESK_PC, ix1, iy1 - 1, T.OFFICE_CHAIR_U);
}

/** Sala dos professores: convivência com mesas, bancos, café e armários. */
function adminProfessores(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  for (let x = ix0; x <= ix1; x++) {
    const k = (x - ix0) % 6;
    if (k <= 2) p.put(x, iy0, T.CABINET);
    else if (k === 3) p.put(x, iy0, T.BOOKSHELF);
    else if (k === 4) p.put(x, iy0, T.TROPHY);
    else p.put(x, iy0, T.PLANT);
  }
  // cantinho do café
  p.put(ix0, iy0 + 2, T.COUNTER);
  p.put(ix0, iy0 + 3, T.COUNTER);
  p.put(ix0 + 1, iy0 + 2, T.FRIDGE);
  // mesas de convivência com cadeiras dos dois lados
  for (let y = iy0 + 5; y + 1 <= iy1 - 1; y += 4) {
    for (let x = ix0 + 3; x + 1 <= ix1 - 2; x += 5) {
      p.put(x, y, T.TABLE);
      p.put(x + 1, y, T.TABLE);
      p.put(x, y - 1, T.CHAIR_D);
      p.put(x + 1, y - 1, T.CHAIR_D);
      p.put(x, y + 1, T.CHAIR_U);
      p.put(x + 1, y + 1, T.CHAIR_U);
    }
  }
  p.put(ix1, iy1, T.PLANT);
  p.put(ix0, iy1, T.TRASH);
}

/** Salas de apoio (estudos, informação etc.): trabalho + arquivo, sem carteiras. */
function adminApoio(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  for (let x = ix0; x <= ix1; x++) {
    const k = (x - ix0) % 4;
    if (k !== 3) p.put(x, iy0, T.CABINET);
    else p.put(x, iy0, (x - ix0) % 8 === 3 ? T.TROPHY : T.PLANT);
  }
  for (let y = iy0 + 3; y <= iy1 - 2; y += 3) {
    for (let x = ix0 + 1; x <= ix1 - 2; x += 4) {
      p.seated(x, y, T.DESK_PC, x, y + 1, T.OFFICE_CHAIR_U);
      p.seated(x + 1, y, T.DESK_PC, x + 1, y + 1, T.OFFICE_CHAIR_U);
    }
  }
  p.put(ix1, iy1, T.PLANT);
  p.put(ix0, iy1, T.TRASH);
}

function library(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  for (let x = ix0; x <= ix1; x++) p.put(x, iy0, T.BOOKSHELF);
  for (let y = iy0 + 2; y <= iy1 - 10; y += 3) {
    for (let x = ix0 + 1; x <= ix1 - 1; x++) {
      if ((x - ix0) % 5 !== 0) p.put(x, y, T.BOOKSHELF);
    }
  }
  // mesas de leitura com cadeiras dos dois lados
  for (const y of [iy1 - 6, iy1 - 2]) {
    for (let x = ix0 + 2; x + 1 <= ix1 - 2; x += 5) {
      p.put(x, y, T.TABLE);
      p.put(x + 1, y, T.TABLE);
      p.put(x, y - 1, T.CHAIR_D);
      p.put(x + 1, y - 1, T.CHAIR_D);
      p.put(x, y + 1, T.CHAIR_U);
      p.put(x + 1, y + 1, T.CHAIR_U);
    }
  }
  p.put(ix1, iy1, T.PLANT);
  p.put(ix0, iy1, T.PLANT);
}

function cafeteria(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  for (let x = ix0 + 2; x <= ix1 - 2; x++) p.put(x, iy0, T.COUNTER);
  p.put(ix0, iy0, T.FRIDGE);
  p.put(ix0 + 1, iy0, T.FRIDGE);
  p.put(ix1, iy0, T.VENDING);
  p.put(ix1 - 1, iy0, T.VENDING);

  // mesas compridas brancas com bancos nos dois lados (2 colunas x 4 fileiras)
  const len = 6;
  for (let y = iy0 + 4; y + 2 <= iy1 - 1; y += 5) {
    for (let x = ix0 + 2; x + len - 1 <= ix1 - 2; x += 9) {
      for (let k = 0; k < len; k++) {
        p.put(x + k, y, T.BENCH);
        p.put(x + k, y + 1, T.TABLE);
        p.put(x + k, y + 2, T.BENCH_U);
      }
    }
  }
  p.put(ix0, iy1, T.TRASH);
  p.put(ix1, iy1, T.TRASH);
}

function kitchen(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  p.put(ix0, iy0, T.FRIDGE);
  p.put(ix0 + 1, iy0, T.STOVE);
  p.put(ix0 + 2, iy0, T.STOVE);
  for (let x = ix0 + 3; x <= ix1; x++) p.put(x, iy0, T.COUNTER);
  for (let x = ix0 + 3; x <= ix1 - 3; x++) p.put(x, iy0 + 4, T.COUNTER);
  for (let y = iy0 + 2; y <= iy1 - 1; y++) p.put(ix0, y, T.COUNTER);
  p.put(ix1, iy1, T.TRASH);
}

function lab(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  for (let y = iy0; y <= iy1 - 2; y += 3) {
    for (let x = ix0; x <= ix1; x++) {
      if ((x - ix0) % 4 !== 3) p.seated(x, y, T.COMPUTER, x, y + 1, T.OFFICE_CHAIR_U);
    }
  }
  p.put(ix1, iy1, T.PLANT);
}

function bathroom(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  for (let x = ix0; x <= ix1; x += 2) {
    p.put(x, iy0, T.TOILET);
    p.put(x + 1, iy0, T.STALL);
    p.put(x + 1, iy0 + 1, T.STALL);
  }
  for (let x = ix0; x <= ix1; x += 2) p.put(x, iy1, T.SINK);
}

function storage(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  for (let x = ix0; x <= ix1; x++) p.put(x, iy0, T.CABINET);
  for (let y = iy0 + 2; y <= iy1; y++) {
    for (let x = ix0; x <= ix1; x++) {
      if ((x + y) % 3 === 0 && hash(x, y, 4) > 0.5 && (x === ix0 || x === ix1 || y === iy1 || hash(x, y, 8) > 0.8)) {
        p.put(x, y, T.CRATE);
      }
    }
  }
  p.put(ix1, iy1, T.GAS_TANK);
}

/** Salas de trabalho em grupo (artes e uso múltiplo): mesas de 2 lugares por lado. */
function workshop(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  for (let x = ix0; x <= ix1; x++) {
    if ((x - ix0) % 4 !== 2) p.put(x, iy0, T.CABINET);
  }
  for (let y = iy0 + 3; y + 1 <= iy1 - 1; y += 4) {
    for (let x = ix0 + 2; x + 1 <= ix1 - 1; x += 4) {
      p.put(x, y, T.TABLE);
      p.put(x + 1, y, T.TABLE);
      p.put(x, y - 1, T.CHAIR_D);
      p.put(x + 1, y - 1, T.CHAIR_D);
      p.put(x, y + 1, T.CHAIR_U);
      p.put(x + 1, y + 1, T.CHAIR_U);
    }
  }
  p.put(ix1, iy1, T.PLANT);
  p.put(ix0, iy1, T.TRASH);
}

function house(p: Placer) {
  const { ix0, iy0, ix1, iy1 } = p;
  p.put(ix0, iy0, T.BED);
  p.put(ix0 + 1, iy0, T.BED);
  p.put(ix1, iy0, T.FRIDGE);
  p.put(ix1, iy1, T.CABINET);
  // mesinha com duas cadeiras
  p.put(ix0 + 1, iy1 - 1, T.TABLE);
  p.put(ix0, iy1 - 1, T.CHAIR_R);
  p.put(ix0 + 2, iy1 - 1, T.CHAIR_L);
}

export function furnishRoom(b: MapBuilder, room: RoomDef) {
  const p = new Placer(b, room);
  switch (room.kind) {
    case 'classroom':
      return classroom(p);
    case 'office':
      return office(p);
    case 'library':
      return library(p);
    case 'cafeteria':
      return cafeteria(p);
    case 'kitchen':
      return kitchen(p);
    case 'lab':
      return lab(p);
    case 'bathroom':
      return bathroom(p);
    case 'storage':
      return storage(p);
    case 'multi':
    case 'arts':
      return workshop(p);
    case 'house':
      return house(p);
    default:
      return;
  }
}
