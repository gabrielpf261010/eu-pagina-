import { TILE } from '../constants';
import type { Game } from '../Game';
import { ROUTES } from '../quests/quests';

/** Desenha o mundo, entidades, luzes, efeitos da história, transições e minimapa. */
export function renderGame(game: Game, g: CanvasRenderingContext2D) {
  const { viewW, viewH } = game;
  const floor = game.player.floor;
  const map = game.world.map(floor);
  const baked = game.world.baked[floor];
  const now = performance.now();

  g.imageSmoothingEnabled = false;
  g.fillStyle = '#05060a';
  g.fillRect(0, 0, viewW, viewH);
  // (o fundo escuro aparece quando a câmera mostra áreas fora do mapa)

  const shake = game.shakeOffset();
  const cx = Math.round(game.camera.x) + shake.x;
  const cy = Math.round(game.camera.y) + shake.y;

  // --- mapa (sub-região do canvas pré-renderizado)
  const sx = Math.max(0, cx);
  const sy = Math.max(0, cy);
  const sw = Math.min(baked.width, cx + viewW) - sx;
  const sh = Math.min(baked.height, cy + viewH) - sy;
  if (sw > 0 && sh > 0) g.drawImage(baked, sx, sy, sw, sh, sx - cx, sy - cy, sw, sh);

  g.save();
  g.translate(-cx, -cy);

  // --- luz pulsante do botão do pânico
  if (game.story.alarmActive && floor === 'ground') {
    const b = game.story.buttonPixel;
    const pulse = 0.5 + 0.5 * Math.sin(now / 130);
    const rad = 46 + pulse * 14;
    const grad = g.createRadialGradient(b.x, b.y + 6, 2, b.x, b.y + 6, rad);
    grad.addColorStop(0, `rgba(255,40,40,${0.55 + pulse * 0.3})`);
    grad.addColorStop(1, 'rgba(255,40,40,0)');
    g.fillStyle = grad;
    g.fillRect(b.x - rad, b.y + 6 - rad, rad * 2, rad * 2);
    g.fillStyle = pulse > 0.5 ? '#ff7070' : '#ff2a2a';
    g.fillRect(Math.round(b.x) - 2, Math.round(b.y) + 1, 4, 4);
  }

  // --- entidades (ordenadas por Y) e, por cima, balões / emotes / cones de visão
  const list = game.entities.filter((e) => e.floor === floor).sort((a, b) => a.y - b.y);
  for (const e of list) e.draw(g, game);
  for (const e of list) e.drawOverlay(g, game);

  // --- marcadores das rotas de fuga (só depois de revelados)
  for (const r of ROUTES) {
    if (r.floor !== floor || !game.quests.revealed.has(r.id)) continue;
    const mx = r.tx * TILE;
    const my = r.ty * TILE;
    const ready = game.quests.routeBlocker(r.id) === null;
    const glow = 0.25 + 0.15 * Math.sin(now / 300);
    g.fillStyle = ready ? `rgba(120,255,150,${glow})` : `rgba(255,215,80,${glow * 0.7})`;
    g.fillRect(mx, my, TILE, TILE);
    if (r.id === 'biblioteca') {
      // estante girando lentamente
      const off = Math.round(Math.sin(now / 900) * 3);
      g.fillStyle = '#4a2f1a';
      g.fillRect(mx + off, my - 4, TILE - off, TILE + 4);
      g.fillStyle = '#2b190d';
      g.fillRect(mx + off + 1, my - 2, TILE - off - 2, 14);
      for (let k = 0; k < 3; k++) {
        g.fillStyle = ['#a33a3a', '#3a6aa3', '#d9b84a'][k];
        g.fillRect(mx + off + 2 + k * 4, my + 1 + k, 3, 5);
      }
    } else if (r.id === 'jardim') {
      g.fillStyle = '#7a7a72';
      g.fillRect(mx + 2, my + 4, 12, 10);
      g.fillStyle = '#9a9a92';
      g.fillRect(mx + 3, my + 5, 10, 4);
      const sy = ['🍃', '☀️', '🌙', '⭐'];
      sy.forEach((_, k) => {
        g.fillStyle = ready ? '#7fe89a' : '#e8c23a';
        g.fillRect(mx + 3 + k * 3, my + 10, 2, 3);
      });
    } else if (r.id === 'terraco') {
      g.fillStyle = '#5a6070';
      g.fillRect(mx + 2, my + 2, 12, 12);
      g.fillStyle = '#8a93a5';
      g.fillRect(mx + 3, my + 3, 10, 3);
      g.fillStyle = ready ? '#6ef59a' : '#e0564a';
      g.fillRect(mx + 4, my + 8, 8, 4);
      g.fillStyle = '#101014';
      for (let k = 0; k < 3; k++) g.fillRect(mx + 4 + k * 3, my + 9, 2, 2);
    } else {
      g.fillStyle = '#3a2a1a';
      g.fillRect(mx + 2, my + 1, 12, 14);
      g.fillStyle = '#5c4326';
      g.fillRect(mx + 3, my + 2, 10, 12);
      g.fillStyle = ready ? '#ffd23a' : '#6a5a3a';
      for (let k = 0; k < 4; k++) g.fillRect(mx + 4 + (k % 2) * 5, my + 4 + Math.floor(k / 2) * 5, 3, 3);
      g.fillStyle = '#1a1a22';
      g.fillRect(mx + 11, my + 8, 2, 2);
    }
  }

  // --- pistas: rotas prontas para fuga e pontos do "Mapa de pistas"
  for (const s of [...game.quests.clueSpots(floor), ...game.items.clueSpots(floor)]) {
    const bounce = Math.round(Math.sin(now / 180) * 2);
    const x = s.x * TILE + 8;
    const y = s.y * TILE - 6 + bounce;
    g.fillStyle = '#1a1a22';
    g.fillRect(x - 5, y - 1, 11, 7);
    g.fillRect(x - 3, y + 6, 7, 2);
    g.fillRect(x - 1, y + 8, 3, 2);
    g.fillStyle = '#ffd23a';
    g.fillRect(x - 4, y, 9, 5);
    g.fillRect(x - 2, y + 5, 5, 2);
    g.fillRect(x, y + 7, 1, 1);
    g.fillStyle = '#1a1a22';
    g.fillRect(x - 1, y + 1, 3, 1);
    g.fillRect(x + 1, y + 2, 1, 1);
    g.fillRect(x, y + 3, 1, 1);
  }
  g.restore();

  // --- iluminação ambiente em volta do jogador
  const px = game.player.x - cx;
  const py = game.player.y - cy - 4;
  const rad = Math.max(viewW, viewH) * 0.75;
  const grad = g.createRadialGradient(px, py, 70, px, py, rad);
  grad.addColorStop(0, 'rgba(6,8,24,0)');
  grad.addColorStop(1, 'rgba(4,5,18,0.46)');
  g.fillStyle = grad;
  g.fillRect(0, 0, viewW, viewH);
  g.fillStyle = 'rgba(14,18,48,0.05)';
  g.fillRect(0, 0, viewW, viewH);

  // --- alarme: flash vermelho nas bordas
  if (game.story.alarmActive) {
    const a = 0.1 + 0.1 * Math.sin(now / 160);
    const vg = g.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.25, viewW / 2, viewH / 2, viewH * 0.9);
    vg.addColorStop(0, 'rgba(255,0,0,0)');
    vg.addColorStop(1, `rgba(255,0,0,${a + 0.18})`);
    g.fillStyle = vg;
    g.fillRect(0, 0, viewW, viewH);
    g.fillStyle = `rgba(255,20,20,${a * 0.4})`;
    g.fillRect(0, 0, viewW, viewH);
  }

  // --- aviso de perigo enquanto vasculha / com a mochila aberta
  if (game.items.open && game.items.threat !== 'none') {
    const chase = game.items.threat === 'chase';
    const a = (chase ? 0.35 : 0.2) + 0.12 * Math.sin(now / (chase ? 90 : 160));
    const vg = g.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.3, viewW / 2, viewH / 2, viewH * 0.85);
    vg.addColorStop(0, 'rgba(255,0,0,0)');
    vg.addColorStop(1, `rgba(255,0,0,${a})`);
    g.fillStyle = vg;
    g.fillRect(0, 0, viewW, viewH);
  }

  // --- minimapa
  if (game.minimapMode > 0) drawMinimap(game, g, baked, map.width * TILE, map.height * TILE);

  // --- fade de transição
  if (game.fadeAlpha > 0) {
    g.fillStyle = `rgba(0,0,0,${Math.min(1, game.fadeAlpha)})`;
    g.fillRect(0, 0, viewW, viewH);
  }
}

function drawMinimap(game: Game, g: CanvasRenderingContext2D, baked: HTMLCanvasElement, mapW: number, mapH: number) {
  const { viewW, viewH } = game;
  const large = game.minimapMode === 2;
  const maxW = large ? viewW * 0.55 : viewW * 0.17;
  const maxH = large ? viewH * 0.8 : viewH * 0.4;
  const scale = Math.min(maxW / mapW, maxH / mapH);
  const w = Math.floor(mapW * scale);
  const h = Math.floor(mapH * scale);
  const x = viewW - w - 4;
  const y = 4;

  g.save();
  g.fillStyle = 'rgba(0,0,0,0.75)';
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.globalAlpha = 0.92;
  g.imageSmoothingEnabled = true;
  g.drawImage(baked, 0, 0, mapW, mapH, x, y, w, h);
  g.globalAlpha = 1;

  // retângulo da câmera
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 1;
  g.strokeRect(
    Math.round(x + game.camera.x * scale) + 0.5,
    Math.round(y + game.camera.y * scale) + 0.5,
    Math.round(game.viewW * scale),
    Math.round(game.viewH * scale),
  );

  const blink = Math.floor(performance.now() / 300) % 2 === 0;

  // escadas do andar atual (amarelo = sobe, azul = desce)
  for (const portal of game.world.map(game.player.floor).portals) {
    const cx = x + (portal.rect.x + portal.rect.w / 2) * TILE * scale;
    const cy = y + (portal.rect.y + portal.rect.h / 2) * TILE * scale;
    g.fillStyle = '#1a1a22';
    g.fillRect(Math.round(cx) - 3, Math.round(cy) - 3, 6, 6);
    g.fillStyle = portal.direction === 'up' ? '#ffd23a' : '#5aa9ff';
    g.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 4, 4);
  }

  // radar do Gil: só aparece quando ele está te perseguindo
  const gil = game.story.gil;
  if (gil && gil.floor === game.player.floor && gil.alertLevel === 'chase' && blink) {
    g.fillStyle = '#ffb000';
    g.fillRect(Math.round(x + gil.x * scale) - 2, Math.round(y + gil.y * scale) - 2, 5, 5);
    g.fillStyle = '#ff2020';
    g.fillRect(Math.round(x + gil.x * scale) - 1, Math.round(y + gil.y * scale) - 1, 3, 3);
  }

  // rotas de fuga reveladas (verde = pronta) + pistas do Mapa de pistas (amarelo)
  for (const s of game.quests.clueSpots(game.player.floor)) {
    const mx = Math.round(x + (s.x + 0.5) * TILE * scale);
    const my = Math.round(y + (s.y + 0.5) * TILE * scale);
    g.fillStyle = '#0d3317';
    g.fillRect(mx - 3, my - 3, 6, 6);
    g.fillStyle = '#4ade80';
    g.fillRect(mx - 2, my - 2, 4, 4);
  }
  for (const s of game.items.clueSpots(game.player.floor)) {
    const mx = Math.round(x + (s.x + 0.5) * TILE * scale);
    const my = Math.round(y + (s.y + 0.5) * TILE * scale);
    g.fillStyle = '#1a1a22';
    g.fillRect(mx - 3, my - 3, 6, 6);
    g.fillStyle = '#ffd23a';
    g.fillRect(mx - 2, my - 2, 4, 4);
  }

  // jogador (pisca) com seta de direção — atualiza em tempo real
  const ppx = Math.round(x + game.player.x * scale);
  const ppy = Math.round(y + game.player.y * scale);
  if (blink) {
    g.fillStyle = '#ff3b3b';
    g.fillRect(ppx - 1, ppy - 1, 3, 3);
  }
  const dir = game.player.facing === 'left' ? [-3, 0] : game.player.facing === 'right' ? [3, 0] : game.player.facing === 'up' ? [0, -3] : [0, 3];
  g.fillStyle = '#ffffff';
  g.fillRect(ppx + dir[0] - 1, ppy + dir[1] - 1, 2, 2);
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  g.restore();
}
