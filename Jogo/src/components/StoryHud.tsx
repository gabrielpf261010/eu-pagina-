import { useEffect, useRef } from 'react';
import { drawPerson } from '../game/entities/sprites';
import type { CaptorInfo, StoryHud } from '../game/story/types';

const KEY =
  'inline-flex min-w-7 items-center justify-center rounded border-b-2 border-zinc-950 bg-zinc-700 px-1.5 py-0.5 font-mono text-[11px] font-bold text-zinc-100';

function patienceColor(v: number) {
  if (v > 70) return '#4ade80';
  if (v > 40) return '#facc15';
  if (v > 15) return '#fb923c';
  return '#ef4444';
}

/** Barra "Paciência da Lucivana" (topo, centralizada). */
export function PatienceBar({ value }: { value: number }) {
  const color = patienceColor(value);
  return (
    <div className="pointer-events-none absolute top-2 left-1/2 w-[min(44vw,340px)] -translate-x-1/2">
      <div className={`rounded bg-black/75 px-3 py-1.5 ring-1 ring-white/20 ${value <= 15 ? 'animate-pulse' : ''}`}>
        <div className="flex items-center justify-between font-mono text-[10px] font-bold tracking-widest text-zinc-200 uppercase sm:text-xs">
          <span>👩‍🏫 Paciência da Lucivana</span>
          <span style={{ color }}>{value}%</span>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-sm bg-zinc-800 ring-1 ring-black">
          <div
            className="h-full transition-[width] duration-200"
            style={{ width: `${value}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

/** Contagem regressiva do protocolo (substitui a barra de paciência). */
export function Countdown({ seconds }: { seconds: number }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return (
    <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-center font-mono">
      <div className="animate-pulse rounded bg-red-950/85 px-5 py-1.5 ring-2 ring-red-500">
        <div className="text-[10px] font-bold tracking-[0.3em] text-red-300 uppercase sm:text-xs">O Gil chega em</div>
        <div className="text-3xl leading-none font-black text-red-500 sm:text-4xl" style={{ textShadow: '0 0 12px #f00' }}>
          {mm}:{ss}
        </div>
      </div>
    </div>
  );
}

/** Fala da Lucivana (legenda grande e legível, além do balão no mapa). */
export function Subtitle({ sub }: { sub: NonNullable<StoryHud['subtitle']> }) {
  const tone =
    sub.kind === 'shout'
      ? 'text-red-400 ring-red-500/70 text-sm sm:text-xl font-black'
      : sub.kind === 'angry'
        ? 'text-orange-300 ring-orange-400/70 text-sm sm:text-lg font-extrabold'
        : 'text-zinc-100 ring-white/30 text-xs sm:text-base font-bold';
  return (
    <div className="pointer-events-none absolute top-[4.3rem] left-1/2 w-[min(86vw,720px)] -translate-x-1/2 text-center sm:top-20">
      <div className={`animate-[subtitle-in_0.18s_ease-out] rounded-md bg-black/85 px-4 py-2 font-mono ring-2 ${tone}`}>
        <span className="mr-2 text-[10px] font-bold tracking-widest text-amber-300 uppercase sm:text-xs">{sub.speaker}:</span>
        {sub.text}
      </div>
    </div>
  );
}

/** Texto gigante no centro: "PROTOCOLO GIL ATIVADO!" / "O GIL ESTÁ SOLTO!". */
export function Banner({ text }: { text: string }) {
  const danger = text.startsWith('PROTOCOLO');
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-4">
      <div
        className="animate-[banner-pop_0.35s_cubic-bezier(.2,1.6,.4,1)] text-center font-mono text-3xl font-black tracking-tight uppercase sm:text-6xl"
        style={{
          color: danger ? '#ff3030' : '#ffffff',
          textShadow: '0 0 18px rgba(255,0,0,.9), 4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
        }}
      >
        {text}
      </div>
    </div>
  );
}

export function Objective({ text }: { text: string }) {
  return (
    <div className="pointer-events-none mt-1 max-w-[56vw] rounded bg-black/70 px-2.5 py-1 font-mono text-[10px] text-amber-200 ring-1 ring-amber-300/40 sm:max-w-sm sm:text-xs">
      🎯 <span className="font-bold">Objetivo:</span> {text}
    </div>
  );
}

export function ClassHint({ isTouch }: { isTouch: boolean }) {
  return (
    <div className="pointer-events-none absolute top-[4.3rem] left-1/2 -translate-x-1/2 sm:top-20">
      <div className="rounded bg-black/70 px-3 py-1 text-center font-mono text-[10px] text-zinc-200 ring-1 ring-white/20 sm:text-xs">
        {isTouch
          ? 'A aula está chata... faça bagunça! Use 📄 Bolinha, 💬 Conversar e 🎭 Zoar.'
          : 'A aula está chata... faça bagunça até a Lucivana perder a paciência!'}
      </div>
    </div>
  );
}

/** Dica de pular a cutscene no computador (no celular existe o botão "Pular"). */
export function SkipHint() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs text-zinc-300">
      <span className={KEY}>Espaço</span> pular
    </div>
  );
}

/** Retrato pixel art do NPC que capturou o jogador. */
function CaptorPortrait({ captor }: { captor: CaptorInfo | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !captor?.look) return;
    const g = cv.getContext('2d');
    if (!g) return;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    g.save();
    g.scale(2, 2);
    drawPerson(g, captor.look, {
      x: 16,
      y: 34,
      facing: 'down',
      moving: false,
      walkT: 0,
      sitting: false,
      arms: 'down',
    });
    g.restore();
  }, [captor]);
  return (
    <canvas
      ref={ref}
      width={64}
      height={80}
      aria-hidden
      className="h-20 w-16 shrink-0"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function CaptureOverlay({
  attempt,
  isTouch,
  captor,
  onRetry,
  onRestart,
}: {
  attempt: number;
  isTouch: boolean;
  captor: CaptorInfo | null;
  onRetry: () => void;
  onRestart: () => void;
}) {
  const accent = captor?.accent ?? '#ef4444';
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 px-6 text-center font-mono"
      style={{ boxShadow: `inset 0 0 160px ${accent}66` }}
    >
      <div className="flex items-center gap-4">
        <CaptorPortrait captor={captor} />
        <div
          className="animate-[banner-pop_0.4s_cubic-bezier(.2,1.6,.4,1)] text-3xl font-black uppercase sm:text-6xl"
          style={{ color: accent, textShadow: `0 0 20px ${accent}, 4px 4px 0 #000` }}
        >
          {captor?.headline ?? 'VOCÊ FOI PEGO!'}
        </div>
      </div>
      {captor?.line && (
        <p
          className="mt-2 text-sm font-bold tracking-widest sm:text-xl"
          style={{ color: accent, textShadow: '2px 2px 0 #000' }}
        >
          “{captor.line}”
        </p>
      )}
      <p className="mt-3 text-xs text-zinc-400 sm:text-sm">
        Tentativa {attempt}
        {captor?.name ? ` · capturado por ${captor.name}` : ''}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onRetry}
          className="cursor-pointer rounded border-b-4 border-red-900 bg-red-700 px-6 py-3 text-sm font-bold tracking-widest text-white uppercase hover:bg-red-600 active:translate-y-0.5 active:border-b-2 sm:text-base"
        >
          Tentar novamente
        </button>
        <button
          onClick={onRestart}
          className="cursor-pointer rounded border-b-4 border-zinc-900 bg-zinc-700 px-6 py-3 text-sm font-bold tracking-widest text-zinc-100 uppercase hover:bg-zinc-600 active:translate-y-0.5 active:border-b-2 sm:text-base"
        >
          Recomeçar a aula
        </button>
      </div>
      {!isTouch && (
        <p className="mt-4 text-xs text-zinc-500">
          <span className={KEY}>Enter</span> tentar novamente
        </p>
      )}
    </div>
  );
}
