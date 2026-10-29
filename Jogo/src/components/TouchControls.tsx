import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Action, Input } from '../game/engine/Input';

/**
 * Controles virtuais. Eles só conversam com a camada de entrada unificada (`Input`),
 * então o jogo não sabe se a ação veio do teclado ou do toque.
 *
 * Cada botão usa Pointer Events com captura: vários dedos funcionam ao mesmo tempo
 * (ex.: andar no analógico + segurar "Correr" + tocar em "Interagir").
 *
 * Durante a cutscene o analógico e os botões somem: só o botão "Pular" fica na tela,
 * então nada conflita com a movimentação.
 */

interface ButtonDef {
  action: Action;
  label: string;
  icon: string;
  /** Distância (px) da borda direita / inferior da tela. */
  right: number;
  bottom: number;
  size: number;
  /** 'class' = só aparece durante a aula (bagunça). */
  when: 'always' | 'class';
}

const BASE_BUTTONS: ButtonDef[] = [
  { action: 'interact', label: 'Interagir', icon: '✋', right: 22, bottom: 22, size: 78, when: 'always' },
  { action: 'run', label: 'Correr', icon: '⚡', right: 118, bottom: 18, size: 60, when: 'always' },
  { action: 'inventory', label: 'Mochila', icon: '🎒', right: 190, bottom: 22, size: 60, when: 'always' },
  { action: 'journal', label: 'Missões', icon: '📜', right: 262, bottom: 22, size: 54, when: 'always' },
  // --- bagunça na sala de aula
  { action: 'throw', label: 'Bolinha', icon: '📄', right: 22, bottom: 112, size: 58, when: 'class' },
  { action: 'talk', label: 'Conversar', icon: '💬', right: 92, bottom: 104, size: 52, when: 'class' },
  { action: 'prank', label: 'Zoar', icon: '🎭', right: 152, bottom: 88, size: 52, when: 'class' },
  // reservados para as próximas etapas (ainda não exibidos): attack ⚔️, inventory 🎒
];

const SKIP_BUTTON: ButtonDef = {
  action: 'skip',
  label: 'Pular',
  icon: '⏭️',
  right: 22,
  bottom: 22,
  size: 76,
  when: 'always',
};

function ActionButton({ def, input, highlight }: { def: ButtonDef; input: Input; highlight: boolean }) {
  const [down, setDown] = useState(false);
  const pointer = useRef<number | null>(null);

  useEffect(
    () => () => {
      input.setTouchAction(def.action, false);
    },
    [input, def.action],
  );

  const press = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (pointer.current !== null) return;
    pointer.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDown(true);
    input.setTouchAction(def.action, true);
  };
  const release = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    setDown(false);
    input.setTouchAction(def.action, false);
  };

  return (
    <div
      role="button"
      aria-label={def.label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      className={`pointer-events-auto absolute flex touch-none flex-col items-center justify-center rounded-full border-2 text-white backdrop-blur-[1px] select-none ${
        down
          ? 'scale-95 border-white/80 bg-white/40 opacity-90'
          : highlight
            ? 'animate-pulse border-amber-300/90 bg-amber-300/30 opacity-80'
            : 'border-white/40 bg-white/15 opacity-55'
      }`}
      style={{
        right: `calc(${def.right}px + env(safe-area-inset-right))`,
        bottom: `calc(${def.bottom}px + env(safe-area-inset-bottom))`,
        width: def.size,
        height: def.size,
        WebkitTouchCallout: 'none',
      }}
    >
      <span style={{ fontSize: def.size * 0.38, lineHeight: 1 }}>{def.icon}</span>
      <span className="mt-0.5 font-mono font-bold tracking-wide uppercase" style={{ fontSize: Math.max(8, def.size * 0.14) }}>
        {def.label}
      </span>
    </div>
  );
}

function Joystick({ input }: { input: Input }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  useEffect(
    () => () => {
      input.setTouchAxis(0, 0);
    },
    [input],
  );

  const update = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const max = rect.width * 0.36;
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / max;
    const ny = dy / max;
    if (Math.hypot(nx, ny) < 0.2) input.setTouchAxis(0, 0);
    else input.setTouchAxis(nx, ny);
  };

  const start = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (pointer.current !== null) return;
    pointer.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    update(e);
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.current === e.pointerId) update(e);
  };
  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    input.setTouchAxis(0, 0);
  };

  const active = knob.x !== 0 || knob.y !== 0;

  return (
    <div
      className="pointer-events-auto absolute touch-none select-none"
      style={{
        left: 'calc(22px + env(safe-area-inset-left))',
        bottom: 'calc(22px + env(safe-area-inset-bottom))',
        width: 'clamp(120px, 30vh, 170px)',
        height: 'clamp(120px, 30vh, 170px)',
        padding: 14,
        margin: -14,
      }}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={baseRef}
        className={`relative h-full w-full rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-[1px] ${active ? 'opacity-80' : 'opacity-50'}`}
      >
        {/* marcações de direção */}
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] text-white/70">▲</span>
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] text-white/70">▼</span>
        <span className="absolute top-1/2 left-2 -translate-y-1/2 text-[10px] text-white/70">◀</span>
        <span className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-white/70">▶</span>
        <div
          className="absolute top-1/2 left-1/2 rounded-full border-2 border-white/70 bg-white/35"
          style={{
            width: '42%',
            height: '42%',
            transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          }}
        />
      </div>
    </div>
  );
}

function MapButton({ input }: { input: Input }) {
  return (
    <div
      role="button"
      aria-label="Minimapa"
      onPointerDown={(e) => {
        e.preventDefault();
        input.setTouchAction('map', true);
      }}
      onPointerUp={() => input.setTouchAction('map', false)}
      onPointerCancel={() => input.setTouchAction('map', false)}
      onPointerLeave={() => input.setTouchAction('map', false)}
      className="pointer-events-auto absolute top-1/2 flex h-10 w-10 -translate-y-1/2 touch-none items-center justify-center rounded-full border-2 border-white/40 bg-white/15 text-base opacity-55 select-none active:opacity-90"
      style={{ right: 'calc(10px + env(safe-area-inset-right))', marginTop: 40 }}
    >
      🗺️
    </div>
  );
}

interface Props {
  input: Input;
  hasPrompt: boolean;
  /** Mostra os botões de bagunça (aula em andamento). */
  classActions: boolean;
  /** Cutscene: esconde tudo, exceto "Pular". */
  cutscene: boolean;
}

export default function TouchControls({ input, hasPrompt, classActions, cutscene }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 touch-none select-none" onContextMenu={(e) => e.preventDefault()}>
      {cutscene ? (
        <ActionButton def={SKIP_BUTTON} input={input} highlight />
      ) : (
        <>
          <Joystick input={input} />
          {BASE_BUTTONS.filter((b) => b.when === 'always' || classActions).map((b) => (
            <ActionButton key={b.action} def={b} input={input} highlight={b.action === 'interact' && hasPrompt} />
          ))}
          <MapButton input={input} />
        </>
      )}
    </div>
  );
}
