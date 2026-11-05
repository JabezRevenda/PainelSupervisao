/**
 * Tipos que espelham as tabelas da réplica de leitura do CRM.
 * São os mesmos 12 conjuntos de dados do plano ("Dados que a TI precisa consultar").
 * A fonte simulada e a fonte real (API da réplica) devolvem exatamente estes formatos.
 *
 * Datas: sempre epoch em milissegundos (UTC). A conversão para o fuso de São Paulo
 * fica em `time.ts`.
 */

/** Etapas do CRM, na ordem do Kanban. */
export type Etapa =
  | 'lead_novo'
  | 'qualificacao_sdr'
  | 'lead_qualificado'
  | 'sql'
  | 'demo_agendada'
  | 'reagendar_demo'
  | 'negociacao'
  | 'cadastrado'
  | 'resgate_sdr'
  | 'limbo_sdr';

export const ETAPAS_CRM: Etapa[] = [
  'lead_novo',
  'qualificacao_sdr',
  'lead_qualificado',
  'sql',
  'demo_agendada',
  'reagendar_demo',
  'negociacao',
  'cadastrado',
  'resgate_sdr',
  'limbo_sdr',
];

export const ETAPA_LABEL: Record<Etapa, string> = {
  lead_novo: 'Lead novo - Marketing',
  qualificacao_sdr: 'Qualificação - SDR',
  lead_qualificado: 'Lead qualificado',
  sql: 'SQL',
  demo_agendada: 'Demonstração agendada',
  reagendar_demo: 'Reagendar Demonstração',
  negociacao: 'Negociação',
  cadastrado: 'Cadastrado',
  resgate_sdr: 'Resgate - SDR',
  limbo_sdr: 'Limbo - SDR',
};

/** Cor da bolinha de cada etapa (como no CRM). */
export const ETAPA_COR: Record<Etapa, string> = {
  lead_novo: '#60A5FA',
  qualificacao_sdr: '#38BDF8',
  lead_qualificado: '#2DD4BF',
  sql: '#34D399',
  demo_agendada: '#FACC15',
  reagendar_demo: '#FB7A3C',
  negociacao: '#A78BFA',
  cadastrado: '#22C55E',
  resgate_sdr: '#F472B6',
  limbo_sdr: '#A1A1AA',
};

/** Etapas da pré-vendas (IA + SDR). Ficam fora dos indicadores do painel. */
export const ETAPAS_PRE_VENDAS: Etapa[] = ['lead_novo', 'qualificacao_sdr', 'lead_qualificado', 'sql'];
/** Etapas em que o lead está com o vendedor. */
export const ETAPAS_VENDEDOR: Etapa[] = ['demo_agendada', 'reagendar_demo', 'negociacao'];
/** Saídas do vendedor quando não fecha (o lead volta para a pré-vendas). */
export const ETAPAS_PERDA: Etapa[] = ['resgate_sdr', 'limbo_sdr'];

/** Passos do funil do vendedor: as etapas do CRM por onde o lead passa até fechar. */
export type PassoFunil = 'demo_agendada' | 'negociacao' | 'cadastrado';
export const FUNIL: PassoFunil[] = ['demo_agendada', 'negociacao', 'cadastrado'];
export const FUNIL_LABEL: Record<PassoFunil, string> = {
  demo_agendada: 'Demonstração agendada',
  negociacao: 'Negociação',
  cadastrado: 'Cadastrado',
};

/** Origem do lead, como aparece no cartão do CRM. */
export type Canal = 'paid_search' | 'paid_social' | 'organic_search' | 'revenda_mais' | 'indicacao' | 'referral';

export const CANAL_LABEL: Record<Canal, string> = {
  paid_search: 'Paid Search',
  paid_social: 'Paid Social',
  organic_search: 'Organic Search',
  revenda_mais: 'Revenda Mais',
  indicacao: 'Indicação',
  referral: 'Referral',
};

export const CANAL_COR: Record<Canal, string> = {
  paid_search: '#EAB308',
  paid_social: '#3B82F6',
  organic_search: '#C084FC',
  revenda_mais: '#EF4444',
  indicacao: '#8B5CF6',
  referral: '#16A34A',
};

export const CANAIS: Canal[] = ['paid_search', 'paid_social', 'organic_search', 'revenda_mais', 'indicacao', 'referral'];

/** Tabela: usuários e equipes */
export interface Usuario {
  id: string;
  nome: string;
  funcao: 'vendedor' | 'sdr' | 'supervisao';
  equipe: 'inside_sales' | 'pre_vendas' | 'externo';
  ativo: boolean;
}

/** Tabela: leads / negócios (dados cadastrais e de origem) */
export interface Lead {
  id: string;
  criadoEm: number;
  /** Nome do contato, como foi digitado no CRM */
  contato: string;
  revenda: string;
  cidade: string;
  uf: string;
  canal: Canal;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string | null;
}

/** Tabela nova: histórico de atribuição (quem recebeu o lead e quando) */
export interface Atribuicao {
  id: string;
  leadId: string;
  vendedorAnteriorId: string | null;
  vendedorNovoId: string;
  atribuidoPorId: string;
  em: number;
}

/** Tabela nova: histórico de etapas */
export interface MudancaEtapa {
  id: string;
  leadId: string;
  de: Etapa | null;
  para: Etapa;
  em: number;
  usuarioId: string;
  /** Só quando o lead sai do vendedor sem fechar (lista obrigatória do CRM) */
  motivoPerdaId?: string;
}

export type TipoInteracao =
  | 'whatsapp_enviado'
  | 'lead_respondeu'
  | 'tentativa_sem_resposta'
  | 'videochamada'
  | 'email';

export const TIPO_INTERACAO_LABEL: Record<TipoInteracao, string> = {
  whatsapp_enviado: 'WhatsApp enviado',
  lead_respondeu: 'Lead respondeu',
  tentativa_sem_resposta: 'Tentativa sem resposta',
  videochamada: 'Videochamada',
  email: 'E-mail enviado',
};

/** Como a interação entrou no CRM */
export type ViaInteracao = 'whatsapp_crm' | 'registro_rapido' | 'manual';

/** Tabela existente: interações / anotações */
export interface Interacao {
  id: string;
  leadId: string;
  usuarioId: string;
  tipo: TipoInteracao;
  via: ViaInteracao;
  /** Horário do servidor (não editável). É o que o SLA usa. */
  registradoEm: number;
  /** Horário informado pelo vendedor (pode ser anterior ao registro). */
  ocorridoEm: number;
}

/** Tabela: tarefas e próximos passos */
export interface Tarefa {
  id: string;
  leadId: string;
  usuarioId: string;
  criadoEm: number;
  previstoPara: number;
  concluidoEm: number | null;
}

export type StatusDemo = 'agendada' | 'realizada' | 'nao_compareceu';

/** Tabela: demonstrações */
export interface Demo {
  id: string;
  leadId: string;
  vendedorId: string;
  criadoEm: number;
  agendadaPara: number;
  status: StatusDemo;
  desfechoEm: number | null;
}

/** Tabela auxiliar: motivos de perda (lista obrigatória do CRM) */
export interface MotivoPerda {
  id: string;
  nome: string;
}

/** Retrato do CRM em um instante. As métricas trabalham sempre sobre um Dataset. */
export interface Dataset {
  agora: number;
  usuarios: Usuario[];
  leads: Lead[];
  atribuicoes: Atribuicao[];
  etapas: MudancaEtapa[];
  interacoes: Interacao[];
  tarefas: Tarefa[];
  demos: Demo[];
  motivos: MotivoPerda[];
}

/** Tabela: parâmetros (tela de Configurações) */
export interface Parametros {
  /** SLA de primeiro contato do vendedor, em minutos úteis */
  slaPrimeiroContatoMin: number;
  /** Lead em atenção após X horas sem interação */
  atencaoHoras: number;
  /** Lead parado após X horas sem interação */
  paradoHoras: number;
  /** Dias úteis do SLA (0 = domingo ... 6 = sábado) */
  diasUteis: number[];
  /** Início e fim do expediente, em minutos desde a meia-noite */
  inicioMin: number;
  fimMin: number;
  /** Não contar sábado e domingo nos prazos de 24h e 48h */
  descontarFimDeSemana: boolean;
  /** Descontar feriados (em definição pela supervisão) */
  descontarFeriados: boolean;
  /** Datas no formato AAAA-MM-DD */
  feriados: string[];
}

/** Tabela: metas (cadastro de metas) */
export interface Meta {
  periodo: string; // AAAA-MM
  vendedorId: string;
  indicador: 'contratos_ganhos';
  alvo: number;
}

/** Tabela: OKRs */
export type IndicadorOkr =
  | 'sla_1h'
  | 'parados_agora'
  | 'com_proximo_passo'
  | 'contratos_mes'
  | 'uso_whatsapp_crm'
  | 'perdas_sem_interacao';

export interface ResultadoChave {
  id: string;
  nome: string;
  indicador: IndicadorOkr;
  alvo: number;
  /** true quando menor é melhor (ex.: leads parados) */
  menorMelhor: boolean;
  unidade: '%' | '';
}

export interface Objetivo {
  id: string;
  codigo: string;
  titulo: string;
  resultados: ResultadoChave[];
}
