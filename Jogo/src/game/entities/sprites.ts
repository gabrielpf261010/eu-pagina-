import type { Facing } from '../types';

/**
 * Pixel art de personagens. Um único desenhista (`drawPerson`) serve para o jogador, alunos,
 * professora e Gil — cada um muda apenas a paleta (`PersonLook`) e a pose (`PersonPose`).
 */
export interface PersonLook {
  hair: string;
  skin: string;
  shirt: string;
  shirtHi: string;
  pants: string;
  shoe: string;
  bag: string | null;
  eye: string;
  hairStyle: 'short' | 'long' | 'bun';
  skirt?: boolean;
  glasses?: boolean;
  /** Brilho no chão (ex.: aura vermelha do Gil). */
  aura?: string;
}

export type Arms = 'down' | 'up' | 'reach';

export interface PersonPose {
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
  walkT: number;
  sitting: boolean;
  arms?: Arms;
  /** Sentado de costas: vira a cabeça para olhar para o lado. */
  headTurn?: 'left' | 'right' | null;
  /** Deslocamento vertical do corpo (tremedeira, risada, escrever). */
  bob?: number;
  talking?: boolean;
}

const DARK = 'rgba(0,0,0,0.25)';
const RIM = '#9aa0b0';

export function drawPerson(g: CanvasRenderingContext2D, L: PersonLook, p: PersonPose) {
  if (L.aura) {
    const cx = Math.round(p.x);
    const cy = Math.round(p.y) - 1;
    const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 20);
    grad.addColorStop(0, L.aura);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(cx - 20, cy - 20, 40, 40);
  }
  if (p.sitting) seated(g, L, p);
  else standing(g, L, p);
}

function standing(g: CanvasRenderingContext2D, L: PersonLook, p: PersonPose) {
  const px = Math.round(p.x) - 6;
  const py = Math.round(p.y) + 4 - 16;
  const step = p.moving ? Math.floor(p.walkT * 8) % 4 : 0;
  const oy = (p.moving && step % 2 === 1 ? -1 : 0) + (p.bob ?? 0);
  const arms = p.arms ?? 'down';
  const talk = !!p.talking && Math.floor(performance.now() / 140) % 2 === 0;

  g.save();
  g.translate(px, py);
  if (p.facing === 'right') {
    g.translate(12, 0);
    g.scale(-1, 1);
  }
  const r = (c: string, x: number, y: number, w: number, h: number) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };

  r('rgba(0,0,0,0.32)', 1, 13, 10, 3);

  if (p.facing === 'down' || p.facing === 'up') {
    const a = step === 1 ? 1 : 0;
    const b = step === 3 ? 1 : 0;
    if (L.skirt) {
      r(L.pants, 2, 10, 8, 3);
    } else {
      r(L.pants, 3, 11, 3, 2);
      r(L.pants, 6, 11, 3, 2);
    }
    r(L.shoe, 3, 13 - a, 3, 2);
    r(L.shoe, 6, 13 - b, 3, 2);

    const armsFront = () => {
      if (arms === 'down') {
        r(L.skin, 1, 8 + oy, 1, 3);
        r(L.skin, 10, 8 + oy, 1, 3);
      } else {
        r(L.skin, 1, 3 + oy, 1, 6);
        r(L.skin, 10, 3 + oy, 1, 6);
      }
    };

    if (p.facing === 'down') {
      r(L.hair, 3, oy, 6, 3);
      r(L.hair, 2, 1 + oy, 1, 3);
      r(L.hair, 9, 1 + oy, 1, 3);
      if (L.hairStyle === 'bun') r(L.hair, 5, -2 + oy, 3, 2);
      if (L.hairStyle !== 'short') {
        r(L.hair, 2, 3 + oy, 1, 5);
        r(L.hair, 9, 3 + oy, 1, 5);
      }
      r(L.skin, 3, 3 + oy, 6, 4);
      r(L.eye, 4, 4 + oy, 1, 2);
      r(L.eye, 7, 4 + oy, 1, 2);
      if (L.glasses) {
        r(RIM, 3, 4 + oy, 1, 2);
        r(RIM, 5, 4 + oy, 2, 1);
        r(RIM, 8, 4 + oy, 1, 2);
      }
      if (talk) r('#8a3030', 5, 6 + oy, 2, 1);
      r(L.shirt, 2, 7 + oy, 8, 4);
      r(L.shirtHi, 3, 7 + oy, 2, 1);
      r('#ffffff', 5, 7 + oy, 2, 1);
      armsFront();
    } else {
      r(L.hair, 3, oy, 6, 7);
      r(L.hair, 2, 1 + oy, 1, 4);
      r(L.hair, 9, 1 + oy, 1, 4);
      if (L.hairStyle === 'bun') r(L.hair, 5, -2 + oy, 3, 2);
      r(L.shirt, 2, 7 + oy, 8, 4);
      if (L.bag) {
        r(L.bag, 3, 7 + oy, 6, 5);
        r(DARK, 3, 11 + oy, 6, 1);
      }
      if (L.hairStyle !== 'short') r(L.hair, 3, 7 + oy, 6, 3);
      if (arms === 'reach') {
        // braço direito esticado para cima (apertando um botão na parede)
        r(L.skin, 1, 8 + oy, 1, 3);
        r(L.skin, 9, -2 + oy, 2, 9);
        r(L.shirt, 9, 6 + oy, 2, 2);
      } else {
        armsFront();
      }
    }
  } else {
    // perfil (desenhado olhando para a esquerda; "right" usa espelhamento)
    const front = step === 1 ? 3 : step === 3 ? 5 : 4;
    const back = step === 1 ? 6 : step === 3 ? 4 : 5;
    if (L.skirt) r(L.pants, 3, 10, 6, 3);
    else r(L.pants, 4, 11, 4, 2);
    r(L.shoe, front, 13, 3, 2);
    r(L.shoe, back, 13, 3, 2);
    r(L.hair, 3, oy, 6, 3);
    r(L.hair, 6, 2 + oy, 3, 4);
    if (L.hairStyle !== 'short') r(L.hair, 6, 2 + oy, 3, 8);
    if (L.hairStyle === 'bun') r(L.hair, 7, -2 + oy, 3, 2);
    r(L.skin, 3, 3 + oy, 4, 4);
    r(L.eye, 3, 4 + oy, 1, 2);
    if (L.glasses) r(RIM, 2, 4 + oy, 1, 1);
    if (talk) r('#8a3030', 3, 6 + oy, 1, 1);
    r(L.shirt, 3, 7 + oy, 6, 4);
    if (L.bag) r(L.bag, 7, 7 + oy, 3, 5);
    if (arms === 'down') r(L.skin, 4, 8 + oy, 2, 3);
    else r(L.skin, 3, 1 + oy, 2, 8);
    r(L.shirtHi, 4, 7 + oy, 2, 1);
  }
  g.restore();
}

/** Pose sentada: corpo mais baixo, braços sobre a mesa. */
function seated(g: CanvasRenderingContext2D, L: PersonLook, p: PersonPose) {
  const px = Math.round(p.x) - 6;
  const py = Math.round(p.y) + 4 - 16 + 1 + (p.bob ?? 0);
  const arms = p.arms ?? 'down';

  g.save();
  g.translate(px, py);
  if (p.facing === 'right') {
    g.translate(12, 0);
    g.scale(-1, 1);
  }
  const r = (c: string, x: number, y: number, w: number, h: number) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };

  if (p.facing === 'up') {
    // de costas para a câmera, olhando para a mesa / quadro
    const turn = p.headTurn;
    if (!turn) {
      r(L.hair, 3, 2, 6, 7);
      r(L.hair, 2, 3, 1, 4);
      r(L.hair, 9, 3, 1, 4);
    } else {
      r(L.hair, 3, 2, 6, 3);
      r(L.hair, 2, 3, 1, 4);
      r(L.hair, 9, 3, 1, 4);
      if (turn === 'left') {
        r(L.skin, 3, 5, 3, 3);
        r(L.eye, 3, 6, 1, 2);
        r(L.hair, 6, 5, 3, 3);
      } else {
        r(L.skin, 6, 5, 3, 3);
        r(L.eye, 8, 6, 1, 2);
        r(L.hair, 3, 5, 3, 3);
      }
    }
    if (L.hairStyle === 'bun') r(L.hair, 5, 0, 3, 2);
    r(L.shirt, 2, 9, 8, 4);
    if (L.bag) {
      r(L.bag, 3, 9, 6, 4);
      r(DARK, 3, 12, 6, 1);
    }
    if (L.hairStyle !== 'short') r(L.hair, 3, 9, 6, 2);
    r(L.skin, 1, 8, 1, 2);
    if (arms === 'up') r(L.skin, 10, 2, 1, 7);
    else r(L.skin, 10, 8, 1, 2);
  } else if (p.facing === 'down') {
    r(L.hair, 3, 2, 6, 3);
    r(L.hair, 2, 3, 1, 3);
    r(L.hair, 9, 3, 1, 3);
    r(L.skin, 3, 5, 6, 4);
    r(L.eye, 4, 6, 1, 2);
    r(L.eye, 7, 6, 1, 2);
    r(L.shirt, 2, 9, 8, 3);
    r(L.shirtHi, 3, 9, 2, 1);
    r('#ffffff', 5, 9, 2, 1);
    r(L.skin, 1, 10, 1, 2);
    r(L.skin, 10, 10, 1, 2);
    r(L.pants, 3, 12, 6, 2);
    r(L.shoe, 3, 14, 2, 1);
    r(L.shoe, 7, 14, 2, 1);
  } else {
    // perfil: coxas à frente (esquerda)
    r(L.hair, 3, 2, 6, 3);
    r(L.hair, 6, 4, 3, 4);
    r(L.skin, 3, 5, 4, 4);
    r(L.eye, 3, 6, 1, 2);
    r(L.shirt, 3, 9, 6, 3);
    r(L.shirtHi, 4, 9, 2, 1);
    if (L.bag) r(L.bag, 7, 9, 3, 4);
    r(L.skin, 2, 10, 2, 2);
    r(L.pants, 2, 12, 6, 2);
    r(L.shoe, 0, 13, 2, 2);
  }
  g.restore();
}

// ---------------------------------------------------------------- balões e emotes
export type EmoteKind = 'dots' | 'exclaim' | 'question' | 'laugh' | 'sweat' | 'angry';

/** Emote pequeno (ícone dentro de um balão de 11x9). `bottomY` é o ponto logo acima da cabeça. */
export function drawEmote(g: CanvasRenderingContext2D, kind: EmoteKind, cx: number, bottomY: number) {
  const x = Math.round(cx) - 5;
  const y = Math.round(bottomY) - 12;
  const r = (c: string, xx: number, yy: number, w: number, h: number) => {
    g.fillStyle = c;
    g.fillRect(x + xx, y + yy, w, h);
  };
  const ink = '#1a1a22';
  r(ink, 0, 0, 11, 9);
  r(kind === 'angry' ? '#d02020' : '#ffffff', 1, 1, 9, 7);
  r(ink, 4, 9, 3, 1);
  r(ink, 5, 10, 1, 1);
  switch (kind) {
    case 'dots':
      r(ink, 2, 4, 1, 2);
      r(ink, 5, 4, 1, 2);
      r(ink, 8, 4, 1, 2);
      break;
    case 'exclaim':
      r('#d02020', 5, 2, 1, 3);
      r('#d02020', 5, 6, 1, 1);
      break;
    case 'question':
      r(ink, 4, 2, 3, 1);
      r(ink, 6, 3, 1, 1);
      r(ink, 5, 4, 1, 1);
      r(ink, 5, 6, 1, 1);
      break;
    case 'laugh':
      r(ink, 3, 3, 1, 1);
      r(ink, 7, 3, 1, 1);
      r('#d02020', 3, 5, 5, 2);
      break;
    case 'sweat':
      r('#3a8ee0', 5, 2, 1, 1);
      r('#3a8ee0', 4, 3, 3, 2);
      r('#3a8ee0', 5, 5, 1, 1);
      break;
    case 'angry':
      r('#ffffff', 5, 2, 1, 3);
      r('#ffffff', 5, 6, 1, 1);
      break;
  }
}

function wrap(text: string, max: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > max) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Balão de fala. Fica dentro da área visível (minX..maxX). */
export function drawBubble(
  g: CanvasRenderingContext2D,
  text: string,
  cx: number,
  bottomY: number,
  o: { shout?: boolean; minX: number; maxX: number },
) {
  g.save();
  g.font = 'bold 8px monospace';
  g.textBaseline = 'top';
  const lines = wrap(text, 17);
  const lw = Math.max(...lines.map((l) => g.measureText(l).width));
  const w = Math.ceil(lw) + 8;
  const h = lines.length * 9 + 5;
  let x = Math.round(cx - w / 2);
  x = Math.max(o.minX, Math.min(o.maxX - w, x));
  const y = Math.round(bottomY - h - 4);
  const ink = '#1a1a22';

  g.fillStyle = ink;
  g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = o.shout ? '#fff1ee' : '#ffffff';
  g.fillRect(x, y, w, h);
  const tx = Math.max(x + 2, Math.min(x + w - 5, Math.round(cx) - 1));
  g.fillStyle = ink;
  g.fillRect(tx - 1, y + h, 5, 2);
  g.fillRect(tx, y + h + 2, 3, 1);
  g.fillStyle = o.shout ? '#ffffff' : '#ffffff';
  g.fillRect(tx, y + h, 3, 1);

  g.fillStyle = o.shout ? '#c01818' : ink;
  lines.forEach((l, i) => g.fillText(l, x + 4, y + 3 + i * 9));
  g.restore();
}
