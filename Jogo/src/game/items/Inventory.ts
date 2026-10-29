import { getItem } from './catalog';
import type { ItemStack, Recipe } from './types';

let uidCounter = 0;
/** ID único de pilha. */
export const newUid = () => `s${++uidCounter}`;

/**
 * Grade de espaços com pilhas. Serve para a mochila do jogador E para qualquer recipiente
 * (armário, gaveta, caixa...). Todas as operações são atômicas: ou acontecem por inteiro
 * ou não acontecem, então itens nunca somem nem se duplicam.
 */
export class Inventory {
  slots: Array<ItemStack | null>;

  constructor(public capacity: number) {
    this.slots = Array.from({ length: capacity }, () => null);
  }

  get used() {
    return this.slots.reduce((n, s) => n + (s ? 1 : 0), 0);
  }

  get isEmpty() {
    return this.used === 0;
  }

  get free() {
    return this.capacity - this.used;
  }

  /** Amplia a capacidade (futuras mochilas maiores). */
  expand(extra: number) {
    for (let i = 0; i < extra; i++) this.slots.push(null);
    this.capacity += extra;
  }

  count(id: string): number {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.qty;
    return n;
  }

  /** Quantas unidades deste item ainda cabem. */
  spaceFor(id: string): number {
    const max = getItem(id).maxStack;
    let space = 0;
    for (const s of this.slots) {
      if (!s) space += max;
      else if (s.id === id) space += max - s.qty;
    }
    return space;
  }

  /** Adiciona e devolve a sobra (0 = tudo coube). */
  add(id: string, qty: number): number {
    const max = getItem(id).maxStack;
    let left = qty;
    if (max > 1) {
      for (const s of this.slots) {
        if (s && s.id === id && s.qty < max) {
          const n = Math.min(max - s.qty, left);
          s.qty += n;
          left -= n;
          if (left <= 0) return 0;
        }
      }
    }
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i]) {
        const n = Math.min(max, left);
        this.slots[i] = { uid: newUid(), id, qty: n };
        left -= n;
        if (left <= 0) return 0;
      }
    }
    return left;
  }

  /** Remove `qty` do espaço indicado. Devolve quantas unidades saíram. */
  removeAt(index: number, qty: number): number {
    const s = this.slots[index];
    if (!s) return 0;
    const n = Math.min(qty, s.qty);
    s.qty -= n;
    if (s.qty <= 0) this.slots[index] = null;
    return n;
  }

  /** Remove por ID (só se houver quantidade suficiente). */
  removeId(id: string, qty: number): boolean {
    if (this.count(id) < qty) return false;
    let left = qty;
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id) left -= this.removeAt(i, left);
    }
    return true;
  }

  /** Move/troca/junta pilhas entre dois espaços. */
  move(a: number, b: number) {
    if (a === b) return;
    const sa = this.slots[a];
    const sb = this.slots[b];
    if (!sa) return;
    if (!sb) {
      this.slots[b] = sa;
      this.slots[a] = null;
      return;
    }
    const max = getItem(sa.id).maxStack;
    if (sa.id === sb.id && max > 1 && sb.qty < max) {
      const n = Math.min(max - sb.qty, sa.qty);
      sb.qty += n;
      sa.qty -= n;
      if (sa.qty <= 0) this.slots[a] = null;
      return;
    }
    this.slots[a] = sb;
    this.slots[b] = sa;
  }

  clone(): Inventory {
    const c = new Inventory(this.capacity);
    c.slots = this.slots.map((s) => (s ? { ...s } : null));
    return c;
  }

  /**
   * Fabricação transacional: testa tudo numa cópia e só confirma se der certo.
   * Nunca consome ingredientes sem entregar o resultado.
   */
  tryCraft(r: Recipe): 'ok' | 'ingredients' | 'space' {
    for (const ing of r.ingredients) if (this.count(ing.id) < ing.qty) return 'ingredients';
    const copy = this.clone();
    for (const ing of r.ingredients) copy.removeId(ing.id, ing.qty);
    if (copy.add(r.result.id, r.result.qty) > 0) return 'space';
    this.slots = copy.slots;
    return 'ok';
  }

  hasAll(r: Recipe): boolean {
    return r.ingredients.every((i) => this.count(i.id) >= i.qty);
  }
}
