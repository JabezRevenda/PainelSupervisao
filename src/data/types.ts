/**
 * Tipos que espelham as tabelas da réplica de leitura do CRM.
 * São os mesmos 12 conjuntos de dados do plano ("Dados que a TI precisa consultar").
 * A fonte simulada e a fonte real (API da réplica) devolvem exatamente estes formatos.
 *
 * Datas: sempre epoch em milissegundos (UTC). A conversão para o fuso de São Paulo
 * fica em `time.ts`.
 */

export type Etapa =
  | 'demo_agendada'
  | 'demo_realizada'
  | 'proposta_enviada'
  | 'negociacao'
  | 'ganho'
  | 'perdido';

/** Etapas do funil do vendedor, na ordem. O lead chega ao vendedor em "Demo agendada". */
export const ETAPAS_FUNIL: Etapa[] = [
  'demo_agendada',
  'demo_realizada',
  'proposta_enviada',
  'negociacao',
  'ganho',
];

export const ETAPA_LABEL: Record<Etapa, string> = {
  demo_agendada: 'Demo agendada',
  demo_realizada: 'Demo realizada',
  proposta_enviada: 'Proposta enviada',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

export type Canal = 'google_ads' | 'meta_ads' | 'site' | 'whatsapp_chat' | 'prospeccao';

export const CANAL_LABEL: Record<Canal, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  site: 'Site / orgânico',
  whatsapp_chat: 'WhatsApp / chat',
  prospeccao: 'Prospecção ativa',
};

export const CANAIS: Canal[] = ['google_ads', 'meta_ads', 'site', 'whatsapp_chat', 'prospeccao'];

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
  /** Só quando `para === 'perdido'` (lista obrigatória do CRM) */
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
