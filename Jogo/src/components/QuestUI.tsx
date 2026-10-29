import { useEffect, useState } from 'react';
import type { Game } from '../game/Game';
import { ALL_PUZZLES } from '../game/quests/PuzzleSystem';
import { QUESTS, ROUTES } from '../game/quests/quests';
import type { QuestNotice } from '../game/quests/types';

const BTN =
  'min-h-11 cursor-pointer rounded border-b-4 px-3 py-2 font-mono text-xs font-bold tracking-wide uppercase transition active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40';

function useGameTick(game: Game) {
  const [, bump] = useState(0);
  useEffect(() => game.subscribeUI(() => bump((n) => n + 1)), [game]);
}

/** Avisos discretos no canto ("Objetivo concluído..."). */
export function QuestNotices({ game }: { game: Game }) {
  useGameTick(game);
  const list = game.quests.liveNotices();
  if (list.length === 0 || game.victory) return null;
  return (
    <div className="pointer-events-none absolute top-1/2 left-2 z-20 w-[min(60vw,300px)] -translate-y-1/2 space-y-1.5 font-mono">
      {list.map((n) => (
        <div
          key={n.id}
          className={`animate-[subtitle-in_0.2s_ease-out] rounded border-l-4 bg-black/80 px-2.5 py-1.5 text-[11px] ring-1 ring-white/10 sm:text-xs ${
            n.kind === 'quest' ? 'border-amber-400 text-amber-100' : n.kind === 'objective' ? 'border-emerald-400 text-emerald-100' : 'border-sky-400 text-sky-100'
          }`}
        >
          <div className="text-[9px] font-bold tracking-widest uppercase opacity-70 sm:text-[10px]">{n.title}</div>
          {n.text}
        </div>
      ))}
    </div>
  );
}

function Bar({ v, max, color }: { v: number; max: number; color: string }) {
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-800">
      <div className="h-full transition-[width]" style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: color }} />
    </div>
  );
}

/** Diário de missões (tecla J / botão 📜). */
export function JournalUI({ game }: { game: Game }) {
  useGameTick(game);
  if (!game.quests.journalOpen) return null;
  const q = game.quests;

  const statusStyle = (s: string) =>
    s === 'done'
      ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
      : s === 'active'
        ? 'border-amber-500 bg-amber-900/20 text-amber-200'
        : 'border-zinc-700 bg-black/30 text-zinc-500';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-2 font-mono text-zinc-100">
      <div className="pointer-events-auto flex max-h-[95vh] w-[min(98vw,760px)] flex-col overflow-hidden rounded-lg border-2 border-amber-700/70 bg-zinc-900/96 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-zinc-700 bg-black/40 px-3 py-1.5">
          <h2 className="flex-1 text-sm font-black tracking-wider text-amber-300 uppercase">📜 Diário de Missões</h2>
          <button onClick={() => game.quests.toggleJournal(false)} className={`${BTN} border-zinc-950 bg-zinc-700 text-zinc-100`}>
            Fechar
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ touchAction: 'pan-y' }}>
          {QUESTS.map((quest) => {
            const st = q.status(quest.id);
            const done = quest.objectives.filter((o) => q.objDone(quest.id, o.id)).length;
            const total = quest.objectives.length;
            return (
              <section key={quest.id} className={`rounded border-2 p-2.5 ${statusStyle(st)}`}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="flex-1 text-sm font-black">{quest.title}</h3>
                  <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                    {st === 'done' ? 'Concluída' : st === 'active' ? 'Ativa' : 'Bloqueada'}
                  </span>
                  <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                    {quest.difficulty}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug opacity-90">{quest.description}</p>
                <ul className="mt-2 space-y-1">
                  {quest.objectives.map((o) => {
                    const cur = Math.min(q.progressOf(quest.id, o.id), o.target ?? 1);
                    const target = o.target ?? 1;
                    const ok = cur >= target;
                    return (
                      <li key={o.id} className={`flex items-center gap-2 rounded px-1.5 py-1 text-[11px] ${ok ? 'bg-emerald-900/25' : 'bg-black/25'}`}>
                        <span>{ok ? '✅' : st === 'locked' ? '🔒' : '⬜'}</span>
                        <span className="flex-1">{o.text}</span>
                        {target > 1 && (
                          <span className="font-bold">
                            {cur}/{target}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2">
                  <div className="text-[10px] font-bold tracking-wider uppercase opacity-70">
                    Progresso {done}/{total}
                  </div>
                  <Bar v={done} max={total} color={st === 'done' ? '#34d399' : '#fbbf24'} />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] opacity-80">
                  {[...quest.rewards, ...quest.objectives.map((o) => o.reward).filter(Boolean)].map((rw, i) => (
                    <span key={i} className="rounded bg-black/40 px-1.5 py-0.5">
                      🎁 {rw}
                    </span>
                  ))}
                </div>
              </section>
            );
          })}

          <section className="rounded border-2 border-zinc-700 bg-black/30 p-2.5">
            <h3 className="text-xs font-black tracking-wider text-sky-300 uppercase">🧩 Enigmas</h3>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {ALL_PUZZLES.map((p) => {
                const ok = game.puzzles.isSolved(p.id);
                const route = ROUTES.find((r) => r.puzzle === p.id);
                return (
                  <div key={p.id} className={`rounded px-2 py-1 text-[11px] ${ok ? 'bg-emerald-900/25' : 'bg-black/30'}`}>
                    {ok ? '✅' : '⬜'} {p.title}
                    {route && <span className="block text-[9px] opacity-70">{route.name}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Painel dos puzzles das rotas. */
export function PuzzleUI({ game }: { game: Game }) {
  useGameTick(game);
  const p = game.puzzles.open;
  if (!p) return null;
  const ps = game.puzzles;
  const wrong = ps.wrongT > 0;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-2 font-mono text-zinc-100">
      <div className="pointer-events-auto w-[min(96vw,520px)] overflow-hidden rounded-lg border-2 border-sky-600/70 bg-zinc-900/96 shadow-2xl">
        <div className="border-b border-zinc-700 bg-black/40 px-3 py-1.5">
          <h2 className="text-sm font-black tracking-wider text-sky-300 uppercase">🧩 {p.title}</h2>
        </div>
        <div className="p-3">
          <p className="text-xs leading-snug text-zinc-200">{p.prompt}</p>
          <p className="mt-1.5 rounded bg-amber-900/25 px-2 py-1 text-[11px] text-amber-200">💡 {ps.hintText(p)}</p>

          {p.kind === 'sequence' && (
            <>
              <div className="mt-3 flex min-h-8 items-center justify-center gap-1.5">
                {(p.solution ?? []).map((_, i) => (
                  <span
                    key={i}
                    className={`flex h-8 w-8 items-center justify-center rounded border-2 text-base ${
                      ps.input[i] ? 'border-emerald-400 bg-emerald-800/40' : 'border-zinc-600 bg-black/30'
                    }`}
                  >
                    {ps.input[i] ? (p.options ?? []).find((o) => o.label === ps.input[i])?.icon : '?'}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {(p.options ?? []).map((o) => (
                  <button
                    key={o.label}
                    onClick={() => ps.press(o.label)}
                    className={`min-h-14 cursor-pointer rounded border-2 border-zinc-600 bg-black/30 px-1 py-2 text-center text-[11px] font-bold transition hover:border-sky-400 ${
                      wrong ? 'animate-pulse border-red-500' : ''
                    }`}
                  >
                    <span className="block text-2xl">{o.icon}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {p.kind === 'code' && (
            <>
              <div className="mt-3 flex justify-center gap-1.5">
                {Array.from({ length: p.digits ?? 4 }, (_, i) => (
                  <span
                    key={i}
                    className={`flex h-11 w-9 items-center justify-center rounded border-2 text-2xl font-black ${
                      ps.input[i] ? 'border-emerald-400 bg-emerald-900/50 text-emerald-200' : 'border-zinc-600 bg-black/40 text-zinc-600'
                    }`}
                  >
                    {ps.input[i] ?? '•'}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '<', '0', 'OK'].map((k) => (
                  <button
                    key={k}
                    onClick={() => k === 'OK' ? undefined : ps.type(k)}
                    className={`min-h-12 cursor-pointer rounded border-2 text-lg font-black ${
                      k === '<' ? 'border-zinc-600 bg-zinc-800 text-zinc-200' : 'border-zinc-600 bg-black/30 hover:border-sky-400'
                    } ${wrong ? 'animate-pulse border-red-500' : ''}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </>
          )}

          {p.kind === 'riddle' && (
            <>
              <div className="mt-2 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                Enigma {ps.step + 1} de {p.questions?.length}
              </div>
              <p className="mt-1 rounded bg-black/40 px-2 py-2 text-xs leading-snug">{p.questions?.[ps.step]?.q}</p>
              <div className="mt-2 space-y-1.5">
                {p.questions?.[ps.step]?.options.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => ps.answer(i)}
                    className={`min-h-11 w-full cursor-pointer rounded border-2 border-zinc-600 bg-black/30 px-2 text-left text-xs font-bold hover:border-sky-400 ${
                      wrong ? 'animate-pulse border-red-500' : ''
                    }`}
                  >
                    {String.fromCharCode(65 + i)}) {opt}
                  </button>
                ))}
              </div>
            </>
          )}

          {ps.result === 'ok' && (
            <p className="mt-3 rounded bg-emerald-900/40 px-2 py-2 text-center text-sm font-black text-emerald-300">
              ✅ RESOLVIDO! {p.ending ? 'A verdade se revela...' : 'Volte ao marcador e escape!'}
            </p>
          )}
        </div>
        <div className="flex gap-2 border-t border-zinc-700 bg-black/40 px-3 py-1.5">
          <p className="flex-1 text-[11px] text-zinc-500">Esc fecha · o mundo continua rodando</p>
          <button onClick={() => ps.close()} className={`${BTN} border-zinc-950 bg-zinc-700 text-zinc-100`}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Cutscene de vitória + estatísticas. */
export function VictoryUI({ game }: { game: Game }) {
  useGameTick(game);
  const v = game.victory;
  if (!v) return null;
  const stage = v.t < 1.6 ? 0 : v.t < 3.4 ? 1 : 2;
  const s = game.stats;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-4 text-center font-mono">
      {stage === 0 && (
        <p className="animate-pulse text-lg font-black tracking-[0.3em] text-emerald-400 uppercase sm:text-2xl">
          Fuga em andamento...
        </p>
      )}
      {stage >= 1 && (
        <>
          <p className="text-xs font-bold tracking-[0.3em] text-amber-300 uppercase sm:text-base">Rota concluída</p>
          <h2
            className="mt-1 text-2xl font-black text-emerald-400 uppercase sm:text-5xl"
            style={{ textShadow: '0 0 20px rgba(16,185,129,.7), 3px 3px 0 #000' }}
          >
            {v.name}
          </h2>
        </>
      )}
      {stage >= 2 && (
        <>
          <p className="mt-2 max-w-lg px-2 text-[11px] leading-snug text-zinc-300 sm:text-sm">{v.ending}</p>
          <h3
            className="mt-4 text-xl font-black text-white uppercase sm:text-4xl"
            style={{ textShadow: '0 0 18px rgba(255,255,255,.5), 3px 3px 0 #000' }}
          >
            VOCÊ ESCAPOU DO GIL!
          </h3>

          <div className="mt-4 w-[min(92vw,420px)] rounded-lg border-2 border-zinc-700 bg-zinc-900/80 p-3 text-left text-[11px] sm:text-xs">
            <h4 className="mb-1.5 text-center text-[10px] font-black tracking-widest text-amber-300 uppercase">
              Estatísticas da partida
            </h4>
            {[
              ['⏱️ Tempo total', fmtTime(s.playTime)],
              ['🎒 Itens coletados', String(s.itemsCollected)],
              ['🔨 Objetos fabricados', String(s.crafted)],
              ['🚨 Vezes detectado', String(s.detections)],
              ['🚪 Rota utilizada', v.name],
            ].map(([k, val]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-zinc-800 py-1 last:border-0">
                <span className="text-zinc-400">{k}</span>
                <span className="font-bold text-zinc-100">{val}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => window.location.reload()}
              className={`${BTN} border-emerald-900 bg-emerald-600 text-white`}
            >
              🔄 Jogar novamente
            </button>
            <button onClick={() => window.location.reload()} className={`${BTN} border-zinc-950 bg-zinc-700 text-zinc-100`}>
              🏫 Menu principal
            </button>
          </div>
          <p className="mt-2 text-[10px] text-zinc-600">As quatro rotas continuam disponíveis em outras partidas.</p>
        </>
      )}
    </div>
  );
}

export type { QuestNotice };
