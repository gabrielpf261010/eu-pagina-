import { useEffect, useRef, useState } from 'react';
import { Game } from '../game/Game';
import { INITIAL_STORY_HUD } from '../game/story/types';
import type { HudState } from '../game/types';
import { useTouchDevice, useViewport } from '../hooks/useDevice';
import {
  Banner,
  CaptureOverlay,
  ClassHint,
  Countdown,
  Objective,
  PatienceBar,
  SkipHint,
  Subtitle,
} from './StoryHud';
import InventoryUI from './InventoryUI';
import { JournalUI, PuzzleUI, QuestNotices, VictoryUI } from './QuestUI';
import TouchControls from './TouchControls';

const KEY =
  'inline-flex min-w-7 items-center justify-center rounded border-b-2 border-zinc-950 bg-zinc-700 px-1.5 py-0.5 font-mono text-[11px] font-bold text-zinc-100';

const INITIAL_HUD: HudState = {
  floorName: 'Térreo',
  zoneName: '',
  prompt: null,
  message: null,
  seated: false,
  story: INITIAL_STORY_HUD,
  player: { energy: 100, exhausted: false, shield: false, clues: false, bagUsed: 0, bagCap: 12, uiOpen: false },
  threat: 'none',
};

export default function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootKey, setBootKey] = useState(0);

  const isTouch = useTouchDevice();
  const { w, h } = useViewport();
  // celular na vertical: pede para girar (tablets grandes continuam jogáveis em pé)
  const needsRotate = isTouch && h > w && Math.min(w, h) < 700;
  const story = hud.story;

  useEffect(() => {
    setBootError(null);
    let g: Game | null = null;
    try {
      g = new Game(canvasRef.current!);
      g.onHud = setHud;
      g.onError = (msg) => setBootError(msg);
      g.start();
      setGame(g);
    } catch (err) {
      console.error('[Escape do Gil] falha ao iniciar:', err);
      setBootError(err instanceof Error ? err.message : String(err));
    }
    return () => {
      g?.destroy();
      setGame(null);
    };
  }, [bootKey]);

  useEffect(() => {
    if (game) game.paused = !started || needsRotate;
  }, [game, started, needsRotate]);

  // Enter / Espaço iniciam o jogo (e liberam o áudio do navegador)
  useEffect(() => {
    if (started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        game?.audio.unlock();
        setStarted(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, game]);

  // evita zoom, rolagem e menu de contexto acidentais no celular
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('gesturestart', prevent);
    document.addEventListener('gesturechange', prevent);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', prevent);
      document.removeEventListener('gesturechange', prevent);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const start = () => {
    game?.audio.unlock();
    setStarted(true);
    if (isTouch) {
      // melhor experiência no celular: tela cheia + paisagem (quando o navegador permite)
      const el = document.documentElement;
      el.requestFullscreen?.()
        .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
        .catch(() => undefined);
    }
  };

  const toggleMute = () => {
    if (!game) return;
    game.audio.setMuted(!game.audio.muted);
    setMuted(game.audio.muted);
  };

  const compact = isTouch;
  const showHud = started && !needsRotate;
  const inCutscene = story.phase === 'CUTSCENE';

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="block shrink-0" style={{ imageRendering: 'pixelated' }} />

      {/* HUD */}
      {showHud && (
        <>
          <div className="absolute top-2 left-2 space-y-1 font-mono" style={{ paddingLeft: 'env(safe-area-inset-left)' }}>
            <div className="flex items-center gap-1.5">
              <div className="pointer-events-none inline-block rounded bg-black/70 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-amber-300 uppercase ring-1 ring-white/20 sm:text-xs">
                {hud.floorName}
              </div>
              <button
                onClick={toggleMute}
                aria-label={muted ? 'Ativar som' : 'Silenciar'}
                className="pointer-events-auto cursor-pointer rounded bg-black/70 px-1.5 py-0.5 text-xs ring-1 ring-white/20"
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </div>
            <div className="pointer-events-none rounded bg-black/70 px-2.5 py-1 text-xs text-zinc-100 ring-1 ring-white/20 sm:text-sm">
              {hud.zoneName}
            </div>
            {story.objective && <Objective text={story.objective} />}
          </div>

          {/* História: paciência, contagem, falas e avisos */}
          {story.countdown !== null ? (
            <Countdown seconds={story.countdown} />
          ) : (
            story.showPatience && <PatienceBar value={story.patience} />
          )}
          {story.subtitle && <Subtitle sub={story.subtitle} />}
          {!story.subtitle && story.phase === 'AULA' && <ClassHint isTouch={isTouch} />}
          {story.banner && <Banner key={story.banner} text={story.banner} />}

          {hud.message && (
            <div className="pointer-events-none absolute top-[7.5rem] left-1/2 -translate-x-1/2 sm:top-36">
              <div className="rounded-md bg-black/85 px-4 py-2 font-mono text-xs text-zinc-100 ring-1 ring-red-400/60 sm:text-sm">
                {hud.message}
              </div>
            </div>
          )}

          {hud.prompt && !inCutscene && !story.captured && (
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2"
              style={{ bottom: compact ? 'calc(14px + env(safe-area-inset-bottom))' : '5.5rem' }}
            >
              <div className="flex items-center gap-2 rounded-md bg-black/80 px-3 py-1.5 font-mono text-xs text-zinc-100 ring-1 ring-amber-300/60 sm:px-4 sm:py-2 sm:text-sm">
                {compact ? <span className="text-amber-300">✋</span> : <span className={KEY}>E</span>}
                {hud.prompt}
              </div>
            </div>
          )}

          {inCutscene && !compact && <SkipHint />}

          {!compact && !inCutscene && (
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-black/65 px-3 py-2 font-mono text-[11px] text-zinc-300 ring-1 ring-white/10">
              <span>
                <span className={KEY}>W</span> <span className={KEY}>A</span> <span className={KEY}>S</span>{' '}
                <span className={KEY}>D</span> / setas: mover
              </span>
              <span>
                <span className={KEY}>Shift</span> correr
              </span>
              <span>
                <span className={KEY}>E</span> interagir / sentar
              </span>
              {story.classActions && (
                <>
                  <span>
                    <span className={KEY}>Q</span> conversar
                  </span>
                  <span>
                    <span className={KEY}>G</span> bolinha
                  </span>
                  <span>
                    <span className={KEY}>R</span> zoar
                  </span>
                </>
              )}
              <span>
                <span className={KEY}>M</span> minimapa
              </span>
              <span>
                <span className={KEY}>J</span> missões
              </span>
            </div>
          )}

          {/* Missões, puzzles, avisos e vitória */}
          {game && <QuestNotices game={game} />}
          {game && <JournalUI game={game} />}
          {game && <PuzzleUI game={game} />}
          {game && <VictoryUI game={game} />}
          {game && hud.player.uiOpen && <InventoryUI game={game} />}

          {compact && game && !story.captured && (
            <TouchControls
              input={game.input}
              hasPrompt={hud.prompt !== null}
              classActions={story.classActions}
              cutscene={inCutscene}
            />
          )}

          {story.captured && game && (
            <CaptureOverlay
              attempt={story.attempt}
              isTouch={isTouch}
              captor={story.captor}
              onRetry={() => game.story.retry()}
              onRestart={() => game.story.restart()}
            />
          )}
        </>
      )}

      {/* Tela inicial */}
      {!started && !needsRotate && (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-black/80 px-6 py-4 text-center font-mono backdrop-blur-[2px]">
          <p className="mb-2 text-[10px] tracking-[0.4em] text-zinc-400 uppercase sm:text-xs">
            protótipo · v0.7 · capítulo 1 · mapa reorganizado
          </p>
          <h1
            className="text-4xl font-black tracking-tight text-zinc-100 uppercase sm:text-7xl"
            style={{ textShadow: '4px 4px 0 #000' }}
          >
            Escape <span className="text-zinc-300 italic">do</span>{' '}
            <span className="text-red-600 italic" style={{ textShadow: '4px 4px 0 #3b0a0a' }}>
              Gil
            </span>
          </h1>
          <p className="mt-2 text-sm font-bold tracking-widest text-amber-300 uppercase sm:text-base">
            Cap. 1 — O Botão do Pânico
          </p>
          <p className="mt-3 max-w-md text-xs text-zinc-400 sm:text-sm">
            Aula de português com a professora Lucivana. A turma está entediada... e a paciência dela tem limite.
          </p>
          <button
            onClick={start}
            className="mt-5 cursor-pointer rounded border-b-4 border-red-900 bg-red-700 px-8 py-3 text-lg font-bold tracking-widest text-white uppercase transition hover:bg-red-600 active:translate-y-0.5 active:border-b-2 sm:mt-6"
          >
            Começar a aula
          </button>
          {!isTouch && <p className="mt-3 text-xs text-zinc-500">ou pressione Enter</p>}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-left text-xs text-zinc-400 sm:mt-6">
            {isTouch ? (
              <>
                <span>🕹️ Analógico</span>
                <span>mover</span>
                <span>⚡ Correr</span>
                <span>segure</span>
                <span>✋ Interagir</span>
                <span>sentar, levantar, objetos</span>
                <span>📄 💬 🎭</span>
                <span>bolinha, conversar, zoar</span>
              </>
            ) : (
              <>
                <span>
                  <span className={KEY}>WASD</span> / setas
                </span>
                <span>mover</span>
                <span>
                  <span className={KEY}>Shift</span>
                </span>
                <span>correr</span>
                <span>
                  <span className={KEY}>E</span>
                </span>
                <span>sentar, levantar, objetos</span>
                <span>
                  <span className={KEY}>Q</span> <span className={KEY}>G</span> <span className={KEY}>R</span>
                </span>
                <span>conversar, bolinha, zoar</span>
                <span>
                  <span className={KEY}>M</span>
                </span>
                <span>minimapa</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Erro de inicialização: nunca tela preta silenciosa */}
      {bootError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-8 text-center font-mono text-zinc-100">
          <div className="text-5xl">⚠️</div>
          <p className="mt-4 text-lg font-bold">Ops! O jogo encontrou um problema</p>
          <p className="mt-2 max-w-md text-xs break-all text-zinc-400">{bootError}</p>
          <button
            onClick={() => {
              setBootError(null);
              setBootKey((k) => k + 1);
            }}
            className="mt-5 cursor-pointer rounded border-b-4 border-emerald-900 bg-emerald-600 px-8 py-3 text-lg font-bold tracking-widest text-white uppercase transition hover:bg-emerald-500 active:translate-y-0.5 active:border-b-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Aviso para girar o celular */}
      {needsRotate && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black px-8 text-center font-mono text-zinc-100">
          <div className="text-6xl" style={{ animation: 'spin-rotate 2.4s ease-in-out infinite' }}>
            📱
          </div>
          <p className="mt-6 text-xl font-bold">Gire seu celular para jogar</p>
          <p className="mt-2 text-sm text-zinc-400">O Escape do Gil funciona melhor na horizontal.</p>
        </div>
      )}
    </div>
  );
}
