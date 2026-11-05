import type { Canal, MotivoPerda, Usuario } from '../types';

/** Inside Sales (time acompanhado pelo painel). */
export const VENDEDORES: Usuario[] = [
  'Moises', 'Malu', 'Thyago', 'Jabez', 'Leonardo', 'Ramon', 'Renatha', 'Bianca',
].map((nome) => ({
  id: `v-${nome.toLowerCase()}`,
  nome,
  funcao: 'vendedor' as const,
  equipe: 'inside_sales' as const,
  ativo: true,
}));

/** Pré-vendas: triagem por IA + SDR. Fica fora dos indicadores do painel. */
export const PRE_VENDAS: Usuario[] = [
  { id: 'sdr-1', nome: 'SDR 1', funcao: 'sdr', equipe: 'pre_vendas', ativo: true },
  { id: 'sdr-2', nome: 'SDR 2', funcao: 'sdr', equipe: 'pre_vendas', ativo: true },
];

export const SUPERVISAO: Usuario = {
  id: 'sup-1',
  nome: 'Supervisão',
  funcao: 'supervisao',
  equipe: 'inside_sales',
  ativo: true,
};

export const MOTIVOS_PERDA: MotivoPerda[] = [
  { id: 'preco', nome: 'Preço / orçamento' },
  { id: 'sem_retorno', nome: 'Sem retorno do cliente' },
  { id: 'outro_sistema', nome: 'Já usa outro sistema' },
  { id: 'nao_compareceu', nome: 'Não compareceu e não remarcou' },
  { id: 'concorrente', nome: 'Fechou com concorrente' },
  { id: 'adiou', nome: 'Adiou a decisão' },
];

export const CANAIS_PESO: [Canal, number][] = [
  ['paid_search', 0.33],
  ['paid_social', 0.21],
  ['organic_search', 0.2],
  ['revenda_mais', 0.1],
  ['indicacao', 0.08],
  ['referral', 0.08],
];

export const UTM: Record<Canal, { source: string; medium: string; campaigns: [string | null, number][] }> = {
  paid_search: {
    source: 'google',
    medium: 'cpc',
    campaigns: [['gestao-estoque', 0.38], ['sistema-revenda-search', 0.32], ['marca-revenda-mais', 0.18], ['integracao-portais', 0.12]],
  },
  paid_social: {
    source: 'facebook',
    medium: 'paid-social',
    campaigns: [['lookalike-lojistas', 0.42], ['remarketing-site', 0.36], ['video-depoimentos', 0.22]],
  },
  organic_search: {
    source: 'google',
    medium: 'organic',
    campaigns: [['conteudo-blog', 0.45], ['calculadora-margem', 0.25], [null, 0.3]],
  },
  revenda_mais: { source: 'revendamais', medium: 'site', campaigns: [['teste-gratis', 0.6], [null, 0.4]] },
  indicacao: { source: 'indicacao', medium: 'cliente', campaigns: [[null, 1]] },
  referral: { source: 'parceiros', medium: 'referral', campaigns: [['portal-parceiro', 0.6], [null, 0.4]] },
};

/** Fator de qualidade por origem (multiplica as chances de avançar no funil). */
export const QUALIDADE_CANAL: Record<Canal, number> = {
  paid_search: 1.0,
  paid_social: 0.86,
  organic_search: 1.1,
  revenda_mais: 1.05,
  indicacao: 1.18,
  referral: 1.08,
};

const PRIMEIROS_NOMES = [
  'Murilo', 'Joel', 'Marcelo', 'Thalles', 'André', 'Anderson', 'João', 'Jaqueline', 'Delciane', 'Pollyanna',
  'Fábio', 'Katia', 'Gustavo', 'Aenderson', 'Carlos', 'Rafael', 'Juliana', 'Patrícia', 'Rodrigo', 'Luciano',
  'Fernanda', 'Diego', 'Vinícius', 'Adriana', 'Marcos', 'Renato', 'Sérgio', 'Cláudia', 'Paulo', 'Wesley',
  'Elaine', 'Leandro', 'Douglas', 'Simone', 'Robson', 'Edson', 'Michele', 'Alex', 'Valdir', 'Cristiane',
  'Gilberto', 'Tatiane', 'Fabrício', 'Rogério', 'Daniela', 'Wagner', 'Josiane', 'Everton', 'Lucas', 'Márcia',
];
const SOBRENOMES = [
  'Reis', 'Ribeiro', 'Borges', 'Marques', 'Rocha', 'Guerra', 'Lima', 'Souza', 'Oliveira', 'Santos',
  'Pereira', 'Costa', 'Almeida', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Cardoso', 'Teixeira',
  'Mendes', 'Nunes', 'Freitas', 'Moreira', 'Pinto', 'Batista', 'Vieira', 'Moraes', 'Correia', 'Dias',
];

/** Nome do contato. Alguns vêm só com o primeiro nome ou em minúsculas, como chegam no CRM. */
export function nomeContato(i: number, j: number, estilo: number): string {
  const nome = `${PRIMEIROS_NOMES[i % PRIMEIROS_NOMES.length]} ${SOBRENOMES[j % SOBRENOMES.length]}`;
  if (estilo < 0.12) return nome.toLowerCase();
  if (estilo < 0.3) return PRIMEIROS_NOMES[i % PRIMEIROS_NOMES.length];
  return nome;
}
export const N_PRIMEIROS = PRIMEIROS_NOMES.length;
export const N_SOBRENOMES = SOBRENOMES.length;

export const CIDADES: [string, string, number][] = [
  ['São Paulo', 'SP', 9], ['Campinas', 'SP', 4], ['Ribeirão Preto', 'SP', 3], ['Sorocaba', 'SP', 3],
  ['São José dos Campos', 'SP', 2], ['Santos', 'SP', 2], ['Bauru', 'SP', 2], ['Piracicaba', 'SP', 2],
  ['Curitiba', 'PR', 5], ['Londrina', 'PR', 3], ['Maringá', 'PR', 3], ['Cascavel', 'PR', 2],
  ['Joinville', 'SC', 3], ['Florianópolis', 'SC', 2], ['Blumenau', 'SC', 2], ['Chapecó', 'SC', 1],
  ['Porto Alegre', 'RS', 4], ['Caxias do Sul', 'RS', 2], ['Passo Fundo', 'RS', 1],
  ['Belo Horizonte', 'MG', 4], ['Uberlândia', 'MG', 3], ['Juiz de Fora', 'MG', 2], ['Contagem', 'MG', 1],
  ['Rio de Janeiro', 'RJ', 4], ['Niterói', 'RJ', 1], ['Vitória', 'ES', 2],
  ['Goiânia', 'GO', 3], ['Brasília', 'DF', 3], ['Campo Grande', 'MS', 2], ['Cuiabá', 'MT', 2],
  ['Salvador', 'BA', 3], ['Feira de Santana', 'BA', 1], ['Recife', 'PE', 3], ['Fortaleza', 'CE', 3],
  ['Natal', 'RN', 1], ['João Pessoa', 'PB', 1], ['Teresina', 'PI', 1], ['São Luís', 'MA', 1],
  ['Belém', 'PA', 2], ['Manaus', 'AM', 2],
];

const NOMES = [
  'Prime', 'Rota Sul', 'Garagem 21', 'Vitrine', 'Nova Era', 'Estação', 'Aliança', 'Top', 'Leste',
  'Ponto Certo', 'Mega', 'JL', 'Carvalho', 'Orion', 'Expresso', 'Rápido', 'Center', 'Classic',
  'Via Norte', 'Avenida', 'Ômega', 'Grand Prix', 'Imperial', 'Bela Vista', 'Horizonte', 'Primavera',
  'Atlântico', 'Master', 'Fênix', 'Pioneira', 'Elite', 'Nobre', 'Santa Rita', 'São Jorge',
  'Bandeirantes', 'Serra', 'Litoral', 'Capital', 'Unidas', 'Dois Irmãos', 'Trevo', 'Ipê', 'Monte Carlo',
  'Ponte Alta', 'Vale', 'Sol Nascente', 'Brasil', 'Paraná', 'Paulista', 'Mineira', 'Del Rey', 'Real',
  'Guarani', 'Itália', 'Europa', 'Américas', 'Rio Branco', 'Kennedy', 'Getúlio', 'Ouro Verde',
];
const SUFIXOS = ['Veículos', 'Multimarcas', 'Seminovos', 'Motors', 'Automóveis', 'Car', 'Autos'];

export function nomeRevenda(i: number, j: number): string {
  return `${NOMES[i % NOMES.length]} ${SUFIXOS[j % SUFIXOS.length]}`;
}
export const N_NOMES = NOMES.length;
export const N_SUFIXOS = SUFIXOS.length;

/** Perfis de comportamento sorteados entre os vendedores a cada semente (não refletem pessoas reais). */
export interface Perfil {
  /** Mediana (min úteis) até o 1º contato */
  primeiroContatoMin: number;
  sigma: number;
  /** Mediana (min úteis) entre interações de acompanhamento */
  intervaloMin: number;
  /** Chance de pular o contato antes da demo */
  pulaContato: number;
  comparecimento: number;
  proposta: number;
  negociacao: number;
  ganho: number;
  /** Fração das mensagens enviadas pelo botão de WhatsApp do CRM */
  usoWhatsappCrm: number;
  /** Chance de agendar próximo passo após cada interação */
  proximoPasso: number;
  /** Chance de registrar depois (registro retroativo) */
  registroAtrasado: number;
  /** Chance de "abandonar" o lead por alguns dias */
  abandono: number;
  /** Peso na distribuição feita pelos SDRs */
  carga: number;
}

export const PERFIS: Perfil[] = [
  { primeiroContatoMin: 10, sigma: 0.9, intervaloMin: 330, pulaContato: 0.01, comparecimento: 0.86, proposta: 0.76, negociacao: 0.78, ganho: 0.64, usoWhatsappCrm: 0.44, proximoPasso: 0.93, registroAtrasado: 0.03, abandono: 0.03, carga: 1.0 },
  { primeiroContatoMin: 15, sigma: 0.95, intervaloMin: 380, pulaContato: 0.02, comparecimento: 0.82, proposta: 0.72, negociacao: 0.75, ganho: 0.6, usoWhatsappCrm: 0.35, proximoPasso: 0.9, registroAtrasado: 0.05, abandono: 0.04, carga: 1.05 },
  { primeiroContatoMin: 22, sigma: 1.0, intervaloMin: 440, pulaContato: 0.03, comparecimento: 0.8, proposta: 0.68, negociacao: 0.72, ganho: 0.57, usoWhatsappCrm: 0.24, proximoPasso: 0.85, registroAtrasado: 0.06, abandono: 0.06, carga: 1.0 },
  { primeiroContatoMin: 30, sigma: 1.0, intervaloMin: 500, pulaContato: 0.04, comparecimento: 0.77, proposta: 0.65, negociacao: 0.7, ganho: 0.54, usoWhatsappCrm: 0.19, proximoPasso: 0.82, registroAtrasado: 0.08, abandono: 0.08, carga: 1.0 },
  { primeiroContatoMin: 40, sigma: 1.1, intervaloMin: 570, pulaContato: 0.06, comparecimento: 0.74, proposta: 0.62, negociacao: 0.68, ganho: 0.51, usoWhatsappCrm: 0.14, proximoPasso: 0.76, registroAtrasado: 0.1, abandono: 0.1, carga: 0.98 },
  { primeiroContatoMin: 55, sigma: 1.15, intervaloMin: 650, pulaContato: 0.08, comparecimento: 0.71, proposta: 0.58, negociacao: 0.66, ganho: 0.48, usoWhatsappCrm: 0.1, proximoPasso: 0.7, registroAtrasado: 0.13, abandono: 0.13, carga: 1.0 },
  { primeiroContatoMin: 75, sigma: 1.2, intervaloMin: 760, pulaContato: 0.11, comparecimento: 0.67, proposta: 0.52, negociacao: 0.63, ganho: 0.45, usoWhatsappCrm: 0.06, proximoPasso: 0.63, registroAtrasado: 0.17, abandono: 0.17, carga: 1.02 },
  { primeiroContatoMin: 100, sigma: 1.25, intervaloMin: 860, pulaContato: 0.14, comparecimento: 0.64, proposta: 0.48, negociacao: 0.6, ganho: 0.42, usoWhatsappCrm: 0.04, proximoPasso: 0.58, registroAtrasado: 0.22, abandono: 0.2, carga: 1.0 },
];
