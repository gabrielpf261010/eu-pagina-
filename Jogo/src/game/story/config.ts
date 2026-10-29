import type { FloorId } from '../constants';
import type { Point } from '../types';

/**
 * Configuração do capítulo 1. Posições em tiles (mapa B — térreo / Sala 04).
 * Mudou a sala? Ajuste aqui; o restante da história lê desses valores.
 */
export const CHAPTER1 = {
  title: 'O Botão do Pânico',
  roomId: 'sala-04',
  /** Cadeira desejada para o jogador (usa a carteira mais próxima). */
  playerSeatHint: { x: 68, y: 45 } as Point,
  studentCount: 15,

  /** Botão vermelho na parede norte e o tile onde a professora se posiciona para apertá-lo. */
  buttonTile: { x: 72, y: 37 } as Point,
  buttonStand: { x: 72, y: 38 } as Point,

  /** Perto do quadro (escreve) e pela frente da sala (explica). */
  teacherStart: { x: 66, y: 38 } as Point,
  teacherWriteSpots: [
    { x: 66, y: 38 },
    { x: 69, y: 38 },
  ] as Point[],
  teacherRoamSpots: [
    { x: 65, y: 40 },
    { x: 71, y: 40 },
    { x: 70, y: 39 },
    { x: 64, y: 39 },
  ] as Point[],

  countdownSeconds: 20,

  /** Elaine patrulha o 1º andar (corredores das três alas). */
  elainePatrol: [
    { x: 16, y: 12 },
    { x: 16, y: 60 },
    { x: 16, y: 100 },
    { x: 44, y: 25 },
    { x: 44, y: 60 },
    { x: 44, y: 85 },
    { x: 61, y: 40 },
    { x: 61, y: 65 },
  ] as Point[],

  /** O Gil nasce no corredor leste, a poucos passos da sala, e vai investigar a porta. */
  gilSpawn: { x: 77, y: 54 } as Point,
  gilFirstTarget: { x: 76, y: 43 } as Point,
  gilGraceAfterRetry: 5,

  patrol: {
    ground: [
      { x: 77, y: 46 },
      { x: 77, y: 72 },
      { x: 77, y: 98 },
      { x: 60, y: 79 },
      { x: 38, y: 79 },
      { x: 28, y: 60 },
      { x: 28, y: 100 },
      { x: 28, y: 32 },
      { x: 62, y: 63 },
      { x: 88, y: 80 },
    ],
    first: [
      { x: 16, y: 12 },
      { x: 16, y: 60 },
      { x: 16, y: 100 },
      { x: 44, y: 25 },
      { x: 44, y: 60 },
      { x: 44, y: 85 },
      { x: 60, y: 40 },
      { x: 60, y: 60 },
    ],
  } as Record<FloorId, Point[]>,

  /** Quanto cada ação tira da paciência (em pontos de 0 a 100). */
  costs: {
    stand: 4,
    standDrainPerSecond: 0.7,
    talk: 3,
    throwBall: 6,
    hitTeacher: 12,
    hitStudent: 2,
    recoverPerSecond: 0.5,
  },
};
