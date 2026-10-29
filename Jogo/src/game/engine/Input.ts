/**
 * Entrada unificada. As mecânicas do jogo NUNCA leem teclado ou touch diretamente:
 * elas consultam ações abstratas (`isDown('run')`, `wasPressed('interact')`, `axis()`).
 *
 * Fontes: teclado (aqui) e controles touch (componente React TouchControls, que chama
 * `setTouchAxis` / `setTouchAction`). Para novas ações basta acrescentar o nome em `Action`
 * e o atalho em `KEY_BINDINGS`.
 */
export type Action =
  | 'interact'
  | 'run'
  | 'map'
  | 'attack'
  | 'inventory'
  | 'pause'
  | 'talk'
  | 'throw'
  | 'prank'
  | 'journal'
  | 'skip';

/** Uma tecla pode disparar mais de uma ação (ex.: Espaço = interagir e pular cutscene). */
const KEY_BINDINGS: Record<string, Action[]> = {
  KeyE: ['interact'],
  Enter: ['interact', 'skip'],
  Space: ['interact', 'skip'],
  ShiftLeft: ['run'],
  ShiftRight: ['run'],
  KeyM: ['map'],
  KeyF: ['attack'],
  KeyI: ['inventory'],
  KeyJ: ['journal'],
  Escape: ['pause'],
  KeyQ: ['talk'],
  KeyG: ['throw'],
  KeyR: ['prank'],
};

const AXIS_KEYS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
};

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

export class Input {
  private keys = new Set<string>();
  private touchDown = new Set<Action>();
  private pressed = new Set<Action>();
  private touchAxis = { x: 0, y: 0 };

  private onKeyDown = (e: KeyboardEvent) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!this.keys.has(e.code)) {
      for (const a of KEY_BINDINGS[e.code] ?? []) this.pressed.add(a);
    }
    this.keys.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onBlur = () => {
    this.keys.clear();
    this.touchDown.clear();
    this.touchAxis = { x: 0, y: 0 };
  };

  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  // ------------------------------------------------------------ API usada pelo jogo
  isDown(action: Action): boolean {
    if (this.touchDown.has(action)) return true;
    for (const k of this.keys) if (KEY_BINDINGS[k]?.includes(action)) return true;
    return false;
  }

  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  /** Eixo de movimento (comprimento ≤ 1). Teclado e analógico virtual combinados. */
  axis(): { x: number; y: number } {
    if (this.touchAxis.x !== 0 || this.touchAxis.y !== 0) return { ...this.touchAxis };
    const any = (list: string[]) => list.some((k) => this.keys.has(k));
    let x = 0;
    let y = 0;
    if (any(AXIS_KEYS.left)) x -= 1;
    if (any(AXIS_KEYS.right)) x += 1;
    if (any(AXIS_KEYS.up)) y -= 1;
    if (any(AXIS_KEYS.down)) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  // ------------------------------------------------------------ API usada pelos controles touch
  setTouchAxis(x: number, y: number) {
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.touchAxis = { x, y };
  }

  setTouchAction(action: Action, down: boolean) {
    if (down) {
      if (!this.touchDown.has(action)) this.pressed.add(action);
      this.touchDown.add(action);
    } else {
      this.touchDown.delete(action);
    }
  }

  /** Solta tudo (usado quando uma cutscene bloqueia os controles). */
  releaseAll() {
    this.touchDown.clear();
    this.touchAxis = { x: 0, y: 0 };
  }

  endFrame() {
    this.pressed.clear();
  }
}
