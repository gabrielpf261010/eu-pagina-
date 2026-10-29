/** Todas as falas do capítulo 1 em um só lugar (fácil de editar/traduzir). */

export const pick = <V,>(arr: readonly V[]): V => arr[Math.floor(Math.random() * arr.length)];

/** Falas obrigatórias da Lucivana, por limiar de paciência. */
export const THRESHOLD_LINES = [
  { at: 70, text: 'Turma, vamos prestar atenção!', kind: 'normal' as const },
  { at: 40, text: 'EU NÃO VOU FICAR FALANDO!', kind: 'angry' as const },
  { at: 15, text: 'SE VOCÊS NÃO FICAREM QUIETOS, EU VOU APERTAR O BOTÃO DO PÂNICO!', kind: 'shout' as const },
];

export const TEACHER_LESSON = [
  'Hoje vamos falar de crase!',
  'Quem sabe o que é um substantivo?',
  'Sujeito e predicado, pessoal...',
  'Abram o livro na página 42.',
  'Atenção na pontuação!',
  'Adjetivo dá qualidade ao substantivo.',
  'Isso cai na prova, hein!',
];

export const STUDENT_CHAT = [
  'Psiu!',
  'Viu o jogo ontem?',
  'Que fome...',
  'Me empresta a caneta?',
  'Quando acaba essa aula?',
  'Cala a boca, senão ela vê!',
  'Hihihi',
  'Tá valendo nota?',
  'Shhh!',
];

export const STUDENT_REPLIES = [
  'Fala baixo!',
  'Hahaha, para!',
  'Shh, a professora tá olhando!',
  'Eita, tá doido?',
  'Hoje o jogador tá solto!',
  'Depois eu te conto.',
];

export const PLAYER_TALK = ['Psiu!', 'E aí?', 'Ei, tá entendendo?', 'Cola aí?', 'Olha isso...'];

/** As três primeiras são as falas do enunciado; o resto é bônus. */
export const PANIC_LINES = [
  'CORRE, É O GIL!',
  'EU NÃO FIZ NADA!',
  'SAI DA FRENTE!',
  'MÃEEEEE!',
  'É O PROTOCOLO GIL!',
  'ELE VEM AÍ!',
  'NÃO EMPURRA!',
  'EU TÔ SEM PROVA!',
];

export const PAPER_HIT_STUDENT = ['Ai!', 'Ei!', 'Quem foi?!', 'Opa!'];

export interface PrankDef {
  id: string;
  message: string;
  bubble: string | null;
  cost: number;
  sfx: 'pop' | 'thud' | 'raspberry';
}

export const PRANKS: PrankDef[] = [
  { id: 'careta', message: 'Você fez uma careta engraçada! 🤪', bubble: null, cost: 4, sfx: 'pop' },
  { id: 'mesa', message: 'TUM TUM TUM! Você batucou na carteira!', bubble: '*tum tum tum*', cost: 5, sfx: 'thud' },
  { id: 'imitar', message: 'Você imitou a Lucivana! A turma riu!', bubble: '"Atenção, turma!"', cost: 8, sfx: 'pop' },
  { id: 'pum', message: 'PRRRRT! A turma explodiu em risadas!', bubble: 'PRRRRT!', cost: 7, sfx: 'raspberry' },
];

export interface PropAction {
  label: string;
  message: string;
  cost: number;
  sfx: 'pop' | 'thud';
}
