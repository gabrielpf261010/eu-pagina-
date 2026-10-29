import type { PlayerHud, ThreatLevel } from '../game/types';

/** Energia, proteção, espaço na mochila e aviso de inimigo por perto. */
export default function StatusHud({ player, threat }: { player: PlayerHud; threat: ThreatLevel }) {
  const e = player.energy;
  const color = player.exhausted ? '#ef4444' : e > 50 ? '#38bdf8' : e > 25 ? '#facc15' : '#fb923c';
  return (
    <div className="pointer-events-none mt-1 flex flex-col items-start gap-1">
      <div className="w-36 rounded bg-black/70 px-2 py-1 ring-1 ring-white/20 sm:w-44">
        <div className="flex justify-between text-[10px] font-bold tracking-wider text-zinc-200 uppercase">
          <span>{player.exhausted ? '😮‍💨 Sem fôlego!' : '⚡ Energia'}</span>
          <span style={{ color }}>{e}%</span>
        </div>
        <div className="mt-0.5 h-1.5 overflow-hidden rounded-sm bg-zinc-800">
          <div className={`h-full ${player.exhausted ? 'animate-pulse' : ''}`} style={{ width: `${e}%`, background: color }} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-100 sm:text-xs">
        <span className="rounded bg-black/70 px-2 py-0.5 ring-1 ring-white/20">
          🎒 {player.bagUsed}/{player.bagCap}
        </span>
        {player.shield && <span className="rounded bg-sky-900/80 px-2 py-0.5 ring-1 ring-sky-400/60">🛡️ Proteção</span>}
        {player.clues && <span className="rounded bg-amber-900/80 px-2 py-0.5 ring-1 ring-amber-400/60">🧭 Pistas</span>}
      </div>
      {threat !== 'none' && (
        <div
          className={`animate-pulse rounded px-2.5 py-1 text-[10px] font-black tracking-wider uppercase ring-2 sm:text-xs ${
            threat === 'chase' ? 'bg-red-700 text-white ring-red-300' : 'bg-amber-600 text-black ring-amber-200'
          }`}
        >
          {threat === 'chase' ? '🚨 O Gil está te perseguindo!' : '⚠️ Inimigo por perto!'}
        </div>
      )}
    </div>
  );
}
