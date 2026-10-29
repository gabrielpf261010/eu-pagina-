import { TILE, FLOOR_NAMES, type FloorId } from './constants';
import type { HudState, PlayerHud } from './types';
import { AlertSystem } from './core/AlertSystem';
import { loadSettings, saveSettings, type GameSettings } from './core/Config';
import { clearSave, hasSave as hasSaveFile, loadSaveData, saveGame as persistSave } from './core/SaveSystem';
import { Camera } from './engine/Camera';
import { GameAudio } from './engine/Audio';
import { EventBus } from './engine/EventBus';
import { Input } from './engine/Input';
import { renderGame } from './engine/Renderer';
import type { Entity } from './entities/Entity';
import { isHunter } from './entities/Hunter';
import { Player } from './entities/Player';
import { PuzzleSystem } from './quests/PuzzleSystem';
import { QuestSystem } from './quests/QuestSystem';
import { ROUTES } from './quests/quests';
import type { RouteId } from './quests/types';
import { ItemSystem } from './items/ItemSystem';
import { StoryController } from './story/StoryController';
import {
  InteractionSystem,
  createMessageInteractable,
  createPortalInteractable,
  type Interactable,
  type InteractionTarget,
} from './systems/interaction';
import { SeatSystem } from './systems/seating';
import { nearestFree } from './systems/pathfinding';
import { T } from './world/tiles';
import { World } from './world/World';

const FADE_TIME = 0.18;
const MESSAGE_TIME = 2200;

/**
 * Orquestrador do jogo: loop, entidades, câmera, interações, itens, história e HUD.
 *
 * Para estender (próximas etapas):
 *  - NPCs / inimigos / itens: classe que estende `Character` (ou `Entity`) + `game.addEntity()`.
 *    Inimigos que caçam o jogador implementam `Hunter` (entities/Hunter.ts) e já entram no
 *    aviso de perigo, no distrator e na proteção improvisada.
 *  - Coisas "usáveis" (portas, armários, terminais): `game.addInteractable()`.
 *  - Novos itens/receitas: items/catalog.ts. Novo loot: items/loot.ts.
 *  - Novos capítulos: criar outro controller em src/game/story e ligá-lo aqui.
 *  - Entrada: sempre via `game.input` (ações abstratas) — nunca leia teclado/touch direto.
 */
export class Game {
  readonly world = new World();
  readonly input = new Input();
  readonly audio = new GameAudio();
  readonly camera = new Camera();
  readonly events = new EventBus();
  readonly interactions = new InteractionSystem();
  readonly seats: SeatSystem;
  readonly entities: Entity[] = [];
  readonly player: Player;
  readonly items: ItemSystem;
  readonly quests: QuestSystem;
  readonly puzzles: PuzzleSystem;
  readonly story: StoryController;
  /** Alerta global 0–4 calculado a partir dos caçadores. */
  readonly alert: AlertSystem;
  settings: GameSettings;

  /** Estatísticas da partida (tela de vitória). */
  readonly stats = {
    itemsCollected: 0,
    crafted: 0,
    detections: 0,
    playTime: 0,
    /** Quantas vezes cada NPC capturou o jogador (chave: gil, wagner...). */
    capturesBy: {} as Record<string, number>,
    lastCaptor: '',
  };

  /** Vitória: rota usada, texto final e tempo da cutscene. */
  victory: { routeId: RouteId; name: string; ending: string; t: number } | null = null;
  private stepT = 0;
  private stepAlt = false;

  paused = true;
  viewW = 320;
  viewH = 180;
  zoom = 3;
  minimapMode: 0 | 1 | 2 = 1;
  fadeAlpha = 0;
  /** Se definido, a câmera acompanha esta entidade (cutscenes) em vez do jogador. */
  cameraFocus: Entity | null = null;
  onHud: ((h: HudState) => void) | null = null;
  /** Chamado quando o jogo encontra um erro irrecuperável (em vez de travar em tela preta). */
  onError: ((message: string) => void) | null = null;
  private errorCount = 0;

  private g: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private hudKey = '';
  private lastZone = '';
  private message: { text: string; until: number } | null = null;
  private transition: { phase: 'out' | 'in'; t: number; action: () => void } | null = null;
  private shakeT = 0;
  private shakeDur = 1;
  private shakeMag = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d', { alpha: false })!;

    const startMap = this.world.map('ground');
    this.player = new Player(
      'player',
      'ground',
      (startMap.spawn.x + 0.5) * TILE,
      (startMap.spawn.y + 0.5) * TILE,
    );
    this.addEntity(this.player);

    this.seats = new SeatSystem(this.world, (entity, kind, seat) => {
      this.events.emit(kind === 'sit' ? 'seated' : 'stood', { entityId: entity.id, seatId: seat.id });
      // à prova de ordem de inicialização: o callback só dispara após o construtor
      this.story?.onSeatChange(entity, kind);
    });
    this.registerWorldInteractables();

    // loot, mochila e recipientes
    this.items = new ItemSystem(this);
    this.items.registerInteractables();

    // missões, puzzles e rotas de fuga
    this.quests = new QuestSystem(this);
    this.puzzles = new PuzzleSystem(this);
    this.registerRouteMarkers();

    // capítulo 1: jogador sentado, professora e alunos
    this.story = new StoryController(this);
    this.story.setup();

    // segurança: jogador nunca pode nascer dentro de parede/móvel
    if (this.world.boxCollides(this.player.floor, this.player.x, this.player.y, 10, 10)) {
      const t = nearestFree(
        this.world,
        this.player.floor,
        Math.floor(this.player.x / TILE),
        Math.floor(this.player.y / TILE),
        12,
      );
      if (t) {
        this.player.x = (t.x + 0.5) * TILE;
        this.player.y = (t.y + 0.5) * TILE;
      }
    }

    // alerta global + configurações
    this.alert = new AlertSystem(this);
    this.settings = loadSettings();
    this.audio.setMuted(this.settings.muted);
    this.audio.setMusicEnabled(this.settings.music);
  }

  // ------------------------------------------------------------ configurações
  updateSettings(patch: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
    this.audio.setMuted(this.settings.muted);
    this.audio.setMusicEnabled(this.settings.music);
    if (!this.settings.music) this.audio.stopMusic();
    this.bumpUI();
  }

  // ------------------------------------------------------------ salvamento
  /** Salva a partida (só faz sentido após a aula começar a bagunça). */
  saveToDisk(): boolean {
    const ok = persistSave(this);
    this.showMessage(ok ? '💾 Jogo salvo!' : 'Não foi possível salvar neste navegador.', 2400);
    return ok;
  }

  hasSaveFile(): boolean {
    return hasSaveFile();
  }

  /** Continua de onde parou: entra direto em exploração e restaura tudo. */
  continueFromSave(): boolean {
    const d = loadSaveData();
    if (!d) return false;
    this.victory = null;
    this.story.enterExplorationDirect();
    this.player.floor = d.floor;
    this.player.x = d.x;
    this.player.y = d.y;
    this.items.restore({ inv: d.inv, containers: d.containers, doors: d.doors, progress: d.progress });
    this.quests.restore(d.quests);
    this.puzzles.restore(d.puzzles);
    this.stats.itemsCollected = d.stats.itemsCollected;
    this.stats.crafted = d.stats.crafted;
    this.stats.detections = d.stats.detections;
    this.stats.playTime = d.stats.playTime;
    this.snapCamera();
    this.showMessage('📂 Progresso carregado. Boa sorte!', 2600);
    this.bumpUI();
    return true;
  }

  /** Apaga o save e recomeça o capítulo do zero (volta à sala de aula). */
  newGame() {
    clearSave();
    this.victory = null;
    this.stats.itemsCollected = 0;
    this.stats.crafted = 0;
    this.stats.detections = 0;
    this.stats.playTime = 0;
    this.audio.stopMusic();
    this.story.setup();
    this.snapCamera();
    this.bumpUI();
  }

  /** Controles bloqueados: pausa, transição, cutscene, captura, janela, diário, puzzle ou vitória. */
  get inputLocked() {
    return (
      this.paused ||
      this.transition !== null ||
      this.story.controlsLocked ||
      this.items.open ||
      this.quests.journalOpen ||
      this.puzzles.open !== null ||
      this.victory !== null
    );
  }

  // ------------------------------------------------------------ interface (assinaturas para o React)
  private uiCbs = new Set<() => void>();

  subscribeUI(cb: () => void): () => void {
    this.uiCbs.add(cb);
    return () => {
      this.uiCbs.delete(cb);
    };
  }

  /** Avisa a interface que algo mudou (missões, puzzles, vitória). */
  bumpUI() {
    this.uiCbs.forEach((cb) => cb());
  }

  /** Marcadores das rotas no cenário: aparecem quando a rota é revelada. */
  private registerRouteMarkers() {
    for (const r of ROUTES) {
      const it: Interactable = {
        id: `route:${r.id}`,
        floor: r.floor,
        rect: { x: r.tx * TILE, y: r.ty * TILE, w: TILE, h: TILE },
        range: 13,
        priority: 2,
        label: () => {
          if (this.victory || !this.quests.revealed.has(r.id)) return null;
          return this.quests.routeBlocker(r.id) ? `Examinar ${r.markerName}` : r.escapeLabel;
        },
        interact: () => {
          if (this.victory || !this.quests.revealed.has(r.id)) return;
          const blocker = this.quests.routeBlocker(r.id);
          if (!blocker) {
            this.quests.tryEscape(r.id);
            return;
          }
          const opened = this.puzzles.tryOpen(r.puzzle);
          this.showMessage(opened.ok ? r.examine : `${r.markerName}: ${blocker}`, 3200);
        },
      };
      this.addInteractable(it);
    }
  }

  /** Vitória: pausa a perseguição e prepara a cutscene final. */
  startVictory(routeId: RouteId) {
    if (this.victory) return;
    const r = ROUTES.find((x) => x.id === routeId)!;
    for (const e of this.entities) if (isHunter(e)) e.freeze();
    this.quests.toggleJournal(false);
    this.items.close();
    this.puzzles.close();
    this.audio.alarmStop();
    this.audio.sting();
    this.audio.victory();
    this.cameraFocus = null;
    this.victory = { routeId, name: r.name, ending: r.ending, t: 0 };
    this.bumpUI();
  }

  addEntity(e: Entity) {
    this.entities.push(e);
  }

  removeEntity(e: Entity) {
    if (e.seat) this.seats.stand(e);
    const i = this.entities.indexOf(e);
    if (i >= 0) this.entities.splice(i, 1);
  }

  addInteractable(i: Interactable) {
    this.interactions.add(i);
  }

  /** Mensagem curta no HUD (toast). */
  showMessage(text: string, ms = MESSAGE_TIME) {
    this.message = { text, until: performance.now() + ms };
  }

  /** Tremor de tela (intensidade em pixels, duração em segundos). */
  shake(mag: number, dur: number) {
    this.shakeMag = mag;
    this.shakeDur = dur;
    this.shakeT = dur;
  }

  shakeOffset(): { x: number; y: number } {
    if (this.shakeT <= 0) return { x: 0, y: 0 };
    const m = this.shakeMag * (this.shakeT / this.shakeDur);
    return { x: Math.round((Math.random() * 2 - 1) * m), y: Math.round((Math.random() * 2 - 1) * m) };
  }

  /** Cria os interagíveis derivados do mapa: escadas, portão e cadeiras. */
  private registerWorldInteractables() {
    for (const floor of Object.keys(this.world.maps) as FloorId[]) {
      const map = this.world.map(floor);
      for (const portal of map.portals) this.addInteractable(createPortalInteractable(portal));

      for (let ty = 0; ty < map.height; ty++) {
        for (let tx = 0; tx < map.width; tx++) {
          const id = map.objects[ty * map.width + tx];
          // (portas trancadas e recipientes são registrados pelo ItemSystem)
          if (id === T.GATE) {
            this.addInteractable(
              createMessageInteractable({
                id: `gate:${floor}:${tx},${ty}`,
                floor,
                tx,
                ty,
                label: 'Abrir portão',
                message: 'O portão principal está trancado. Procure outra saída!',
              }),
            );
          }
        }
      }
    }
    for (const i of this.seats.allInteractables()) this.addInteractable(i);
  }

  // ------------------------------------------------------------ ciclo de vida
  start() {
    this.input.attach();
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    this.resize();
    this.snapCamera();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.input.detach();
    this.audio.alarmStop();
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('orientationchange', this.resize);
  }

  /**
   * Resolução adaptativa sem deformar o pixel art: o zoom é sempre um número inteiro de
   * pixels do DISPOSITIVO (considera devicePixelRatio), e a área visível do mapa
   * se ajusta ao formato da tela.
   */
  private resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const zoomDev = Math.max(2, Math.floor(Math.min((w * dpr) / 360, (h * dpr) / 216)));
    const cssZoom = zoomDev / dpr;
    this.zoom = cssZoom;
    this.viewW = Math.ceil(w / cssZoom);
    this.viewH = Math.ceil(h / cssZoom);
    this.canvas.width = this.viewW;
    this.canvas.height = this.viewH;
    this.canvas.style.width = `${this.viewW * cssZoom}px`;
    this.canvas.style.height = `${this.viewH * cssZoom}px`;
  };

  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    try {
      this.update(dt);
      renderGame(this, this.g);
      this.errorCount = 0;
    } catch (err) {
      // nunca congele em tela preta silenciosa: pula o frame e avisa após falhas seguidas
      console.error('[Escape do Gil] erro no loop:', err);
      if (++this.errorCount >= 30) {
        this.onError?.(err instanceof Error ? err.message : String(err));
        return; // para o loop em vez de travar o navegador
      }
    }
    this.input.endFrame();
    this.raf = requestAnimationFrame(this.loop);
  };

  // ------------------------------------------------------------ lógica
  /** Fade para preto, executa `action` no escuro e volta. Usado por escadas e pela história. */
  fadeThen(action: () => void) {
    if (this.transition) return;
    this.transition = { phase: 'out', t: 0, action };
  }

  /** Troca de andar com fade e reposiciona o jogador no tile informado. */
  changeFloor(floor: FloorId, tx: number, ty: number) {
    const from = this.player.floor;
    this.fadeThen(() => {
      this.player.floor = floor;
      this.player.x = (tx + 0.5) * TILE;
      this.player.y = (ty + 0.5) * TILE;
      this.snapCamera();
      this.events.emit('floorChanged', { from, to: floor });
    });
  }

  snapCamera() {
    const m = this.world.map(this.player.floor);
    this.camera.snap(this.player.x, this.player.y, this.viewW, this.viewH, m.width * TILE, m.height * TILE);
  }

  private currentTarget(): InteractionTarget | null {
    const p = this.player;
    if (p.seat) {
      // sentado: a única interação possível é levantar
      return { target: this.seats.interactableFor(p.seat), label: 'Levantar' };
    }
    return this.interactions.find(p, this);
  }

  private update(dt: number) {
    const tr = this.transition;
    if (tr) {
      tr.t += dt;
      if (tr.phase === 'out') {
        this.fadeAlpha = tr.t / FADE_TIME;
        if (tr.t >= FADE_TIME) {
          tr.action();
          tr.phase = 'in';
          tr.t = 0;
        }
      } else {
        this.fadeAlpha = 1 - tr.t / FADE_TIME;
        if (tr.t >= FADE_TIME) {
          this.transition = null;
          this.fadeAlpha = 0;
        }
      }
    }
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);

    // história (paciência, cutscene, contagem...) só avança com o jogo rodando
    if (!this.paused) this.story.update(dt);

    // janelas (mochila / recipientes): Esc, I ou E fecham; I abre a mochila. O mundo continua rodando.
    if (this.items.open && this.story.controlsLocked) this.items.close();
    if (!this.paused && this.transition === null && !this.story.controlsLocked) {
      if (this.items.open) {
        const container = this.items.ui.mode === 'container';
        if (
          this.input.wasPressed('pause') ||
          this.input.wasPressed('inventory') ||
          (container && this.input.wasPressed('interact'))
        ) {
          this.items.close();
        }
      } else if (this.input.wasPressed('inventory')) {
        this.items.openInventory();
      }
    }

    let target: InteractionTarget | null = null;
    if (!this.inputLocked) {
      if (this.input.wasPressed('map')) this.minimapMode = ((this.minimapMode + 1) % 3) as 0 | 1 | 2;
      target = this.currentTarget();
      if (target && this.input.wasPressed('interact')) {
        this.events.emit('interacted', { id: target.target.id });
        target.target.interact(this, this.player);
        target = this.currentTarget();
      }
    }

    if (!this.paused) {
      this.items.update(dt);
      for (const e of [...this.entities]) {
        if (e.global || e.floor === this.player.floor || e === this.player) e.update(dt, this);
      }
      for (let i = this.entities.length - 1; i >= 0; i--) {
        if (this.entities[i].done) this.entities.splice(i, 1);
      }
      if (!this.victory) {
        this.stats.playTime += dt;
        this.alert.update();
        if (this.story.phase === 'EXPLORACAO') {
          this.audio.startMusic(this.alert.level >= 2 ? 'chase' : 'explore');
        } else {
          this.audio.stopMusic();
        }
        const pl = this.player;
        if (pl.moving && !pl.seat) {
          this.stepT -= dt;
          if (this.stepT <= 0) {
            this.stepT = pl.running ? 0.22 : 0.34;
            this.stepAlt = !this.stepAlt;
            this.audio.step(this.stepAlt);
          }
        } else {
          this.stepT = 0;
        }
      } else {
        this.audio.stopMusic();
      }
    } else {
      this.audio.stopMusic();
    }

    const m = this.world.map(this.player.floor);
    const focus = this.cameraFocus ?? this.player;
    this.camera.follow(focus.x, focus.y, this.viewW, this.viewH, m.width * TILE, m.height * TILE, dt);

    this.updateHud(target);
  }

  private updateHud(target: InteractionTarget | null) {
    const p = this.player;
    const zone = this.world.zoneAt(p.floor, Math.floor(p.x / TILE), Math.floor(p.y / TILE));

    if (this.message && performance.now() > this.message.until) this.message = null;
    const msg = this.message?.text ?? null;
    const prompt = target?.label ?? null;
    const story = this.story.getHud();

    const items = this.items;
    const playerHud: PlayerHud = {
      energy: Math.round(p.energy),
      exhausted: p.exhausted,
      shield: items.progress.shield > 0,
      clues: items.progress.clues,
      bagUsed: items.inv.used,
      bagCap: items.inv.capacity,
      uiOpen: items.open,
    };
    const threat = items.threat;

    const key = `${p.floor}|${zone}|${prompt ?? ''}|${msg ?? ''}|${p.seat ? 1 : 0}|${threat}|${JSON.stringify(playerHud)}|${JSON.stringify(story)}`;
    if (zone !== this.lastZone) {
      this.lastZone = zone;
      this.events.emit('zoneChanged', { floor: p.floor, zone });
    }
    if (key !== this.hudKey) {
      this.hudKey = key;
      this.onHud?.({
        floorName: FLOOR_NAMES[p.floor],
        zoneName: zone,
        prompt,
        message: msg,
        seated: p.seat !== null,
        story,
        player: playerHud,
        threat,
      });
    }
  }
}
