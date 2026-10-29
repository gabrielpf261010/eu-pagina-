import { useEffect, useState } from 'react';
import type { Game } from '../game/Game';
import { CATEGORY_LABEL, RARITY_META, RECIPES, getItem } from '../game/items/catalog';
import type { Inventory } from '../game/items/Inventory';
import type { ActionResult, ItemStack } from '../game/items/types';

type Src = 'bag' | 'box';
type Sel = { src: Src; index: number } | null;
type Mode = 'normal' | 'move' | 'combine';

const BTN =
  'min-h-11 cursor-pointer rounded border-b-4 px-3 py-2 font-mono text-xs font-bold tracking-wide uppercase transition active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40';
const TONE = {
  green: 'border-emerald-900 bg-emerald-600 text-white hover:bg-emerald-500',
  gray: 'border-zinc-950 bg-zinc-600 text-zinc-100 hover:bg-zinc-500',
  red: 'border-red-950 bg-red-700 text-white hover:bg-red-600',
  amber: 'border-amber-900 bg-amber-600 text-black hover:bg-amber-500',
  blue: 'border-sky-950 bg-sky-700 text-white hover:bg-sky-600',
};

function SlotButton({
  stack,
  selected,
  pending,
  onClick,
}: {
  stack: ItemStack | null;
  selected: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  const def = stack ? getItem(stack.id) : null;
  const meta = def ? RARITY_META[def.rarity] : null;
  return (
    <button
      onClick={onClick}
      aria-label={def ? def.name : 'Espaço vazio'}
      className={`relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded border-2 text-2xl transition ${
        selected ? 'scale-105 ring-2 ring-white' : ''
      } ${pending ? 'animate-pulse' : ''}`}
      style={{
        borderColor: meta ? meta.color : '#3f3f46',
        borderStyle: def ? 'solid' : 'dashed',
        background: meta ? meta.bg : 'rgba(255,255,255,0.03)',
        boxShadow: def?.rarity === 'lendario' ? '0 0 10px rgba(251,191,36,0.55)' : undefined,
      }}
    >
      {def && <span>{def.icon}</span>}
      {stack && stack.qty > 1 && (
        <span className="absolute right-0.5 bottom-0 rounded bg-black/85 px-1 text-[10px] font-bold text-white">×{stack.qty}</span>
      )}
    </button>
  );
}

function Grid({
  inv,
  src,
  sel,
  pendingIndex,
  onPick,
  minSlots,
}: {
  inv: Inventory;
  src: Src;
  sel: Sel;
  pendingIndex: number | null;
  onPick: (src: Src, index: number) => void;
  minSlots?: number;
}) {
  const count = Math.max(inv.slots.length, minSlots ?? 0);
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <SlotButton
          key={i}
          stack={inv.slots[i] ?? null}
          selected={!!sel && sel.src === src && sel.index === i}
          pending={pendingIndex === i && src === 'bag'}
          onClick={() => onPick(src, i)}
        />
      ))}
    </div>
  );
}

function Detail({ stack }: { stack: ItemStack | null }) {
  if (!stack) return <p className="text-xs text-zinc-500">Toque em um item para ver os detalhes.</p>;
  const def = getItem(stack.id);
  const meta = RARITY_META[def.rarity];
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-3xl">{def.icon}</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-black" style={{ color: meta.color }}>
            {def.name}
          </div>
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <span className="rounded px-1.5 py-0.5 font-bold" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}` }}>
              {meta.label}
            </span>
            <span className="text-zinc-400">{CATEGORY_LABEL[def.category]}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs leading-snug text-zinc-300">{def.description}</p>
      <p className="mt-1 text-[10px] text-zinc-500">
        Quantidade: <span className="font-bold text-zinc-300">×{stack.qty}</span> ·{' '}
        {def.maxStack > 1 ? `empilha até ${def.maxStack}` : 'não empilha'}
        {def.keyItem ? ' · item-chave' : ''}
      </p>
    </div>
  );
}

export default function InventoryUI({ game }: { game: Game }) {
  const items = game.items;
  const [, bump] = useState(0);
  useEffect(() => items.subscribe(() => bump((n) => n + 1)), [items]);

  const [sel, setSel] = useState<Sel>(null);
  const [mode, setMode] = useState<Mode>('normal');
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState<ActionResult | null>(null);
  const [recipeId, setRecipeId] = useState(RECIPES[0].id);

  const ui = items.ui;
  const box = ui.container;
  const threat = items.threat;

  // trocar de janela/aba limpa a seleção
  useEffect(() => {
    setSel(null);
    setMode('normal');
    setConfirm(false);
    setNote(null);
  }, [ui.mode, box?.id, ui.tab]);

  if (ui.mode === 'none') return null;

  const stackOf = (s: Sel): ItemStack | null => {
    if (!s) return null;
    const inv = s.src === 'bag' ? items.inv : box?.inv;
    return inv?.slots[s.index] ?? null;
  };
  const selStack = stackOf(sel);
  const activeSel = selStack ? sel : null;

  const run = (res: ActionResult) => {
    setNote(res);
    setConfirm(false);
    if (res.close) items.close();
  };

  const pick = (src: Src, index: number) => {
    setConfirm(false);
    if (mode === 'move' && sel && sel.src === 'bag' && src === 'bag') {
      run(items.moveSlot(sel.index, index));
      setSel({ src: 'bag', index });
      setMode('normal');
      return;
    }
    if (mode === 'combine' && sel && sel.src === 'bag' && src === 'bag') {
      run(items.combine(sel.index, index));
      setSel(null);
      setMode('normal');
      return;
    }
    setMode('normal');
    setSel({ src, index });
  };

  const searching = items.searching;
  const progress = ui.searchDur > 0 ? Math.min(1, ui.searchT / ui.searchDur) : 1;
  const title = ui.mode === 'container' && box ? `🗄️ ${box.name}` : '🎒 Mochila';

  // ------------------------------------------------------------ painel de ações do item
  const actions = (
    <div className="mt-3 flex flex-wrap gap-2">
      {activeSel?.src === 'box' && (
        <>
          <button className={`${BTN} ${TONE.green}`} onClick={() => run(items.takeFromBox(activeSel.index))}>
            Pegar
          </button>
        </>
      )}
      {activeSel?.src === 'bag' && ui.mode === 'container' && (
        <button className={`${BTN} ${TONE.gray}`} onClick={() => run(items.storeToBox(activeSel.index))}>
          Guardar
        </button>
      )}
      {activeSel?.src === 'bag' && (
        <>
          <button className={`${BTN} ${TONE.green}`} onClick={() => run(items.useSlot(activeSel.index))}>
            Usar
          </button>
          <button className={`${BTN} ${mode === 'move' ? TONE.amber : TONE.gray}`} onClick={() => setMode(mode === 'move' ? 'normal' : 'move')}>
            Mover
          </button>
          <button className={`${BTN} ${mode === 'combine' ? TONE.amber : TONE.blue}`} onClick={() => setMode(mode === 'combine' ? 'normal' : 'combine')}>
            Combinar
          </button>
          <button
            className={`${BTN} ${confirm ? TONE.red : TONE.gray}`}
            onClick={() => (confirm ? run(items.discardSlot(activeSel.index)) : setConfirm(true))}
          >
            {confirm ? 'Confirmar?' : 'Descartar'}
          </button>
        </>
      )}
    </div>
  );

  const hint =
    mode === 'move'
      ? 'Toque no espaço de destino para mover o item.'
      : mode === 'combine'
        ? 'Toque no segundo item para combinar.'
        : null;

  // ------------------------------------------------------------ corpo: recipiente
  const containerBody = box && (
    <div className="flex flex-wrap gap-4">
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold tracking-widest text-amber-300 uppercase">{box.name}</h3>
        {searching ? (
          <div className="flex h-[124px] w-[236px] flex-col items-center justify-center rounded border-2 border-dashed border-zinc-600 bg-black/30 px-3">
            <div className="animate-pulse text-sm font-bold text-zinc-200">🔍 Vasculhando...</div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded bg-zinc-800">
              <div className="h-full bg-amber-400" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="mt-1 text-[10px] text-zinc-500">Você está parado e exposto!</div>
          </div>
        ) : (
          <>
            <Grid inv={box.inv} src="box" sel={activeSel} pendingIndex={null} onPick={pick} />
            {box.inv.isEmpty && <p className="mt-1.5 text-xs text-zinc-500">Está vazio.</p>}
            {!box.inv.isEmpty && (
              <button className={`${BTN} ${TONE.green} mt-2 w-full`} onClick={() => run(items.takeAll())}>
                Pegar tudo
              </button>
            )}
          </>
        )}
      </section>
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold tracking-widest text-sky-300 uppercase">
          Mochila {items.inv.used}/{items.inv.capacity}
        </h3>
        <Grid inv={items.inv} src="bag" sel={activeSel} pendingIndex={mode !== 'normal' && sel ? sel.index : null} onPick={pick} />
      </section>
      <section className="min-w-[220px] flex-1">
        <Detail stack={searching ? null : selStack} />
        {!searching && actions}
        {hint && <p className="mt-2 text-xs font-bold text-amber-300">{hint}</p>}
      </section>
    </div>
  );

  // ------------------------------------------------------------ corpo: mochila
  const bagBody = (
    <div className="flex flex-wrap gap-4">
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold tracking-widest text-sky-300 uppercase">
          Mochila {items.inv.used}/{items.inv.capacity}
        </h3>
        <Grid inv={items.inv} src="bag" sel={activeSel} pendingIndex={mode !== 'normal' && sel ? sel.index : null} onPick={pick} />
      </section>
      <section className="min-w-[220px] flex-1">
        <Detail stack={selStack} />
        {actions}
        {hint && <p className="mt-2 text-xs font-bold text-amber-300">{hint}</p>}
      </section>
    </div>
  );

  // ------------------------------------------------------------ corpo: fabricar
  const recipe = RECIPES.find((r) => r.id === recipeId) ?? RECIPES[0];
  const resultDef = getItem(recipe.result.id);
  const resultMeta = RARITY_META[resultDef.rarity];
  const canCraft = items.inv.hasAll(recipe);
  const craftBody = (
    <div className="flex flex-wrap gap-4">
      <section className="min-w-[200px] flex-1">
        <h3 className="mb-1.5 text-[11px] font-bold tracking-widest text-amber-300 uppercase">Receitas</h3>
        <div className="flex flex-col gap-1.5">
          {RECIPES.map((r) => {
            const d = getItem(r.result.id);
            const can = items.inv.hasAll(r);
            return (
              <button
                key={r.id}
                onClick={() => {
                  setRecipeId(r.id);
                  setNote(null);
                }}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded border-2 px-2 py-1 text-left text-xs transition ${
                  r.id === recipe.id ? 'border-amber-400 bg-amber-400/10' : 'border-zinc-700 bg-black/20 hover:border-zinc-500'
                }`}
              >
                <span className="text-xl">{d.icon}</span>
                <span className="flex-1 font-bold" style={{ color: RARITY_META[d.rarity].color }}>
                  {d.name}
                </span>
                {can && <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white">PRONTO</span>}
              </button>
            );
          })}
        </div>
      </section>
      <section className="min-w-[220px] flex-1">
        <div className="flex items-center gap-2">
          <span className="text-4xl">{resultDef.icon}</span>
          <div>
            <div className="text-sm font-black" style={{ color: resultMeta.color }}>
              {resultDef.name}
            </div>
            <div className="text-[10px] text-zinc-400">
              {resultMeta.label} · {CATEGORY_LABEL[resultDef.category]}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs leading-snug text-zinc-300">{recipe.description}</p>
        <h4 className="mt-3 mb-1 text-[11px] font-bold tracking-widest text-zinc-400 uppercase">Ingredientes</h4>
        <ul className="space-y-1">
          {recipe.ingredients.map((ing) => {
            const d = getItem(ing.id);
            const have = items.inv.count(ing.id);
            const enough = have >= ing.qty;
            return (
              <li key={ing.id} className="flex items-center gap-2 rounded bg-black/30 px-2 py-1 text-xs">
                <span className="text-lg">{d.icon}</span>
                <span className="flex-1">{d.name}</span>
                <span className={`font-bold ${enough ? 'text-emerald-400' : 'text-red-400'}`}>
                  {Math.min(have, 99)}/{ing.qty} {enough ? '✓' : '✗'}
                </span>
              </li>
            );
          })}
        </ul>
        <button
          disabled={!canCraft}
          onClick={() => run(items.craft(recipe.id))}
          className={`${BTN} ${TONE.green} mt-3 w-full`}
        >
          🔨 FABRICAR
        </button>
        {!canCraft && <p className="mt-1 text-[11px] text-red-400">Faltam materiais.</p>}
      </section>
    </div>
  );

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-2 font-mono text-zinc-100">
      <div className="pointer-events-auto flex max-h-[96vh] w-[min(98vw,720px)] flex-col overflow-hidden rounded-lg border-2 border-zinc-600 bg-zinc-900/95 shadow-2xl">
        {/* cabeçalho */}
        <div className="flex items-center gap-2 border-b border-zinc-700 bg-black/40 px-3 py-1.5">
          <h2 className="flex-1 truncate text-sm font-black tracking-wider uppercase">{title}</h2>
          {ui.mode === 'inventory' && (
            <div className="flex gap-1">
              {(['bag', 'craft'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => items.setTab(t)}
                  className={`min-h-9 cursor-pointer rounded px-3 text-[11px] font-bold tracking-wider uppercase ${
                    ui.tab === t ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                  }`}
                >
                  {t === 'bag' ? 'Mochila' : 'Fabricar'}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => items.close()}
            aria-label="Fechar"
            className="min-h-9 min-w-9 cursor-pointer rounded bg-zinc-700 text-lg font-bold hover:bg-red-700"
          >
            ✕
          </button>
        </div>

        {/* aviso de perigo */}
        {threat !== 'none' && (
          <button
            onClick={() => items.close()}
            className={`min-h-11 w-full animate-pulse cursor-pointer px-3 py-2 text-center text-xs font-black tracking-wider uppercase sm:text-sm ${
              threat === 'chase' ? 'bg-red-700 text-white' : 'bg-amber-500 text-black'
            }`}
          >
            {threat === 'chase' ? '🚨 O Gil está te perseguindo! Toque aqui para fechar e FUGIR!' : '⚠️ Inimigo por perto! Toque para fechar e sair daqui.'}
          </button>
        )}

        {/* corpo */}
        <div className="flex-1 overflow-y-auto p-3" style={{ touchAction: 'pan-y' }}>
          {ui.mode === 'container' ? containerBody : ui.tab === 'craft' ? craftBody : bagBody}
        </div>

        {/* rodapé */}
        <div className="flex items-center gap-2 border-t border-zinc-700 bg-black/40 px-3 py-1.5">
          <p
            className={`min-h-4 flex-1 text-[11px] leading-tight ${
              note ? (note.ok ? 'text-emerald-300' : 'text-red-300') : 'text-zinc-500'
            }`}
          >
            {note ? note.text : 'Esc / I fecham. O mundo continua rodando!'}
          </p>
          <button className={`${BTN} ${threat === 'chase' ? TONE.red : TONE.gray}`} onClick={() => items.close()}>
            {threat === 'chase' ? 'Fugir!' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
}
