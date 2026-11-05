import type { Objetivo, Parametros } from './types';

/** Feriados nacionais (Lei 662/1949 e alterações). Usados só se "descontar feriados" estiver ligado. */
export const FERIADOS_NACIONAIS = [
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-09-07',
  '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
  '2027-01-01', '2027-03-26', '2027-04-21', '2027-05-01', '2027-09-07',
  '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25',
];

/** Regras decididas com a supervisão (ver plano). */
export const PARAMETROS_PADRAO: Parametros = {
  slaPrimeiroContatoMin: 60,
  atencaoHoras: 24,
  paradoHoras: 48,
  diasUteis: [1, 2, 3, 4, 5],
  inicioMin: 8 * 60,
  fimMin: 18 * 60,
  descontarFimDeSemana: true,
  descontarFeriados: false,
  feriados: FERIADOS_NACIONAIS,
};

/** Meta mensal padrão de contratos ganhos por vendedor. */
export const META_PADRAO_POR_VENDEDOR = 5;

/** OKRs do trimestre. Os alvos são exemplos até a linha de base de 30 dias. */
export const OKRS_PADRAO: Objetivo[] = [
  {
    id: 'o1',
    codigo: 'O1',
    titulo: 'Todo lead do Inside Sales é trabalhado dentro do prazo',
    resultados: [
      { id: 'kr1', nome: '1º contato em até 1 hora útil', indicador: 'sla_1h', alvo: 85, menorMelhor: false, unidade: '%' },
      { id: 'kr2', nome: 'Leads parados há mais de 48h', indicador: 'parados_agora', alvo: 3, menorMelhor: true, unidade: '' },
      { id: 'kr3', nome: 'Leads abertos com próximo passo', indicador: 'com_proximo_passo', alvo: 100, menorMelhor: false, unidade: '%' },
      { id: 'kr4', nome: 'Cadastros no mês (projeção)', indicador: 'contratos_mes', alvo: 40, menorMelhor: false, unidade: '' },
    ],
  },
  {
    id: 'o2',
    codigo: 'O2',
    titulo: 'Toda interação com o lead passa pelo CRM',
    resultados: [
      { id: 'kr5', nome: 'Uso do WhatsApp do CRM', indicador: 'uso_whatsapp_crm', alvo: 60, menorMelhor: false, unidade: '%' },
      { id: 'kr6', nome: 'Perdas sem nenhuma interação (30 dias)', indicador: 'perdas_sem_interacao', alvo: 0, menorMelhor: true, unidade: '' },
    ],
  },
];
