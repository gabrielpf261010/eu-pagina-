/** Tipos do sistema de itens, recipientes e fabricação. Tudo é mecânica fictícia de videogame. */

export type Rarity = 'comum' | 'incomum' | 'raro' | 'lendario';

export type ItemCategory =
  | 'escolar'
  | 'comida'
  | 'ferramenta'
  | 'peca'
  | 'eletronico'
  | 'cartao'
  | 'equipamento'
  | 'chave';

export type ContainerKind = 'cabinet' | 'locker' | 'crate' | 'drawer' | 'fridge' | 'backpack' | 'shelf';

/** Dificuldade da área: define quão raro é o loot encontrado ali. */
export type Tier = 'easy' | 'medium' | 'hard';

/** Efeito ao USAR um item (veja ItemSystem.useSlot). */
export type UseEffect =
  | { type: 'energy'; amount: number }
  | { type: 'decoy' }
  | { type: 'shield' }
  | { type: 'clues' }
  | { type: 'climb' }
  | { type: 'card'; lock: string }
  | { type: 'lore'; text: string; flag: string };

export interface LootSpec {
  kinds: ContainerKind[];
  weight: number;
  min: number;
  max: number;
}

export interface ItemDef {
  /** ID único do tipo de item. */
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: Rarity;
  category: ItemCategory;
  /** 1 = não empilha. */
  maxStack: number;
  use?: UseEffect;
  /** Itens-chave não podem ser descartados. */
  keyItem?: boolean;
  /** Onde aparece como loot aleatório (ausente = só por fabricação ou posição garantida). */
  loot?: LootSpec;
}

/** Uma pilha dentro de um espaço da mochila/recipiente. `uid` é único por pilha. */
export interface ItemStack {
  uid: string;
  id: string;
  qty: number;
}

export interface Recipe {
  id: string;
  result: { id: string; qty: number };
  ingredients: Array<{ id: string; qty: number }>;
  description: string;
}

export interface ActionResult {
  ok: boolean;
  text: string;
  /** Fecha a janela após a ação (ex.: depois de lançar o distrator). */
  close?: boolean;
}
