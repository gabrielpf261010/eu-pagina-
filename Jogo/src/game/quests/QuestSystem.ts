import { TILE, type FloorId } from '../constants';
import type { Game } from '../Game';
import { EXPLORABLE_ZONES, QUESTS, QUEST_BY_ID, ROUTES, ROUTE_BY_ID } from './quests';
import type { PuzzleDef, QuestNotice, QuestState, RouteId } from './types';

/**
 * Diário de missões. As missões atualizam sozinhas: o sistema é avisado quando o jogador
 * coleta itens (`onItemsChanged`, chamado pelo ItemSystem a cada mudança), resolve um
 * enigma (`onPuzzleSolved`), visita um local (`onZone`) ou escapa (`tryEscape`).
 */
export class QuestSystem {
  state: Record<string, QuestState> = {};
  notices: QuestNotice[] = [];
  journalOpen = false;
  /** Rotas cujo marcador já apareceu no cenário. */
  revealed = new Set<RouteId>();
  /** Rota usada para escapar. */
  escaped: RouteId | null = null;
  mainAnnounced = false;

  private seq = 0;
  private visited = new Set<string>();

  constructor(private game: Game) {
    for (const q of QUESTS) {
      this.state[q.id] = {
        status: q.alwaysActive ? 'active' : 'locked',
        prog: Object.fromEntries(q.objectives.map((o) => [o.id, 0])),
      };
    }
  }

  // ------------------------------------------------------------ acesso
  def(id: string) {
    return QUEST_BY_ID.get(id);
  }

  status(id: string): QuestState['status'] {
    return this.state[id]?.status ?? 'locked';
  }

  progressOf(questId: string, objId: string): number {
    return this.state[questId]?.prog[objId] ?? 0;
  }

  objTarget(questId: string, objId: string): number {
    return QUEST_BY_ID.get(questId)?.objectives.find((o) => o.id === objId)?.target ?? 1;
  }

  objDone(questId: string, objId: string): boolean {
    return this.progressOf(questId, objId) >= this.objTarget(questId, objId);
  }

  questComplete(id: string): boolean {
    const q = QUEST_BY_ID.get(id);
    return !!q && q.objectives.every((o) => this.objDone(id, o.id));
  }

  // ------------------------------------------------------------ notificações
  private notice(kind: QuestNotice['kind'], title: string, text: string) {
    this.notices.push({ id: ++this.seq, kind, title, text, born: performance.now() });
    if (this.notices.length > 4) this.notices.shift();
  }

  /** Notificações ainda visíveis (usadas pela interface). */
  liveNotices(): QuestNotice[] {
    const now = performance.now();
    this.notices = this.notices.filter((n) => now - n.born < 4600);
    return this.notices;
  }

  // ------------------------------------------------------------ progresso
  private activate(id: string, silent = false) {
    const st = this.state[id];
    const q = QUEST_BY_ID.get(id);
    if (!st || !q || st.status !== 'locked') return;
    st.status = 'active';
    if (!silent) {
      this.notice('quest', 'Nova missão', q.title);
      this.game.audio.blip();
    }
    this.game.bumpUI();
  }

  /** Avança um objetivo em `n` passos. Retorna a quantidade efetivamente avançada. */
  advance(questId: string, objId: string, n = 1): number {
    const st = this.state[questId];
    const q = QUEST_BY_ID.get(questId);
    const obj = q?.objectives.find((o) => o.id === objId);
    if (!st || !q || !obj || st.status !== 'active') return 0;
    const target = obj.target ?? 1;
    if (st.prog[objId] >= target) return 0;
    const before = st.prog[objId];
    st.prog[objId] = Math.min(target, before + n);
    if (st.prog[objId] >= target && before < target) {
      this.notice('objective', `Objetivo concluído — ${q.title}`, obj.text);
      this.game.audio.pop();
      if (obj.reward) this.game.showMessage(`🏅 ${obj.reward}`);
    }
    this.game.bumpUI();
    return st.prog[objId] - before;
  }

  private setProgress(questId: string, objId: string, value: number) {
    const st = this.state[questId];
    if (!st || st.status !== 'active') return;
    const target = this.objTarget(questId, objId);
    if (value <= st.prog[objId]) return;
    this.advance(questId, objId, Math.min(target, value) - st.prog[objId]);
  }

  /** Marca um objetivo como concluído (idempotente). */
  completeObjective(questId: string, objId: string) {
    this.setProgress(questId, objId, this.objTarget(questId, objId));
  }

  // ------------------------------------------------------------ gatilhos do jogo
  /** Chamado a cada mudança de inventário (pegar, guardar, fabricar, usar). */
  onItemsChanged() {
    const inv = this.game.items.inv;
    if (this.status('r1') !== 'locked') {
      this.setProgress('r1', 'frags', Math.min(3, inv.count('frag_jardim')));
      if (inv.count('plano_jardim') > 0) this.completeObjective('r1', 'craft');
    }
    if (this.status('r2') !== 'locked' && inv.count('anotacao_biblioteca') > 0) {
      this.completeObjective('r2', 'note');
    }
    if (this.status('r3') !== 'locked') {
      const parts = (inv.count('modulo_sinal') > 0 ? 1 : 0) + (inv.count('placa_acesso') > 0 ? 1 : 0);
      this.setProgress('r3', 'parts', parts);
      if (inv.count('controle_terraco') > 0) this.completeObjective('r3', 'craft');
    }
    if (this.status('r4') !== 'locked') {
      const docs = ['doc_gil_1', 'doc_gil_2', 'doc_gil_3', 'doc_gil_4'].filter((d) => inv.count(d) > 0).length;
      this.setProgress('r4', 'docs', docs);
    }
    this.checkReveals();
  }

  /** Visitou uma zona nomeada. */
  onZone(zone: string) {
    const first = !this.visited.has(zone);
    this.visited.add(zone);
    if (first && EXPLORABLE_ZONES.has(zone)) this.advance('main', 'explore');

    if (zone === 'Biblioteca' && first) {
      this.activate('r2');
      this.completeObjective('r2', 'visit');
    }
    if (zone === 'Jardim Interno' && first) this.activate('r1');
    if ((zone === 'Laboratório de Informática' || zone === 'Secretaria Escolar') && first) this.activate('r3');
    this.checkReveals();
  }

  /** Resolveu um puzzle. */
  onPuzzleSolved(p: PuzzleDef) {
    switch (p.id) {
      case 'jardim':
        this.completeObjective('r1', 'puzzle');
        break;
      case 'estante':
        this.completeObjective('r2', 'puzzle');
        break;
      case 'terraco':
        this.completeObjective('r3', 'puzzle');
        this.completeObjective('r3', 'evade');
        break;
      case 'final':
        this.completeObjective('r4', 'puzzle');
        this.completeObjective('r4', 'door');
        this.completeObjective('r4', 'final');
        break;
    }
    this.checkReveals();
  }

  /** Missão principal anunciada quando o botão do pânico é apertado. */
  announceMain() {
    if (this.mainAnnounced) return;
    this.mainAnnounced = true;
    for (const q of QUESTS) if (!q.alwaysActive) this.activate(q.id, true);
    this.notice('quest', 'MISSÃO PRINCIPAL', 'ESCAPE DO GIL!');
    this.checkReveals();
    this.game.showMessage('📜 MISSÃO PRINCIPAL: ESCAPE DO GIL! (tecla J abre o diário)', 4200);
    this.game.audio.sting();
  }

  /** Primeiro vasculhamento (missão principal). */
  onLooted() {
    this.advance('main', 'loot');
  }

  private checkReveals() {
    for (const r of ROUTES) {
      if (this.revealed.has(r.id)) continue;
      const ready =
        r.id === 'jardim'
          ? this.objDone('r1', 'craft')
          : r.id === 'biblioteca'
            ? this.objDone('r2', 'note') && this.objDone('r2', 'visit')
            : r.id === 'terraco'
              ? this.objDone('r3', 'craft')
              : this.progressOf('r4', 'docs') >= 4;
      if (ready) {
        this.revealed.add(r.id);
        this.completeObjective(r.questId, 'reveal');
        this.notice('info', 'Local revelado no mapa', r.markerName);
        this.game.audio.beep();
      }
    }
  }

  // ------------------------------------------------------------ fuga
  /** Pode escapar por esta rota? Retorna null quando sim, ou o texto do que falta. */
  routeBlocker(id: RouteId): string | null {
    const inv = this.game.items.inv;
    switch (id) {
      case 'jardim':
        if (inv.count('plano_jardim') === 0) return 'Você precisa do Plano do Jardim (3 fragmentos + aba FABRICAR).';
        if (!this.objDone('r1', 'puzzle')) return 'Resolva o puzzle dos símbolos na pedra.';
        return null;
      case 'biblioteca':
        if (inv.count('anotacao_biblioteca') === 0) return 'Procure a anotação esquecida nas estantes da biblioteca.';
        if (!this.objDone('r2', 'puzzle')) return 'Resolva o enigma da sequência de livros.';
        if (inv.count('chave_biblioteca') === 0) return 'A passagem precisa da Chave da Biblioteca.';
        return null;
      case 'terraco':
        if (inv.count('controle_terraco') === 0) return 'Fabricar o Controle do Terraço (módulo de sinal + placa de acesso).';
        if (!this.objDone('r3', 'puzzle')) return 'Descubra o código do painel de acesso.';
        return null;
      case 'segredo':
        if (this.progressOf('r4', 'docs') < 4) return `Documentos do Gil: ${this.progressOf('r4', 'docs')}/4.`;
        if (!this.objDone('r4', 'final')) return 'Resolva os três enigmas do terminal.';
        return null;
    }
  }

  /** Tenta escapar por uma rota. */
  tryEscape(id: RouteId): { ok: boolean; text: string } {
    const blocker = this.routeBlocker(id);
    const r = ROUTE_BY_ID.get(id);
    if (!r) return { ok: false, text: 'Rota desconhecida.' };
    if (blocker) {
      this.game.audio.thud();
      return { ok: false, text: blocker };
    }
    if (this.escaped) return { ok: false, text: 'Você já escapou!' };
    this.escaped = id;
    this.completeObjective(r.questId, 'escape');
    this.completeObjective('main', 'escape');
    this.game.startVictory(id);
    return { ok: true, text: r.ending };
  }

  /** Pontos das rotas já prontas para fugir (marcados no minimapa). */
  clueSpots(floor: FloorId): Array<{ x: number; y: number }> {
    if (this.escaped) return [];
    return ROUTES.filter(
      (r) => r.floor === floor && this.revealed.has(r.id) && !this.routeBlocker(r.id),
    ).map((r) => ({ x: r.tx, y: r.ty }));
  }

  // ------------------------------------------------------------ serialização (save)
  serialize() {
    return {
      quests: Object.fromEntries(
        Object.entries(this.state).map(([id, s]) => [id, { status: s.status, prog: { ...s.prog } }]),
      ),
      revealed: [...this.revealed],
      escaped: this.escaped,
      mainAnnounced: this.mainAnnounced,
      visited: [...this.visited],
    };
  }

  restore(d: {
    quests: Record<string, { status: string; prog: Record<string, number> }>;
    revealed: string[];
    escaped: string | null;
    mainAnnounced: boolean;
    visited: string[];
  }) {
    for (const [id, s] of Object.entries(d.quests)) {
      const cur = this.state[id];
      if (!cur) continue;
      cur.status = s.status as QuestState['status'];
      cur.prog = { ...cur.prog, ...s.prog };
    }
    this.revealed = new Set(d.revealed as RouteId[]);
    this.escaped = d.escaped as RouteId | null;
    this.mainAnnounced = d.mainAnnounced;
    this.visited = new Set(d.visited);
    this.notices = [];
    this.journalOpen = false;
  }

  // ------------------------------------------------------------ interface
  toggleJournal(force?: boolean) {
    this.journalOpen = force ?? !this.journalOpen;
    this.game.input.releaseAll();
    if (this.journalOpen) this.game.audio.blip();
    this.game.bumpUI();
  }

  update() {
    this.liveNotices();
    if (this.journalOpen && this.game.story.controlsLocked) this.toggleJournal(false);
  }

  /** Posição do marcador em pixels. */
  markerPixel(id: RouteId): { x: number; y: number } {
    const r = ROUTE_BY_ID.get(id)!;
    return { x: (r.tx + 0.5) * TILE, y: (r.ty + 0.5) * TILE };
  }
}
