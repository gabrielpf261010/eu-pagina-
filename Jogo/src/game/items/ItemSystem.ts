import { TILE, type FloorId } from '../constants';
import { Decoy } from '../entities/Decoy';
import { isHunter } from '../entities/Hunter';
import { RopeMarker } from '../entities/RopeMarker';
import type { Game } from '../Game';
import type { Interactable } from '../systems/interaction';
import { hasLineOfSight } from '../systems/vision';
import type { Facing, Point } from '../types';
import { RECIPES, getItem } from './catalog';
import type { Container } from './Container';
import { Inventory } from './Inventory';
import { buildContainers } from './loot';
import type { ActionResult } from './types';

export type ThreatLevel = 'none' | 'near' | 'chase';

/** Muro dos fundos (cerca leste, atrás da Casa do Zelador) onde o kit de escalada abre uma rota. */
export const CLIMB_SPOT = { floor: 'ground' as FloorId, tx: 136, ty: 76 };

/** Porta trancada (id da sala) → cartão que a destranca. */
const DOOR_CARDS: Record<string, string> = { gas: 'cartao_gas', '1-sala-25': 'cartao_sala25' };

const BAG_SLOTS = 12;
const DECOY_RANGE_TILES = 6;
const NEAR_DISTANCE = 190;

export interface UiState {
  mode: 'none' | 'inventory' | 'container';
  tab: 'bag' | 'craft';
  container: Container | null;
  searchT: number;
  searchDur: number;
}

interface DoorGroup {
  roomId: string;
  roomName: string;
  floor: FloorId;
  tiles: Point[];
  requires: string | null;
  unlocked: boolean;
  interactables: Interactable[];
}

const ok = (text: string, close = false): ActionResult => ({ ok: true, text, close });
const fail = (text: string): ActionResult => ({ ok: false, text });

const FACING: Record<Facing, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * Loot, mochila, recipientes, fabricação e uso de itens.
 *
 * Regras de segurança (sem duplicar nem perder itens):
 *  - toda transferência calcula quanto cabe ANTES de mexer em qualquer lado;
 *  - fabricação é transacional (veja Inventory.tryCraft);
 *  - cada recipiente é um objeto único: itens retirados não voltam ao fechar/abrir.
 * O mundo NÃO pausa com a janela aberta — o Gil continua patrulhando.
 */
export class ItemSystem {
  readonly inv = new Inventory(BAG_SLOTS);
  readonly containers: Container[];
  ui: UiState = { mode: 'none', tab: 'bag', container: null, searchT: 0, searchDur: 0 };
  threat: ThreatLevel = 'none';

  /** Progresso desbloqueado nesta partida. */
  readonly progress = {
    climb: false,
    clues: false,
    shield: 0,
    secrets: new Set<string>(),
  };

  private listeners = new Set<() => void>();
  private doors: DoorGroup[] = [];
  private decoyId = 0;

  constructor(private game: Game) {
    this.containers = buildContainers(game.world, (Math.random() * 2 ** 31) | 0);
  }

  get open() {
    return this.ui.mode !== 'none';
  }

  get searching() {
    const c = this.ui.container;
    return this.ui.mode === 'container' && !!c && !c.searched;
  }

  // ------------------------------------------------------------ assinatura (UI React)
  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  notify() {
    this.listeners.forEach((cb) => cb());
  }

  // ------------------------------------------------------------ interagíveis do mapa
  registerInteractables() {
    const g = this.game;

    for (const c of this.containers) {
      g.addInteractable({
        id: `box:${c.id}`,
        floor: c.floor,
        rect: c.rect,
        range: 11,
        priority: 0.5,
        label: () => (c.searched ? (c.inv.isEmpty ? null : 'Abrir') : 'Vasculhar'),
        interact: () => this.openContainer(c),
      });
    }

    // portas trancadas (destrancam com cartão de missão)
    for (const floor of Object.keys(g.world.maps) as FloorId[]) {
      const map = g.world.map(floor);
      for (const room of map.rooms) {
        const tiles = room.doors.filter((d) => map.objects[d.y * map.width + d.x] === 103);
        if (tiles.length === 0) continue;
        const group: DoorGroup = {
          roomId: room.id,
          roomName: room.name,
          floor,
          tiles,
          requires: DOOR_CARDS[room.id] ?? null,
          unlocked: false,
          interactables: [],
        };
        for (const t of tiles) {
          const it: Interactable = {
            id: `lock:${floor}:${t.x},${t.y}`,
            floor,
            rect: { x: t.x * TILE, y: t.y * TILE, w: TILE, h: TILE },
            range: 11,
            priority: 1,
            label: () => (group.requires && this.inv.count(group.requires) > 0 ? 'Usar cartão' : 'Abrir porta'),
            interact: () => this.tryOpenDoor(group),
          };
          group.interactables.push(it);
          g.addInteractable(it);
        }
        this.doors.push(group);
      }
    }

    // muro dos fundos
    g.addInteractable({
      id: 'climb-spot',
      floor: CLIMB_SPOT.floor,
      rect: { x: CLIMB_SPOT.tx * TILE, y: CLIMB_SPOT.ty * TILE, w: TILE, h: TILE },
      range: 13,
      priority: 1,
      label: () => (this.progress.climb ? 'Examinar a corda' : 'Examinar o muro'),
      interact: () => this.interactClimbSpot(),
    });
  }

  // ------------------------------------------------------------ janelas
  openInventory() {
    if (this.open) return;
    this.ui = { mode: 'inventory', tab: 'bag', container: null, searchT: 0, searchDur: 0 };
    this.game.input.releaseAll();
    this.game.audio.blip();
    this.notify();
  }

  openContainer(c: Container) {
    if (this.open) return;
    const first = !c.searched;
    this.ui = { mode: 'container', tab: 'bag', container: c, searchT: 0, searchDur: first ? c.searchTime : 0 };
    this.game.input.releaseAll();
    this.game.audio.blip();
    if (first) this.game.story.onContainerOpened(c);
    this.notify();
  }

  close() {
    if (!this.open) return;
    this.ui = { mode: 'none', tab: 'bag', container: null, searchT: 0, searchDur: 0 };
    this.game.input.releaseAll();
    this.notify();
  }

  setTab(tab: 'bag' | 'craft') {
    this.ui = { ...this.ui, tab };
    this.notify();
  }

  // ------------------------------------------------------------ atualização
  update(dt: number) {
    this.updateThreat();
    const c = this.ui.container;
    if (this.searching && c) {
      this.ui.searchT += dt;
      if (this.ui.searchT >= this.ui.searchDur) {
        this.ui.searchT = this.ui.searchDur;
        c.searched = true;
        this.game.audio.pop();
      }
      this.notify();
    }
  }

  /** Aviso de perigo: algum inimigo perto ou perseguindo. */
  private updateThreat() {
    const p = this.game.player;
    let level: ThreatLevel = 'none';
    for (const e of this.game.entities) {
      if (!isHunter(e) || e.floor !== p.floor) continue;
      if (e.alertLevel === 'chase') {
        level = 'chase';
        break;
      }
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 100 || (d < NEAR_DISTANCE && hasLineOfSight(this.game.world, p.floor, e.x, e.y - 4, p.x, p.y - 4))) {
        level = 'near';
      }
    }
    if (level !== this.threat) {
      this.threat = level;
      if (this.open) this.notify();
    }
  }

  // ------------------------------------------------------------ transferências
  private transfer(from: Inventory, index: number, to: Inventory, want?: number): number {
    const stack = from.slots[index];
    if (!stack) return 0;
    const n = Math.min(want ?? stack.qty, stack.qty, to.spaceFor(stack.id));
    if (n <= 0) return 0;
    const id = stack.id;
    const removed = from.removeAt(index, n);
    const left = to.add(id, removed);
    if (left > 0) from.add(id, left); // segurança: nunca perde itens
    return removed - left;
  }

  takeFromBox(index: number): ActionResult {
    const box = this.ui.container;
    const stack = box?.inv.slots[index];
    if (!box || !stack) return fail('Nada para pegar aqui.');
    const def = getItem(stack.id);
    const total = stack.qty;
    const moved = this.transfer(box.inv, index, this.inv);
    this.notify();
    if (moved === 0) return fail('Mochila cheia!');
    this.game.audio.pop();
    if (moved < total) return fail(`Mochila cheia! Você pegou só ${moved} de ${total} ${def.name}.`);
    return ok(`Você pegou ${moved > 1 ? moved + '× ' : ''}${def.name}.`);
  }

  takeAll(): ActionResult {
    const box = this.ui.container;
    if (!box) return fail('Nenhum recipiente aberto.');
    let moved = 0;
    let left = 0;
    for (let i = 0; i < box.inv.slots.length; i++) {
      const s = box.inv.slots[i];
      if (!s) continue;
      const total = s.qty;
      const n = this.transfer(box.inv, i, this.inv);
      moved += n;
      left += total - n;
    }
    if (moved > 0) {
      this.game.stats.itemsCollected += moved;
      this.game.quests.onLooted();
    }
    this.notify();
    if (moved === 0 && left === 0) return fail('O recipiente está vazio.');
    if (moved === 0) return fail('Mochila cheia!');
    this.game.audio.pop();
    return left > 0 ? fail(`Mochila cheia! Pegou ${moved} item(ns); ${left} ficaram no recipiente.`) : ok(`Você pegou tudo (${moved} item(ns)).`);
  }

  storeToBox(bagIndex: number): ActionResult {
    const box = this.ui.container;
    const stack = this.inv.slots[bagIndex];
    if (!box || !stack) return fail('Nada para guardar.');
    const def = getItem(stack.id);
    const moved = this.transfer(this.inv, bagIndex, box.inv);
    this.notify();
    if (moved === 0) return fail('O recipiente está cheio!');
    this.game.audio.pop();
    return ok(`Você guardou ${def.name} no recipiente.`);
  }

  // ------------------------------------------------------------ mochila
  moveSlot(a: number, b: number): ActionResult {
    this.inv.move(a, b);
    this.notify();
    return ok('Item movido.');
  }

  discardSlot(index: number): ActionResult {
    const stack = this.inv.slots[index];
    if (!stack) return fail('Espaço vazio.');
    const def = getItem(stack.id);
    if (def.keyItem) return fail(`${def.name} é um item-chave e não pode ser descartado.`);
    this.inv.removeAt(index, stack.qty);
    this.notify();
    this.game.audio.thud();
    return ok(`Você descartou ${stack.qty > 1 ? stack.qty + '× ' : ''}${def.name}.`);
  }

  combine(a: number, b: number): ActionResult {
    if (a === b) return fail('Escolha outro item para combinar.');
    const sa = this.inv.slots[a];
    const sb = this.inv.slots[b];
    if (!sa || !sb) return fail('Escolha dois itens para combinar.');
    const candidates = RECIPES.filter(
      (r) => r.ingredients.some((i) => i.id === sa.id) && r.ingredients.some((i) => i.id === sb.id),
    );
    if (candidates.length === 0) return fail('Esses itens não combinam.');
    let missing = false;
    for (const r of candidates) {
      const res = this.inv.tryCraft(r);
      if (res === 'ok') {
        this.notify();
        this.game.audio.craft();
        return ok(`Combinação feita: ${getItem(r.result.id).icon} ${getItem(r.result.id).name}!`);
      }
      if (res === 'space') return fail('Mochila cheia! Libere um espaço para combinar.');
      missing = true;
    }
    return missing ? fail('Faltam ingredientes. Veja a aba FABRICAR.') : fail('Esses itens não combinam.');
  }

  craft(recipeId: string): ActionResult {
    const r = RECIPES.find((x) => x.id === recipeId);
    if (!r) return fail('Receita desconhecida.');
    const res = this.inv.tryCraft(r);
    this.notify();
    if (res === 'ingredients') return fail('Faltam ingredientes.');
    if (res === 'space') return fail('Mochila cheia! Libere um espaço antes de fabricar.');
    const def = getItem(r.result.id);
    this.game.audio.craft();
    return ok(`Você fabricou: ${def.icon} ${def.name}!`);
  }

  // ------------------------------------------------------------ uso dos itens
  useSlot(index: number): ActionResult {
    const stack = this.inv.slots[index];
    if (!stack) return fail('Espaço vazio.');
    const def = getItem(stack.id);
    const use = def.use;
    if (!use) return fail(`${def.name} não tem uso direto. Tente combiná-lo com outro item.`);
    const g = this.game;
    const p = g.player;

    switch (use.type) {
      case 'energy': {
        if (p.energy >= 99) return fail('Sua energia já está cheia.');
        this.inv.removeAt(index, 1);
        p.restoreEnergy(use.amount);
        g.audio.pop();
        this.notify();
        return ok(`${def.name}: +${use.amount} de energia!`);
      }
      case 'decoy': {
        this.inv.removeAt(index, 1);
        this.placeDecoy();
        g.audio.beep();
        this.notify();
        return ok('Você lançou o distrator! Os inimigos vão investigar o barulho.', true);
      }
      case 'shield': {
        if (this.progress.shield > 0) return fail('Você já está usando uma proteção.');
        this.inv.removeAt(index, 1);
        this.progress.shield = 1;
        g.audio.pop();
        this.notify();
        return ok('Proteção vestida! Ela segura uma captura do Gil.');
      }
      case 'clues': {
        this.inv.removeAt(index, 1);
        this.progress.clues = true;
        if (g.minimapMode === 0) g.minimapMode = 1;
        g.audio.sting();
        this.notify();
        return ok('Pistas marcadas no minimapa e no cenário!');
      }
      case 'climb': {
        const res = this.tryClimbSetup(index);
        return res;
      }
      case 'card': {
        return this.tryUnlockNear(use.lock, stack.id, index);
      }
      case 'lore': {
        this.progress.secrets.add(use.flag);
        g.audio.blip();
        this.notify();
        return ok(use.text);
      }
    }
  }

  private placeDecoy() {
    const g = this.game;
    const p = g.player;
    const [fx, fy] = FACING[p.facing];
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    let cx = tx;
    let cy = ty;
    for (let i = 1; i <= DECOY_RANGE_TILES; i++) {
      const nx = tx + fx * i;
      const ny = ty + fy * i;
      if (g.world.isSolidTile(p.floor, nx, ny)) break;
      cx = nx;
      cy = ny;
    }
    g.addEntity(new Decoy(`decoy-${this.decoyId++}`, p.floor, (cx + 0.5) * TILE, (cy + 0.5) * TILE));
  }

  // ------------------------------------------------------------ rota de escalada
  private nearClimbSpot(): boolean {
    const p = this.game.player;
    if (p.floor !== CLIMB_SPOT.floor) return false;
    return Math.hypot(p.x - (CLIMB_SPOT.tx + 0.5) * TILE, p.y - (CLIMB_SPOT.ty + 0.5) * TILE) < 40;
  }

  private tryClimbSetup(slotIndex: number): ActionResult {
    if (this.progress.climb) return fail('A rota de escalada já está pronta.');
    if (!this.nearClimbSpot()) {
      return fail('Leve o kit até um muro alto. Procure nos fundos da escola, atrás da Casa do Zelador.');
    }
    this.inv.removeAt(slotIndex, 1);
    this.unlockClimb();
    return ok('Você prendeu o gancho no muro! Rota de escalada desbloqueada.', true);
  }

  private unlockClimb() {
    this.progress.climb = true;
    this.game.addEntity(new RopeMarker('rope', CLIMB_SPOT.floor, CLIMB_SPOT.tx, CLIMB_SPOT.ty));
    this.game.audio.sting();
    this.game.showMessage('Rota de escalada desbloqueada! (a fuga será liberada nas próximas versões)', 3600);
    this.notify();
  }

  private interactClimbSpot() {
    const g = this.game;
    if (this.progress.climb) {
      g.showMessage('A corda está firme. A fuga por aqui será liberada nas próximas versões!');
      return;
    }
    const idx = this.inv.slots.findIndex((s) => s?.id === 'kit_escalada');
    if (idx >= 0) {
      this.inv.removeAt(idx, 1);
      this.unlockClimb();
      return;
    }
    g.showMessage('O muro é alto demais. Talvez com algum equipamento de escalada...');
  }

  // ------------------------------------------------------------ portas com cartão
  private tryOpenDoor(group: DoorGroup) {
    const g = this.game;
    if (group.requires && this.inv.count(group.requires) > 0) {
      this.inv.removeId(group.requires, 1);
      this.unlockDoor(group);
      return;
    }
    g.showMessage(group.requires ? 'Trancada. Parece precisar de um cartão de acesso.' : 'A porta está trancada.');
  }

  private unlockDoor(group: DoorGroup) {
    if (group.unlocked) return;
    group.unlocked = true;
    for (const t of group.tiles) this.game.world.unlockDoor(group.floor, t.x, t.y);
    for (const it of group.interactables) this.game.interactions.remove(it);
    this.game.world.rebake(group.floor);
    this.game.audio.sting();
    this.game.showMessage(`Porta destrancada: ${group.roomName}!`, 3000);
    this.notify();
  }

  private tryUnlockNear(lock: string, cardId: string, slotIndex: number): ActionResult {
    const p = this.game.player;
    const group = this.doors.find(
      (d) =>
        d.roomId === lock &&
        !d.unlocked &&
        d.floor === p.floor &&
        d.tiles.some((t) => Math.hypot(p.x - (t.x + 0.5) * TILE, p.y - (t.y + 0.5) * TILE) < 36),
    );
    if (!group) return fail('Aproxime-se da porta trancada correspondente para usar este cartão.');
    this.inv.removeAt(slotIndex, 1);
    void cardId;
    this.unlockDoor(group);
    return ok(`Porta destrancada: ${group.roomName}!`, true);
  }

  // ------------------------------------------------------------ proteção improvisada
  /** Chamado quando o Gil alcança o jogador. Retorna true se a proteção absorveu a captura. */
  consumeShield(): boolean {
    if (this.progress.shield <= 0) return false;
    this.progress.shield--;
    this.notify();
    return true;
  }

  // ------------------------------------------------------------ pistas
  /** Tiles marcados pelo "Mapa de pistas": rota de escalada, portas com cartão e itens raros ainda no mapa. */
  clueSpots(floor: FloorId): Point[] {
    if (!this.progress.clues) return [];
    const out: Point[] = [];
    if (!this.progress.climb && CLIMB_SPOT.floor === floor) out.push({ x: CLIMB_SPOT.tx, y: CLIMB_SPOT.ty });
    for (const d of this.doors) if (!d.unlocked && d.floor === floor) out.push(d.tiles[0]);
    for (const c of this.containers) {
      if (c.floor !== floor) continue;
      const special = c.inv.slots.some((s) => {
        if (!s) return false;
        const d = getItem(s.id);
        return d.rarity === 'lendario' || d.category === 'cartao';
      });
      if (special) out.push({ x: c.tx, y: c.ty });
    }
    return out;
  }

  // ------------------------------------------------------------ serialização (save)
  serialize() {
    const pack = (slots: Array<{ id: string; qty: number } | null>) =>
      slots.filter((s) => s !== null).map((s) => ({ id: (s as { id: string }).id, qty: (s as { qty: number }).qty }));
    return {
      inv: pack(this.inv.slots),
      containers: this.containers.map((c) => ({ id: c.id, searched: c.searched, items: pack(c.inv.slots) })),
      doors: this.doors.filter((d) => d.unlocked).map((d) => d.roomId),
      progress: {
        climb: this.progress.climb,
        clues: this.progress.clues,
        shield: this.progress.shield,
        secrets: [...this.progress.secrets],
      },
    };
  }

  restore(data: {
    inv: Array<{ id: string; qty: number }>;
    containers: Array<{ id: string; searched: boolean; items: Array<{ id: string; qty: number }> }>;
    doors: string[];
    progress: { climb: boolean; clues: boolean; shield: number; secrets: string[] };
  }) {
    this.close();
    for (const s of this.inv.slots) if (s) this.inv.removeAt(this.inv.slots.indexOf(s), s.qty);
    for (const it of data.inv) this.inv.add(it.id, it.qty);
    for (const c of data.containers) {
      const box = this.containers.find((x) => x.id === c.id);
      if (!box) continue;
      box.searched = c.searched;
      for (const s of box.inv.slots) if (s) box.inv.removeAt(box.inv.slots.indexOf(s), s.qty);
      for (const it of c.items) box.inv.add(it.id, it.qty);
    }
    for (const roomId of data.doors) {
      const g = this.doors.find((d) => d.roomId === roomId);
      if (g && !g.unlocked) {
        g.unlocked = true;
        for (const t of g.tiles) this.game.world.unlockDoor(g.floor, t.x, t.y);
        for (const it of g.interactables) this.game.interactions.remove(it);
        this.game.world.rebake(g.floor);
      }
    }
    this.progress.climb = data.progress.climb;
    this.progress.clues = data.progress.clues;
    this.progress.shield = data.progress.shield;
    this.progress.secrets = new Set(data.progress.secrets);
    if (data.progress.climb) {
      this.game.addEntity(new RopeMarker('rope', CLIMB_SPOT.floor, CLIMB_SPOT.tx, CLIMB_SPOT.ty));
    }
    this.notify();
  }

  unlockedDoors(): string[] {
    return this.doors.filter((d) => d.unlocked).map((d) => d.roomId);
  }
}
