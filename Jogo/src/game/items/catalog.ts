import type { ContainerKind, ItemCategory, ItemDef, LootSpec, Rarity, Recipe } from './types';

export const RARITY_META: Record<Rarity, { label: string; color: string; bg: string }> = {
  comum: { label: 'COMUM', color: '#cbd5e1', bg: 'rgba(203,213,225,0.10)' },
  incomum: { label: 'INCOMUM', color: '#4ade80', bg: 'rgba(74,222,128,0.13)' },
  raro: { label: 'RARO', color: '#60a5fa', bg: 'rgba(96,165,250,0.16)' },
  lendario: { label: 'LENDÁRIO', color: '#fbbf24', bg: 'rgba(251,191,36,0.20)' },
};

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  escolar: 'Material escolar',
  comida: 'Comida',
  ferramenta: 'Ferramenta',
  peca: 'Peça',
  eletronico: 'Eletrônico',
  cartao: 'Cartão de acesso',
  equipamento: 'Equipamento',
  chave: 'Item-chave',
};

const loot = (kinds: ContainerKind[], weight: number, min = 1, max = 1): LootSpec => ({ kinds, weight, min, max });

/**
 * Catálogo de itens (todos fictícios).
 *  COMUM    materiais escolares e comida
 *  INCOMUM  cordas, peças e ferramentas
 *  RARO     componentes eletrônicos, cartões de missão e materiais especiais
 *  LENDÁRIO objetos únicos ligados às rotas secretas de fuga (posição garantida no mapa)
 */
export const ITEMS: ItemDef[] = [
  // ------------------------------------------------------------ COMUM — material escolar
  { id: 'caderno', name: 'Caderno', icon: '📓', description: 'Um caderno de capa dura, quase sem folhas em branco.', rarity: 'comum', category: 'escolar', maxStack: 4, loot: loot(['locker', 'backpack', 'cabinet', 'drawer'], 9) },
  { id: 'lapis', name: 'Lápis', icon: '✏️', description: 'Lápis nº 2, apontado até o toco.', rarity: 'comum', category: 'escolar', maxStack: 12, loot: loot(['locker', 'backpack', 'drawer', 'cabinet'], 10, 1, 3) },
  { id: 'caneta', name: 'Caneta', icon: '🖊️', description: 'Caneta azul. A tinta ainda funciona.', rarity: 'comum', category: 'escolar', maxStack: 12, loot: loot(['locker', 'backpack', 'drawer'], 9, 1, 2) },
  { id: 'borracha', name: 'Borracha', icon: '🧼', description: 'Apaga erros de português... e alguns de matemática.', rarity: 'comum', category: 'escolar', maxStack: 8, loot: loot(['locker', 'backpack', 'drawer'], 6) },
  { id: 'papel', name: 'Folhas de papel', icon: '📄', description: 'Folhas soltas. Ótimas para bolinhas de papel e rabiscos.', rarity: 'comum', category: 'escolar', maxStack: 20, loot: loot(['locker', 'backpack', 'drawer', 'cabinet'], 9, 1, 4) },
  { id: 'regua', name: 'Régua', icon: '📏', description: 'Régua de 30 cm com as pontas lascadas.', rarity: 'comum', category: 'escolar', maxStack: 4, loot: loot(['locker', 'backpack', 'drawer'], 5) },
  { id: 'fita', name: 'Fita adesiva', icon: '📼', description: 'Rolo de fita adesiva. Cola quase tudo.', rarity: 'comum', category: 'escolar', maxStack: 4, loot: loot(['drawer', 'cabinet', 'backpack'], 7) },
  { id: 'tecido', name: 'Retalho de tecido', icon: '🧵', description: 'Pedaço de pano resistente de uma cortina velha.', rarity: 'comum', category: 'peca', maxStack: 6, loot: loot(['locker', 'cabinet', 'backpack'], 7, 1, 2) },

  // ------------------------------------------------------------ COMUM — comida (restaura energia)
  { id: 'maca', name: 'Maçã', icon: '🍎', description: 'Uma maçã crocante. Restaura 15 de energia.', rarity: 'comum', category: 'comida', maxStack: 4, use: { type: 'energy', amount: 15 }, loot: loot(['fridge', 'backpack', 'locker'], 10) },
  { id: 'cereal', name: 'Barra de cereal', icon: '🍫', description: 'Barrinha de cereal com chocolate. Restaura 20 de energia.', rarity: 'comum', category: 'comida', maxStack: 6, use: { type: 'energy', amount: 20 }, loot: loot(['fridge', 'backpack', 'locker', 'drawer'], 10) },
  { id: 'suco', name: 'Suco de caixinha', icon: '🧃', description: 'Suco de uva geladinho. Restaura 25 de energia.', rarity: 'comum', category: 'comida', maxStack: 4, use: { type: 'energy', amount: 25 }, loot: loot(['fridge', 'backpack'], 9) },
  { id: 'sanduiche', name: 'Sanduíche', icon: '🥪', description: 'Pão com queijo e presunto. Restaura 30 de energia.', rarity: 'comum', category: 'comida', maxStack: 3, use: { type: 'energy', amount: 30 }, loot: loot(['fridge', 'backpack'], 8) },

  // ------------------------------------------------------------ INCOMUM — cordas, peças, ferramentas
  { id: 'corda', name: 'Corda', icon: '🪢', description: 'Corda grossa de uns 5 metros. Combina com um gancho.', rarity: 'incomum', category: 'ferramenta', maxStack: 2, loot: loot(['crate', 'cabinet'], 7) },
  { id: 'gancho', name: 'Gancho de metal', icon: '🪝', description: 'Gancho de metal fictício, ótimo para prender uma corda.', rarity: 'incomum', category: 'peca', maxStack: 2, loot: loot(['crate', 'cabinet'], 6) },
  { id: 'espuma', name: 'Espuma', icon: '🧽', description: 'Espuma macia de carteira velha. Amortece qualquer coisa.', rarity: 'incomum', category: 'peca', maxStack: 4, loot: loot(['crate', 'cabinet', 'locker'], 6) },
  { id: 'pedaco_mapa', name: 'Pedaço de mapa', icon: '🗺️', description: 'Um pedaço rasgado de um mapa antigo da escola. Junte vários!', rarity: 'incomum', category: 'peca', maxStack: 6, loot: loot(['drawer', 'backpack', 'cabinet', 'locker'], 6) },
  { id: 'chave_boca', name: 'Chave de boca', icon: '🔧', description: 'Ferramenta da manutenção. Pesada, mas confiável.', rarity: 'incomum', category: 'ferramenta', maxStack: 1, loot: loot(['crate', 'cabinet'], 4) },
  { id: 'engrenagem', name: 'Engrenagem', icon: '⚙️', description: 'Engrenagem de metal solta de algum equipamento.', rarity: 'incomum', category: 'peca', maxStack: 6, loot: loot(['crate', 'cabinet'], 4) },
  { id: 'lanterna', name: 'Lanterna de bolso', icon: '🔦', description: 'Lanterna pequena, sem pilhas.', rarity: 'incomum', category: 'ferramenta', maxStack: 1, loot: loot(['crate', 'cabinet'], 3) },
  { id: 'marmita', name: 'Marmita', icon: '🍱', description: 'Arroz, feijão e frango da cozinha. Restaura 60 de energia.', rarity: 'incomum', category: 'comida', maxStack: 2, use: { type: 'energy', amount: 60 }, loot: loot(['fridge'], 7) },
  { id: 'cafe', name: 'Café forte', icon: '☕', description: 'Café coado da sala dos professores. Restaura 45 de energia.', rarity: 'incomum', category: 'comida', maxStack: 2, use: { type: 'energy', amount: 45 }, loot: loot(['fridge', 'cabinet'], 4) },

  // ------------------------------------------------------------ RARO — eletrônicos e materiais especiais
  { id: 'circuito', name: 'Placa de circuito', icon: '🔌', description: 'Placa eletrônica fictícia, ainda funcional.', rarity: 'raro', category: 'eletronico', maxStack: 4, loot: loot(['drawer', 'cabinet', 'crate'], 5) },
  { id: 'bateria', name: 'Bateria', icon: '🔋', description: 'Bateria recarregável com carga de sobra.', rarity: 'raro', category: 'eletronico', maxStack: 4, loot: loot(['drawer', 'cabinet', 'crate'], 5) },
  { id: 'energetico', name: 'Energético', icon: '⚡', description: 'Lata gelada de energético. Restaura TODA a energia.', rarity: 'raro', category: 'comida', maxStack: 2, use: { type: 'energy', amount: 100 }, loot: loot(['fridge', 'backpack'], 3) },

  // cartões de missão (posição garantida no mapa — desbloqueiam áreas específicas)
  { id: 'cartao_gas', name: 'Cartão: Central de Gás', icon: '💳', description: 'Cartão de acesso da manutenção. Abre a porta da Central de Gás.', rarity: 'raro', category: 'cartao', maxStack: 1, use: { type: 'card', lock: 'gas' } },
  { id: 'cartao_sala25', name: 'Cartão: Sala 25', icon: '🪪', description: 'Cartão de missão com a etiqueta "Sala 25 · 1º andar".', rarity: 'raro', category: 'cartao', maxStack: 1, use: { type: 'card', lock: '1-sala-25' } },

  // ------------------------------------------------------------ LENDÁRIO — rotas secretas
  { id: 'planta_tunel', name: 'Planta do Túnel Antigo', icon: '📜', description: 'Planta amarelada de uma passagem esquecida sob a Manutenção. Rota secreta (em breve!).', rarity: 'lendario', category: 'chave', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'planta_tunel', text: 'Você estuda a planta: um túnel antigo sai da Manutenção e vai até o fim do terreno. Essa rota secreta será usada nas próximas versões!' } },
  { id: 'gancho_dourado', name: 'Gancho Dourado do Zelador', icon: '🥇', description: 'Ferramenta única do zelador, de uma rota de fuga secreta pelos telhados (em breve!).', rarity: 'lendario', category: 'chave', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'gancho_dourado', text: 'O gancho brilha de um jeito estranho... Parece servir para uma rota secreta pelos telhados. Guarde-o para as próximas versões!' } },
  { id: 'selo_diretoria', name: 'Selo da Diretoria', icon: '🔱', description: 'Selo oficial único. Dizem que abre uma saída que ninguém conhece (em breve!).', rarity: 'lendario', category: 'chave', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'selo_diretoria', text: 'O selo pulsa levemente. Ele está ligado a uma saída secreta que será revelada nas próximas versões!' } },

  // ------------------------------------------------------------ fabricados (não aparecem como loot)
  { id: 'kit_escalada', name: 'Kit de escalada', icon: '🧗', description: 'Corda presa a um gancho. Use junto ao muro dos fundos para abrir uma rota de fuga.', rarity: 'raro', category: 'equipamento', maxStack: 1, use: { type: 'climb' } },
  { id: 'distrator', name: 'Distrator eletrônico', icon: '📻', description: 'Dispositivo que apita por alguns segundos e atrai o Gil para longe de você.', rarity: 'incomum', category: 'eletronico', maxStack: 3, use: { type: 'decoy' } },
  { id: 'mapa_pistas', name: 'Mapa de pistas', icon: '🧭', description: 'Marca no mapa e no cenário rotas, portas com cartão e itens raros.', rarity: 'incomum', category: 'ferramenta', maxStack: 1, use: { type: 'clues' } },
  { id: 'protecao', name: 'Proteção improvisada', icon: '🛡️', description: 'Absorve UMA captura do Gil e o deixa atordoado por alguns segundos.', rarity: 'incomum', category: 'equipamento', maxStack: 2, use: { type: 'shield' } },

  // ------------------------------------------------------------ v0.6 — itens das rotas de fuga
  { id: 'frag_jardim', name: 'Fragmento de mapa', icon: '🧩', description: 'Pedaço de um mapa do jardim interno. Junte 3 e fabrique o Plano do Jardim.', rarity: 'incomum', category: 'peca', maxStack: 3, loot: loot(['locker', 'backpack', 'drawer', 'cabinet'], 7) },
  { id: 'plano_jardim', name: 'Plano do Jardim', icon: '🗺️', description: 'Os 3 fragmentos unidos: "folha nasce, sol aquece, noite cheia, estrela guia". Marca a Pedra do Jardim.', rarity: 'raro', category: 'chave', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'plano_jardim', text: 'O plano aponta a Pedra do Jardim, no Jardim Interno do térreo. Os símbolos devem ser apertados nessa ordem: 🍃 ☀️ 🌙 ⭐' } },
  { id: 'anotacao_biblioteca', name: 'Anotação antiga', icon: '📃', description: 'Bilhete esquecido numa estante: "Azul cala, Verde ensina, Vermelho grita, Amarelo ri — e o Roxo não entra na história."', rarity: 'raro', category: 'chave', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'anotacao_biblioteca', text: 'A ordem dos livros é: 📘 Azul, 📗 Verde, 📕 Vermelho, 📙 Amarelo. Procure a estante diferente da biblioteca.' } },
  { id: 'chave_biblioteca', name: 'Chave da Biblioteca', icon: '🔑', description: 'Chave de missão, recompensa do enigma dos livros. Abre a passagem atrás da estante.', rarity: 'raro', category: 'chave', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'chave_biblioteca', text: 'A chave é fria e pesada. Use-a na Estante Diferente para escapar.' } },
  { id: 'modulo_sinal', name: 'Módulo de sinal', icon: '📡', description: 'Componente eletrônico do laboratório. Parte do Controle do Terraço.', rarity: 'raro', category: 'eletronico', maxStack: 2, loot: loot(['crate', 'cabinet', 'drawer'], 4) },
  { id: 'placa_acesso', name: 'Placa de acesso', icon: '🧾', description: 'Placa de manutenção com um rabisco: "código = ano da escola + nº de andares (2515, 2 andares)".', rarity: 'raro', category: 'peca', maxStack: 2, loot: loot(['crate', 'cabinet', 'drawer'], 4) },
  { id: 'controle_terraco', name: 'Controle do Terraço', icon: '🎛️', description: 'Equipamento fictício de fuga: liga o painel do terraço e abre a passarela dos fundos.', rarity: 'raro', category: 'equipamento', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'controle_terraco', text: 'O controle acende. Leve-o ao Painel do Terraço, na Sala 18 do 1º andar, e digite o código.' } },
  { id: 'doc_gil_1', name: 'Documento do Gil I', icon: '📄', description: 'Ficha escolar antiga: "aluno transferido em 1998". Junte os 4 documentos.', rarity: 'raro', category: 'chave', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'doc1', text: 'Documento I/IV: "Transferência em 1998 — motivo: repetiu o ano 7 vezes." Sala misteriosa: atrás da Manutenção.' } },
  { id: 'doc_gil_2', name: 'Documento do Gil II', icon: '📋', description: 'Relatório da inspetoria sobre "o aluno que nunca sai". Junte os 4 documentos.', rarity: 'raro', category: 'chave', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'doc2', text: 'Documento II/IV: "Ele conhece cada corredor. Recomenda-se não correr nos corredores."' } },
  { id: 'doc_gil_3', name: 'Documento do Gil III', icon: '📑', description: 'Planta da escola com uma sala circulada a lápis vermelho. Junte os 4 documentos.', rarity: 'raro', category: 'chave', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'doc3', text: 'Documento III/IV: a sala circulada é a Sala dos Professores... duplicada?' } },
  { id: 'doc_gil_4', name: 'Documento do Gil IV', icon: '🗒️', description: 'Bilhete final: "a porta sem plaquinha na Manutenção leva à verdade". Junte os 4 documentos.', rarity: 'raro', category: 'chave', maxStack: 1, keyItem: true, use: { type: 'lore', flag: 'doc4', text: 'Documento IV/IV: "A porta sem plaquinha está na Sala de Manutenção. Ela guarda o segredo."' } },
  { id: 'mapa_completo', name: 'Mapa completo da escola', icon: '🗺️', description: 'Três pedaços unidos: o mapa inteiro da escola. Use para marcar pontos de interesse.', rarity: 'raro', category: 'ferramenta', maxStack: 1, keyItem: true, use: { type: 'clues' } },
];

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): ItemDef {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Item desconhecido: ${id}`);
  return d;
}

export const isStackable = (d: ItemDef) => d.maxStack > 1;

export const RECIPES: Recipe[] = [
  {
    id: 'kit_escalada',
    result: { id: 'kit_escalada', qty: 1 },
    ingredients: [
      { id: 'corda', qty: 1 },
      { id: 'gancho', qty: 1 },
    ],
    description: 'Corda + gancho. Permite escalar o muro dos fundos da escola (rota de fuga fictícia).',
  },
  {
    id: 'distrator',
    result: { id: 'distrator', qty: 1 },
    ingredients: [
      { id: 'circuito', qty: 1 },
      { id: 'bateria', qty: 1 },
    ],
    description: 'Circuito + bateria. Apita por 10 segundos e atrai o Gil para outro lugar do mapa.',
  },
  {
    id: 'mapa_pistas',
    result: { id: 'mapa_pistas', qty: 1 },
    ingredients: [
      { id: 'pedaco_mapa', qty: 2 },
      { id: 'fita', qty: 1 },
    ],
    description: 'Pedaços de mapa + fita. Revela no mapa pontos de interesse e rotas de fuga.',
  },
  {
    id: 'protecao',
    result: { id: 'protecao', qty: 1 },
    ingredients: [
      { id: 'tecido', qty: 2 },
      { id: 'espuma', qty: 1 },
    ],
    description: 'Tecido + espuma. Uma vestimenta acolchoada que segura uma captura do Gil.',
  },
  {
    id: 'plano_jardim',
    result: { id: 'plano_jardim', qty: 1 },
    ingredients: [{ id: 'frag_jardim', qty: 3 }],
    description: '3 fragmentos de mapa. Monta o Plano do Jardim e revela a Pedra do Jardim (Rota 1).',
  },
  {
    id: 'controle_terraco',
    result: { id: 'controle_terraco', qty: 1 },
    ingredients: [
      { id: 'modulo_sinal', qty: 1 },
      { id: 'placa_acesso', qty: 1 },
    ],
    description: 'Módulo de sinal + placa de acesso. Liga o painel do terraço (Rota 3).',
  },
  {
    id: 'mapa_completo',
    result: { id: 'mapa_completo', qty: 1 },
    ingredients: [{ id: 'pedaco_mapa', qty: 3 }],
    description: '3 pedaços de mapa. Completa o mapa da escola e marca pontos de interesse.',
  },
];
