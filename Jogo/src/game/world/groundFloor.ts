import type { GameMap, RoomKind } from '../types';
import { MapBuilder } from './MapBuilder';
import { LANDINGS } from './links';
import { T } from './tiles';
import {
  buildShell,
  courtLines,
  fenceRect,
  lockerColumn,
  makeRoom,
  midDoor,
  openPassage,
  placeStairs,
  propLine,
  props,
  wallDecor,
} from './structures';

/**
 * TÉRREO — montado a partir da planta real da escola (escala ≈ 7 px da planta por tile).
 *
 *  Oeste  : prédio comprido (coluna de salas + corredor) com a escadaria A e o jardim interno.
 *  Centro : passarela, Salas 09/08/07, Refeitório, Salas Osvaldo/05/04 e o corredor leste.
 *  Leste  : banheiro feminino + escada B, Salas 16/15/17, Artes/Biblioteca/Uso Múltiplo,
 *           banheiros, Casa do Zelador e o Pátio Coberto.
 *  Sul    : quadra, cozinha, central de gás, pátio de entrada e portão principal.
 */
export function buildGroundFloor(): GameMap {
  const b = new MapBuilder('ground', 'Térreo', 140, 142, T.GRASS);
  const G = T.GRASS;

  // ============================================================ terreno
  // rua
  b.fillGround(0, 122, 140, 2, T.SIDEWALK);
  b.fillGround(0, 124, 140, 18, T.ASPHALT);
  b.fillGround(74, 125, 7, 4, T.CROSSWALK);
  // pátio externo
  b.fillGround(32, 14, 104, 106, T.CONCRETE);
  b.fillGround(2, 120, 134, 1, T.CONCRETE);
  b.fillGround(90, 94, 46, 26, G); // jardim sudeste
  b.fillGround(107, 14, 29, 8, G); // gramado nordeste
  // passarelas cobertas (cinza)
  b.fillGround(42, 15, 6, 62, T.PAVER);
  b.fillGround(32, 77, 43, 5, T.PAVER);
  // pátio coberto
  b.fillGround(80, 64, 21, 30, T.PAVER);
  // corredor leste (interno) e degraus de acesso ao pátio de entrada
  b.fillGround(75, 26, 5, 78, T.FLOOR_HALL);
  b.fillGround(71, 104, 9, 2, T.STEPS);
  // caminho do portão
  b.fillGround(72, 108, 11, 13, T.PAVER);

  // ============================================================ zonas nomeadas
  b.zone('Área Externa', 0, 0, 140, 142);
  b.zone('Rua', 0, 122, 140, 20);
  b.zone('Pátio Externo', 32, 14, 104, 106);
  b.zone('Passarela', 42, 15, 6, 62);
  b.zone('Passarela', 32, 77, 43, 5);
  b.zone('Pátio Coberto', 80, 64, 21, 30);
  b.zone('Corredor Leste', 75, 26, 5, 78);
  b.zone('Entrada da Escola', 71, 104, 13, 17);
  b.zone('Portão Principal (Saída)', 70, 116, 14, 6);

  // ============================================================ muro, portão e entrada lateral
  fenceRect(b, 1, 2, 136, 120);
  b.fillObjects(70, 121, 14, 1, T.GATE);
  openPassage(b, 15, 121, 4, 1, T.CONCRETE);
  b.fillGround(15, 120, 4, 1, T.STEPS);

  // ============================================================ PRÉDIO OESTE
  buildShell(b, 'Corredor Principal', 5, 7, 27, 113, T.FLOOR_HALL);

  const west: Array<{ id: string; name: string; y: number; h: number; kind: RoomKind }> = [
    { id: 'prof', name: 'Sala dos Professores', y: 7, h: 17, kind: 'office' },
    { id: 'estudos', name: 'Sala de Estudos', y: 23, h: 14, kind: 'office' },
    { id: 'orientacao', name: 'Orientação', y: 36, h: 14, kind: 'office' },
    { id: 'manutencao', name: 'Sala de Manutenção', y: 49, h: 14, kind: 'storage' },
    { id: 'secretaria', name: 'Secretaria Escolar', y: 62, h: 14, kind: 'office' },
    { id: 'informacao', name: 'Sala de Informação', y: 75, h: 15, kind: 'office' },
    { id: 'pedagogia', name: 'Sala de Pedagogia', y: 89, h: 15, kind: 'office' },
    { id: 'coordenacao', name: 'Sala da Coordenação', y: 103, h: 17, kind: 'office' },
  ];
  for (const r of west) {
    if (r.id === 'prof') {
      // a sala dos professores avança até o lobby da escadaria (como na planta)
      makeRoom(b, {
        id: r.id,
        name: r.name,
        kind: r.kind,
        x: 5,
        y: r.y,
        w: 27,
        h: r.h,
        doors: [
          { side: 'S', at: 27 },
          { side: 'E', at: 18 },
        ],
      });
    } else if (r.id === 'coordenacao') {
      makeRoom(b, {
        id: r.id,
        name: r.name,
        kind: r.kind,
        x: 5,
        y: r.y,
        w: 20,
        h: r.h,
        doors: [midDoor('E', 5, r.y, 20, r.h), { side: 'S', at: 16 }],
      });
    } else {
      makeRoom(b, {
        id: r.id,
        name: r.name,
        kind: r.kind,
        x: 5,
        y: r.y,
        w: 20,
        h: r.h,
        doors: [midDoor('E', 5, r.y, 20, r.h)],
      });
    }
  }

  // escadaria A (azul) + lobby com copiadora
  makeRoom(b, {
    id: 'escada-a',
    name: 'Escadaria A',
    kind: 'stairs',
    x: 31,
    y: 16,
    w: 11,
    h: 31,
    doors: [
      { side: 'W', at: 40 },
      { side: 'E', at: 20 },
    ],
  });
  placeStairs(b, {
    id: 'stairs-a-up',
    label: 'Subir para o 1º andar',
    floor: 'ground',
    rect: { x: 33, y: 28, w: 5, h: 3 },
    direction: 'up',
    target: LANDINGS.firstA,
  });
  props(b, T.COUNTER, [
    [35, 17],
    [36, 17],
  ]);
  props(b, T.PLANT, [
    [32, 17],
    [40, 17],
    [32, 44],
    [40, 44],
  ]);
  props(b, T.BENCH, [
    [38, 41],
    [39, 41],
  ]);
  props(b, T.TROPHY, [[40, 24]]);

  // jardim interno (pátio fechado, sem teto)
  makeRoom(b, {
    id: 'jardim',
    name: 'Jardim Interno',
    kind: 'hall',
    x: 31,
    y: 46,
    w: 11,
    h: 27,
    floor: G,
    furnish: false,
    windows: false,
    light: false,
    doors: [{ side: 'W', at: 58 }],
  });
  props(b, T.TREE, [
    [34, 50],
    [39, 53],
    [35, 62],
    [39, 66],
    [33, 69],
  ]);
  props(b, T.BUSH, [
    [38, 50],
    [34, 58],
    [38, 60],
    [40, 70],
  ]);
  props(b, T.BENCH, [
    [36, 56],
    [37, 56],
  ]);

  // armários coloridos no corredor principal, pulando as faixas das portas
  // portas (2 tiles): y14-15 prof · 29-30 estudos · 42-43 orientação · 55-56 manutenção
  // 68-69 secretaria · 81-82 diretoria · 95-96 pedagogia · 110-111 coordenação
  lockerColumn(b, 30, 24, 118, [
    [28, 31],
    [41, 44],
    [54, 57],
    [67, 70],
    [80, 83],
    [94, 97],
    [109, 112],
  ]);
  // saídas do corredor: passarela e quadra
  openPassage(b, 31, 77, 1, 5, T.FLOOR_HALL);
  openPassage(b, 31, 84, 1, 3, T.FLOOR_HALL);

  // ============================================================ SALAS 09 / 08 / 07
  [
    { id: 'sala-09', name: 'Sala 09', y: 17, h: 11 },
    { id: 'sala-08', name: 'Sala 08', y: 27, h: 11 },
    { id: 'sala-07', name: 'Sala 07', y: 37, h: 12 },
  ].forEach((r) => {
    makeRoom(b, {
      id: r.id,
      name: r.name,
      kind: 'classroom',
      x: 48,
      y: r.y,
      w: 10,
      h: r.h,
      doors: [midDoor('W', 48, r.y, 10, r.h)],
    });
  });

  // ============================================================ OSVALDO / 05 / 04
  makeRoom(b, {
    id: 'osvaldo',
    name: 'Sala Osvaldo José Augusto',
    kind: 'office',
    x: 62,
    y: 11,
    w: 17,
    h: 15,
    doors: [{ side: 'S', at: 76 }],
  });
  b.setObj(79, 25, T.WALL);
  [
    { id: 'sala-05', name: 'Sala 05', y: 25, h: 13 },
    { id: 'sala-04', name: 'Sala 04', y: 37, h: 14 },
  ].forEach((r) => {
    makeRoom(b, {
      id: r.id,
      name: r.name,
      kind: 'classroom',
      x: 62,
      y: r.y,
      w: 13,
      h: r.h,
      doors: [midDoor('E', 62, r.y, 13, r.h)],
    });
  });
  // Capítulo 1: botão vermelho do pânico na parede norte da Sala 04 (ao lado do quadro)
  wallDecor(b, 72, 37, T.WALL_PANIC);

  // ============================================================ REFEITÓRIO
  makeRoom(b, {
    id: 'refeitorio',
    name: 'Refeitório',
    kind: 'cafeteria',
    x: 48,
    y: 50,
    w: 27,
    h: 27,
    doors: [
      { side: 'S', at: 58 },
      { side: 'W', at: 62 },
      { side: 'E', at: 62 },
    ],
  });
  [60, 61, 63, 64].forEach((x) => wallDecor(b, x, 50, T.WALL_MURAL));
  // cantina: balcão de atendimento na faixa norte do refeitório
  b.zone('Cantina', 48, 50, 27, 6);

  // ============================================================ BANHEIRO FEM. + ESCADA B
  makeRoom(b, {
    id: 'ban-fem',
    name: 'Banheiro Feminino',
    kind: 'bathroom',
    x: 80,
    y: 41,
    w: 7,
    h: 13,
    doors: [{ side: 'W', at: 46 }],
  });
  makeRoom(b, {
    id: 'escada-b',
    name: 'Escadaria B',
    kind: 'stairs',
    x: 80,
    y: 53,
    w: 7,
    h: 10,
    doors: [{ side: 'W', at: 58 }],
  });
  placeStairs(b, {
    id: 'stairs-b-up',
    label: 'Subir para o 1º andar',
    floor: 'ground',
    rect: { x: 82, y: 56, w: 3, h: 3 },
    direction: 'up',
    target: LANDINGS.firstB,
  });
  props(b, T.PLANT, [
    [81, 55],
    [85, 55],
  ]);

  // ============================================================ SALAS 16 / 15 / 17
  [
    { id: 'sala-16', name: 'Sala 16', y: 21, h: 17 },
    { id: 'sala-15', name: 'Sala 15', y: 37, h: 14 },
    { id: 'sala-17', name: 'Sala 17', y: 50, h: 14 },
  ].forEach((r) => {
    makeRoom(b, {
      id: r.id,
      name: r.name,
      kind: 'classroom',
      x: 89,
      y: r.y,
      w: 12,
      h: r.h,
      doors: [midDoor('W', 89, r.y, 12, r.h)],
    });
  });

  // ============================================================ ARTES / BIBLIOTECA / USO MÚLTIPLO
  makeRoom(b, {
    id: 'artes',
    name: 'Sala de Artes',
    kind: 'arts',
    x: 103,
    y: 22,
    w: 22,
    h: 14,
    doors: [midDoor('W', 103, 22, 22, 14)],
  });
  makeRoom(b, {
    id: 'biblioteca',
    name: 'Biblioteca',
    kind: 'library',
    x: 103,
    y: 35,
    w: 22,
    h: 27,
    doors: [midDoor('W', 103, 35, 22, 27)],
  });
  [108, 109, 112, 113, 116, 117].forEach((x) => wallDecor(b, x, 35, T.WALL_MURAL));
  makeRoom(b, {
    id: 'multiplo',
    name: 'Sala de Uso Múltiplo',
    kind: 'multi',
    x: 107,
    y: 62,
    w: 15,
    h: 18,
    doors: [midDoor('W', 107, 62, 15, 18)],
  });
  makeRoom(b, {
    id: 'zelador',
    name: 'Casa do Zelador',
    kind: 'house',
    x: 122,
    y: 66,
    w: 12,
    h: 19,
    doors: [{ side: 'S', at: 127 }],
  });
  makeRoom(b, {
    id: 'ban-masc',
    name: 'Banheiro Masculino',
    kind: 'bathroom',
    x: 101,
    y: 81,
    w: 8,
    h: 11,
    doors: [{ side: 'W', at: 85 }],
  });
  makeRoom(b, {
    id: 'ban-fem-2',
    name: 'Banheiro Feminino',
    kind: 'bathroom',
    x: 108,
    y: 81,
    w: 8,
    h: 11,
    doors: [{ side: 'N', at: 110 }],
  });

  // ============================================================ COZINHA / CENTRAL DE GÁS
  makeRoom(b, {
    id: 'cozinha',
    name: 'Cozinha',
    kind: 'kitchen',
    x: 59,
    y: 82,
    w: 16,
    h: 14,
    doors: [
      { side: 'N', at: 66 },
      midDoor('E', 59, 82, 16, 14),
    ],
  });
  makeRoom(b, {
    id: 'gas',
    name: 'Central de Gás',
    kind: 'storage',
    x: 58,
    y: 99,
    w: 13,
    h: 11,
    doors: [{ side: 'E', at: 103, locked: true }],
  });

  // ============================================================ QUADRA DESCOBERTA
  b.zone('Quadra Descoberta', 32, 82, 25, 32);
  fenceRect(b, 32, 82, 25, 32);
  b.fillGround(33, 83, 23, 30, T.COURT);
  courtLines(b, 35, 85, 53, 110);
  openPassage(b, 32, 84, 1, 3, T.CONCRETE);
  openPassage(b, 41, 82, 5, 1, T.CONCRETE);
  openPassage(b, 41, 113, 5, 1, T.CONCRETE);
  props(b, T.HOOP, [
    [44, 83],
    [44, 112],
  ]);
  props(b, T.BENCH, [
    [33, 95],
    [33, 100],
    [55, 95],
    [55, 100],
  ]);

  // ============================================================ PÁTIO COBERTO
  props(b, T.PILLAR, [
    [80, 66],
    [80, 72],
    [80, 78],
    [80, 84],
    [80, 90],
    [100, 66],
    [100, 72],
    [100, 78],
    [100, 90],
    [90, 66],
    [90, 91],
  ]);
  props(b, T.TREE, [[90, 78]]);
  props(b, T.BUSH, [
    [89, 78],
    [91, 78],
    [90, 77],
    [90, 79],
  ]);
  props(b, T.BENCH, [
    [83, 70],
    [84, 70],
    [96, 70],
    [97, 70],
    [83, 86],
    [84, 86],
  ]);
  props(b, T.BENCH_U, [
    [96, 88],
    [97, 88],
  ]);
  props(b, T.VENDING, [[93, 64]]);
  props(b, T.TRASH, [[98, 65]]);

  // ============================================================ entrada principal (portão)
  propLine(b, T.BUSH, 71, 108, 71, 119, 1, 2);
  propLine(b, T.BUSH, 83, 108, 83, 119, 1, 2);
  props(b, T.BENCH, [
    [64, 112],
    [65, 112],
    [90, 112],
    [91, 112],
  ]);
  props(b, T.LAMP, [
    [72, 110],
    [82, 110],
    [72, 118],
    [82, 118],
    [46, 116],
    [62, 116],
    [12, 118],
    [100, 99],
  ]);

  // ============================================================ vegetação externa
  propLine(b, T.TREE, 3, 3, 135, 3, 4, 1, G);
  propLine(b, T.TREE, 5, 5, 135, 5, 4, 1, G);
  propLine(b, T.TREE, 8, 8, 100, 11, 5, 3, G);
  propLine(b, T.TREE, 2, 9, 2, 118, 1, 4, G);
  propLine(b, T.TREE, 3, 10, 3, 118, 1, 7, G);
  propLine(b, T.TREE, 108, 15, 134, 20, 4, 3, G);
  propLine(b, T.TREE, 92, 96, 134, 118, 4, 3, G);
  propLine(b, T.BUSH, 91, 94, 134, 94, 2, 1, G);
  props(b, T.BUSH, [
    [34, 116],
    [38, 116],
    [50, 116],
    [66, 116],
    [8, 119],
    [24, 119],
  ]);
  props(b, T.BENCH, [
    [60, 98],
    [61, 98],
    [100, 107],
    [101, 107],
  ]);

  // ============================================================ iluminação
  b.lightsAlong(28, 26, 28, 116, 9, 8);
  b.lightsAlong(77, 28, 77, 102, 9, 7);
  b.lightsAlong(45, 18, 45, 74, 9, 7);
  b.lightsAlong(36, 79, 72, 79, 9, 7);
  b.light(90, 70, 12);
  b.light(90, 86, 12);
  b.light(77, 112, 10);

  // ============================================================ início: dentro da Sala 08
  b.spawnHint = { x: 68, y: 45 }; // Sala 04 (cenário do capítulo 1)
  return b.build();
}
