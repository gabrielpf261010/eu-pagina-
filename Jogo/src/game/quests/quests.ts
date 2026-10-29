import type { PuzzleDef, QuestDef, RouteDef } from './types';

/**
 * Missões do capítulo. Todos os itens e puzzles abaixo existem de verdade no jogo:
 * nenhuma missão depende de objeto inexistente (os materiais são garantidos em items/loot.ts).
 */
export const QUESTS: QuestDef[] = [
  {
    id: 'main',
    title: 'MISSÃO PRINCIPAL: ESCAPE DO GIL!',
    description:
      'A Lucivana apertou o botão do pânico e o PROTOCOLO GIL foi ativado. Explore a escola, vasculhe armários, fabrique ferramentas fictícias, resolva enigmas e encontre uma rota de fuga. O portão principal continua trancado.',
    difficulty: 'Principal',
    alwaysActive: true,
    objectives: [
      { id: 'explore', text: 'Explorar ambientes da escola', target: 6, reward: 'Conhecimento do mapa' },
      { id: 'loot', text: 'Vasculhar armários e gavetas', target: 5, reward: 'Materiais' },
      { id: 'escape', text: 'Escapar por qualquer rota', target: 1, reward: 'Liberdade!' },
    ],
    rewards: ['Fim do capítulo 1'],
  },
  {
    id: 'r1',
    title: 'Rota 1 — Jardim Secreto',
    description:
      'Três fragmentos de um mapa antigo, guardados em armários comuns, apontam para uma passagem secreta no jardim interno. Nenhum item raro é necessário.',
    difficulty: 'Fácil',
    objectives: [
      { id: 'frags', text: 'Encontrar 3 fragmentos de mapa', target: 3, reward: 'Fragmentos reunidos' },
      { id: 'craft', text: 'Combinar os fragmentos (FABRICAR → Plano do Jardim)', target: 1, reward: 'Plano do Jardim' },
      { id: 'reveal', text: 'Descobrir a passagem secreta no jardim interno', target: 1, reward: 'Local revelado' },
      { id: 'puzzle', text: 'Resolver o puzzle dos símbolos na pedra do jardim', target: 1, reward: 'Pedra destravada' },
      { id: 'escape', text: 'Abrir a passagem e escapar', target: 1, reward: 'FINAL: Jardim Secreto' },
    ],
    rewards: ['Final "Jardim Secreto"', 'Estatísticas da partida'],
  },
  {
    id: 'r2',
    title: 'Rota 2 — Biblioteca Misteriosa',
    description:
      'Uma anotação esquecida entre as estantes fala de uma ordem secreta dos livros. Acerte a sequência e a estante certa se move, revelando a passagem.',
    difficulty: 'Média',
    objectives: [
      { id: 'note', text: 'Encontrar a anotação com pistas (biblioteca)', target: 1, reward: 'Anotação antiga' },
      { id: 'visit', text: 'Investigar a biblioteca', target: 1, reward: 'Estante marcada' },
      { id: 'puzzle', text: 'Resolver o enigma da sequência de livros', target: 1, reward: 'Chave da Biblioteca' },
      { id: 'reveal', text: 'Encontrar a passagem atrás da estante', target: 1, reward: 'Local revelado' },
      { id: 'escape', text: 'Abrir a passagem secreta e escapar', target: 1, reward: 'FINAL: Biblioteca Misteriosa' },
    ],
    rewards: ['Final "Biblioteca Misteriosa"', 'Chave da Biblioteca'],
  },
  {
    id: 'r3',
    title: 'Rota 3 — Fuga Cinematográfica',
    description:
      'Componentes eletrônicos raros permitem fabricar o controle do terraço. Suba, desvie das patrulhas de Elaine e Gil e ative a sequência de fuga.',
    difficulty: 'Difícil',
    objectives: [
      { id: 'parts', text: 'Encontrar o módulo de sinal e a placa de acesso', target: 2, reward: 'Componentes' },
      { id: 'craft', text: 'Fabricar o Controle do Terraço', target: 1, reward: 'Controle do Terraço' },
      { id: 'puzzle', text: 'Resolver o puzzle de acesso ao terraço', target: 1, reward: 'Painel destravado' },
      { id: 'evade', text: 'Desviar das patrulhas de Elaine e Gil', target: 1, reward: 'Intruso invisível' },
      { id: 'escape', text: 'Ativar a sequência cinematográfica de fuga', target: 1, reward: 'FINAL: Fuga Cinematográfica' },
    ],
    rewards: ['Final "Fuga Cinematográfica"'],
  },
  {
    id: 'r4',
    title: 'Rota 4 — O Segredo do Gil',
    description:
      'Quatro documentos espalhados pelos dois andares revelam uma sala misteriosa atrás da Manutenção. Três enigmas separam você da verdade sobre o Gil.',
    difficulty: 'Secreta',
    objectives: [
      { id: 'docs', text: 'Encontrar os 4 documentos do Gil', target: 4, reward: 'Dossiê completo' },
      { id: 'reveal', text: 'Descobrir a sala misteriosa', target: 1, reward: 'Porta revelada' },
      { id: 'puzzle', text: 'Resolver os três enigmas da sala secreta', target: 3, reward: 'Enigmas resolvidos' },
      { id: 'door', text: 'Desbloquear a sala secreta', target: 1, reward: 'Sala aberta' },
      { id: 'final', text: 'Completar o desafio final envolvendo o Gil', target: 1, reward: 'FINAL ESPECIAL' },
    ],
    rewards: ['Final especial com revelação humorística'],
  },
];

export const QUEST_BY_ID = new Map(QUESTS.map((q) => [q.id, q]));

// ---------------------------------------------------------------- puzzles
export const PUZZLES: PuzzleDef[] = [
  {
    id: 'jardim',
    title: 'Puzzle dos Símbolos',
    prompt: 'Quatro símbolos estão gravados na pedra do jardim. Aperte-os na ordem do Plano do Jardim.',
    hint: 'O Plano do Jardim diz: "folha nasce, sol aquece, noite cheia, estrela guia".',
    kind: 'sequence',
    options: [
      { label: 'Folha', icon: '🍃' },
      { label: 'Sol', icon: '☀️' },
      { label: 'Noite', icon: '🌙' },
      { label: 'Estrela', icon: '⭐' },
    ],
    solution: ['Folha', 'Sol', 'Noite', 'Estrela'],
  },
  {
    id: 'estante',
    title: 'Enigma dos Livros',
    prompt: 'Cinco lombadas coloridas. Puxe-as na ordem certa para a estante se mover.',
    hint: 'A anotação diz: "Azul cala, Verde ensina, Vermelho grita, Amarelo ri — e o Roxo não entra na história."',
    kind: 'sequence',
    options: [
      { label: 'Azul', icon: '📘' },
      { label: 'Verde', icon: '📗' },
      { label: 'Vermelho', icon: '📕' },
      { label: 'Amarelo', icon: '📙' },
      { label: 'Roxo', icon: '📚' },
    ],
    solution: ['Azul', 'Verde', 'Vermelho', 'Amarelo'],
  },
  {
    id: 'terraco',
    title: 'Acesso ao Terraço',
    prompt: 'O painel pede o código de manutenção (4 dígitos).',
    hint: 'A plaquinha na placa de acesso diz: "código = ano da escola + nº de andares". Escola fundada em 2515, com 2 andares → 2517.',
    kind: 'code',
    digits: 4,
    solution: ['2', '5', '1', '7'],
  },
  {
    id: 'final',
    title: 'Os Três Enigmas do Gil',
    prompt: 'Um terminal acorda na sala secreta. Três enigmas — e depois, a verdade.',
    hint: 'Pense na escola, no tempo e no Gil.',
    kind: 'riddle',
    questions: [
      {
        q: 'ENIGMA 1 — "Tenho salas, mas não tenho casa. Tenho corredores, mas não ando. O que sou?"',
        options: ['O mapa', 'A escola', 'O Gil', 'O sino'],
        answer: 1,
        explain: 'A escola: tem tudo, mas nunca sai do lugar.',
      },
      {
        q: 'ENIGMA 2 — "Sempre corro atrás de você, mas nunca chego antes do fim da aula. O que sou?"',
        options: ['O horário', 'A prova', 'O Gil', 'A sirene'],
        answer: 2,
        explain: 'O Gil: corre, corre... e sempre chega depois.',
      },
      {
        q: 'ENIGMA 3 — "Quantos Gil existem de verdade?"',
        options: ['Um', 'Dois', 'Nenhum', 'Todos nós'],
        answer: 0,
        explain: 'Só existe um Gil. E ele está logo ali.',
      },
    ],
    ending: 'segredo',
  },
];

export const PUZZLE_BY_ID = new Map(PUZZLES.map((p) => [p.id, p]));

// ---------------------------------------------------------------- rotas
export const ROUTES: RouteDef[] = [
  {
    id: 'jardim',
    questId: 'r1',
    name: 'Jardim Secreto',
    difficulty: 'Fácil',
    floor: 'ground',
    tx: 37,
    ty: 50,
    revealItem: 'plano_jardim',
    puzzle: 'jardim',
    markerName: 'Pedra do Jardim',
    examine: 'Uma pedra com quatro símbolos gravados. Parece esconder algo embaixo.',
    escapeLabel: 'Escapar pelo jardim secreto',
    ending: 'Você desce pela passagem sob a pedra e sai do outro lado do muro. O Gil ainda está procurando você dentro da escola!',
  },
  {
    id: 'biblioteca',
    questId: 'r2',
    name: 'Biblioteca Misteriosa',
    difficulty: 'Média',
    floor: 'ground',
    tx: 114,
    ty: 36,
    revealItem: 'anotacao_biblioteca',
    puzzle: 'estante',
    markerName: 'Estante Diferente',
    examine: 'Uma estante levemente girada em relação às outras. Há marcas de uso nos livros.',
    escapeLabel: 'Abrir a passagem e escapar',
    ending: 'A estante gira, os livros se afastam e uma escada escura aparece atrás. Você desce em silêncio enquanto o Gil passa correndo pelo corredor!',
  },
  {
    id: 'terraco',
    questId: 'r3',
    name: 'Fuga Cinematográfica',
    difficulty: 'Difícil',
    floor: 'first',
    tx: 60,
    ty: 20,
    revealItem: 'controle_terraco',
    puzzle: 'terraco',
    markerName: 'Painel do Terraço',
    examine: 'Um painel metálico de manutenção com um teclado numérico.',
    escapeLabel: 'Ativar a sequência de fuga',
    ending: 'O terraço se abre, o vento bate no seu rosto e a câmera gira em câmera lenta: você atravessa a passarela dos fundos e desaparece na rua enquanto a sirene toca ao longe!',
  },
  {
    id: 'segredo',
    questId: 'r4',
    name: 'O Segredo do Gil',
    difficulty: 'Secreta',
    floor: 'ground',
    tx: 20,
    ty: 56,
    revealItem: 'doc_gil_4',
    puzzle: 'final',
    markerName: 'Porta Misteriosa',
    examine: 'Uma porta sem plaquinha, com quatro encaixes em forma de documento.',
    escapeLabel: 'Enfrentar o desafio final',
    ending:
      'A porta se abre. Lá dentro há... uma sala de professores IGUAL à outra, com um mural escrito "GIL FOI ALUNO AQUI EM 1998". A foto do mural é a sua. O Gil tira o capuz, dá de ombros e diz: "agora você entendeu". Parabéns: você escapou, virou lenda e ainda ganhou um cafezinho.',
  },
];

export const ROUTE_BY_ID = new Map(ROUTES.map((r) => [r.id, r]));

/** Salas visitáveis que contam para a missão principal (funciona nos dois andares). */
export const EXPLORABLE_ZONES = new Set([
  'Sala 04',
  'Sala 05',
  'Sala 07',
  'Sala 08',
  'Sala 09',
  'Refeitório',
  'Biblioteca',
  'Sala de Artes',
  'Sala de Uso Múltiplo',
  'Cozinha',
  'Quadra Descoberta',
  'Pátio Coberto',
  'Secretaria Escolar',
  'Sala da Coordenação',
  'Diretoria',
  'Cantina',
  'Sala dos Professores',
  'Sala de Pedagogia',
  'Sala de Manutenção',
  'Laboratório de Informática',
  'Jardim Interno',
  'Sala 25',
  'Sala 18',
  'Sala 24',
  'Corredor Ala Central',
  'Corredor Ala Leste',
]);
