import type { GameMap } from '../types';
import { MapBuilder } from './MapBuilder';
import { LANDINGS } from './links';
import { T } from './tiles';
import { buildShell, lockerColumn, makeRoom, midDoor, openPassage, placeStairs, props } from './structures';

/**
 * 1º ANDAR — três alas como na planta:
 *  - Ala Oeste : Salas 07→01 + Laboratório de Informática, escadaria A e banheiros (masc./fem.).
 *  - Ala Central: Salas 19, 22, 21, 20 e 25 (trancada), banheiro e escadaria B.
 *  - Ala Leste : Salas 18, 27, 26, 23 e 24, ligada à Ala Central pela passarela superior (formato em "H").
 * O restante da cobertura é vazio (VOID), intransponível.
 */
export function buildFirstFloor(): GameMap {
  const b = new MapBuilder('first', '1º Andar', 78, 114, T.VOID);
  b.zone('Cobertura', 0, 0, 78, 114);

  const slug = (name: string) => `1-${name.toLowerCase().replace(/\s+/g, '-')}`;

  // ============================================================ ALA OESTE
  buildShell(b, 'Corredor Ala Oeste', 3, 3, 17, 108, T.FLOOR_HALL);
  ['Sala 07', 'Sala 06', 'Sala 05', 'Sala 04', 'Sala 03', 'Sala 02', 'Sala 01'].forEach((name, i) => {
    const y = 3 + i * 13;
    makeRoom(b, {
      id: slug(name),
      name,
      kind: 'classroom',
      x: 3,
      y,
      w: 12,
      h: 14,
      doors: [midDoor('E', 3, y, 12, 14)],
    });
  });
  makeRoom(b, {
    id: 'lab-info',
    name: 'Laboratório de Informática',
    kind: 'lab',
    x: 3,
    y: 94,
    w: 12,
    h: 17,
    doors: [midDoor('E', 3, 94, 12, 17)],
  });

  // escadaria A + banheiros
  makeRoom(b, {
    id: '1-escada-a',
    name: 'Escadaria A',
    kind: 'stairs',
    x: 19,
    y: 17,
    w: 8,
    h: 11,
    doors: [{ side: 'W', at: 21 }],
  });
  placeStairs(b, {
    id: 'stairs-a-down',
    label: 'Descer para o térreo',
    floor: 'first',
    rect: { x: 21, y: 19, w: 5, h: 3 },
    direction: 'down',
    target: LANDINGS.groundA,
  });
  makeRoom(b, {
    id: '1-ban-masc',
    name: 'Banheiro Masculino',
    kind: 'bathroom',
    x: 19,
    y: 27,
    w: 8,
    h: 10,
    doors: [{ side: 'W', at: 31 }],
  });
  makeRoom(b, {
    id: '1-ban-fem',
    name: 'Banheiro Feminino',
    kind: 'bathroom',
    x: 19,
    y: 36,
    w: 8,
    h: 11,
    doors: [{ side: 'W', at: 41 }],
  });
  props(b, T.PLANT, [
    [20, 18],
    [20, 25],
  ]);

  // ============================================================ ALA CENTRAL
  buildShell(b, 'Corredor Ala Central', 31, 15, 17, 78, T.FLOOR_HALL);
  [
    { name: 'Sala 19', y: 15, h: 14, locked: false },
    { name: 'Sala 22', y: 28, h: 14, locked: false },
    { name: 'Sala 21', y: 41, h: 15, locked: false },
    { name: 'Sala 20', y: 55, h: 16, locked: false },
    { name: 'Sala 25', y: 70, h: 23, locked: true },
  ].forEach((r) => {
    makeRoom(b, {
      id: slug(r.name),
      name: r.name,
      kind: 'classroom',
      x: 31,
      y: r.y,
      w: 12,
      h: r.h,
      doors: [midDoor('E', 31, r.y, 12, r.h, 0, r.locked)],
    });
  });
  makeRoom(b, {
    id: '1-ban-central',
    name: 'Banheiro Masculino',
    kind: 'bathroom',
    x: 47,
    y: 38,
    w: 8,
    h: 14,
    doors: [{ side: 'W', at: 44 }],
  });
  makeRoom(b, {
    id: '1-escada-b',
    name: 'Escadaria B',
    kind: 'stairs',
    x: 47,
    y: 51,
    w: 8,
    h: 15,
    doors: [{ side: 'W', at: 57 }],
  });
  placeStairs(b, {
    id: 'stairs-b-down',
    label: 'Descer para o térreo',
    floor: 'first',
    rect: { x: 50, y: 54, w: 3, h: 3 },
    direction: 'down',
    target: LANDINGS.groundB,
  });
  props(b, T.PLANT, [
    [48, 52],
    [53, 52],
  ]);

  // ============================================================ ALA LESTE
  buildShell(b, 'Corredor Ala Leste', 58, 17, 15, 74, T.FLOOR_HALL);
  makeRoom(b, {
    id: slug('Sala 18'),
    name: 'Sala 18',
    kind: 'classroom',
    x: 58,
    y: 17,
    w: 15,
    h: 14,
    doors: [{ side: 'S', at: 60 }],
  });
  [
    { name: 'Sala 27', y: 30, h: 15 },
    { name: 'Sala 26', y: 44, h: 14 },
    { name: 'Sala 23', y: 57, h: 16 },
  ].forEach((r) => {
    makeRoom(b, {
      id: slug(r.name),
      name: r.name,
      kind: 'classroom',
      x: 63,
      y: r.y,
      w: 10,
      h: r.h,
      doors: [midDoor('W', 63, r.y, 10, r.h)],
    });
  });
  makeRoom(b, {
    id: slug('Sala 24'),
    name: 'Sala 24',
    kind: 'classroom',
    x: 58,
    y: 72,
    w: 15,
    h: 19,
    doors: [{ side: 'N', at: 60 }],
  });

  // ============================================================ PASSARELA SUPERIOR (Central ⇄ Leste)
  makeRoom(b, {
    id: 'passarela-superior',
    name: 'Passarela Superior',
    kind: 'hall',
    x: 47,
    y: 65,
    w: 12,
    h: 8,
    furnish: false,
    windows: false,
  });
  openPassage(b, 47, 66, 1, 6, T.FLOOR_HALL);
  openPassage(b, 58, 66, 1, 6, T.FLOOR_HALL);
  props(b, T.PLANT, [
    [48, 66],
    [57, 66],
    [48, 71],
    [57, 71],
  ]);
  props(b, T.BENCH, [
    [52, 66],
    [53, 66],
  ]);
  props(b, T.BENCH_U, [
    [52, 71],
    [53, 71],
  ]);

  // ============================================================ armários, plantas e luzes dos corredores
  lockerColumn(b, 18, 5, 109, [
    [20, 23],
    [30, 33],
    [40, 43],
  ]);
  lockerColumn(b, 46, 17, 90, [
    [43, 46],
    [56, 59],
    [64, 73],
  ]);
  lockerColumn(b, 59, 32, 70, [[64, 73]]);
  props(b, T.PLANT, [
    [15, 5],
    [15, 109],
    [43, 17],
    [43, 90],
    [62, 32],
    [62, 70],
  ]);
  b.lightsAlong(16, 5, 16, 108, 9, 7);
  b.lightsAlong(44, 17, 44, 90, 9, 7);
  b.lightsAlong(60, 33, 60, 70, 9, 6);

  // ponto de fuga do terraço (Sala 18) sempre livre
  b.clearObjects(60, 20, 1, 1);

  b.spawnHint = { x: 23, y: 24 };
  return b.build();
}
