/**
 * Peças com o mesmo visual do CRM da Revenda Mais (cartões do Kanban):
 * título "Contato - Revenda", origem com bolinha, etiqueta colorida,
 * "Resp: Nome", indicador de tempo e avatar com iniciais.
 */
import { CalendarDays, CircleArrowLeft, CircleArrowRight, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import type { Alerta, LeadView } from '@/data/metrics/estado';
import { MIN } from '@/data/time';
import { CANAL_COR, CANAL_LABEL, type Etapa } from '@/data/types';
import { NameAvatar } from './kit';

export const COR_ETIQUETA = {
  azul: '#8CB4E4',
  verde: '#5DBB4F',
  turquesa: '#2BBF8E',
  vermelho: '#E5484D',
  laranja: '#F2711C',
  ambar: '#E8A317',
  roxo: '#8E6BD9',
  cinza: '#9AA0A6',
} as const;

export function Etiqueta({ cor, children }: { cor: string; children: ReactNode }) {
  return (
    <span className="inline-flex h-[22px] items-center gap-1 rounded-[4px] px-1.5 text-[11.5px] font-medium whitespace-nowrap text-white" style={{ background: cor }}>
      <Tag className="size-3 fill-white/30" strokeWidth={2.2} />
      {children}
    </span>
  );
}

export function Origem({ canal, className }: { canal: LeadView['lead']['canal']; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] text-muted-foreground', className)}>
      <span className="size-2.5 rounded-full" style={{ background: CANAL_COR[canal] }} />
      {CANAL_LABEL[canal]}
    </span>
  );
}

/** "1 D", "4 h", "35 min", como no CRM. */
export function tempoCurto(ms: number): string {
  const m = Math.max(0, ms) / MIN;
  if (m < 60) return `${Math.max(1, Math.round(m))} min`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} h`;
  return `${Math.floor(h / 24)} D`;
}

/** Etiqueta do CRM para a etapa do lead. */
export function etiquetaDaEtapa(etapa: Etapa): { texto: string; cor: string } | null {
  if (etapa === 'demo_agendada') return { texto: 'Demonstração', cor: COR_ETIQUETA.verde };
  if (etapa === 'reagendar_demo') return { texto: 'Reagendar Demo', cor: COR_ETIQUETA.turquesa };
  if (etapa === 'negociacao') return { texto: 'Negociação', cor: COR_ETIQUETA.roxo };
  if (etapa === 'cadastrado') return { texto: 'Cadastrado', cor: COR_ETIQUETA.verde };
  if (etapa === 'sql' || etapa === 'qualificacao_sdr') return { texto: 'Qualificação', cor: COR_ETIQUETA.azul };
  return null;
}

/** Etiquetas de alerta do painel, no mesmo formato das etiquetas do CRM. */
export function etiquetaDoAlerta(a: Alerta, v: LeadView, agora: number): { texto: string; cor: string } | null {
  switch (a.tipo) {
    case 'sla_estourado':
      return { texto: `Sem contato · ${tempoCurto(agora - v.atribuidoEm)}`, cor: COR_ETIQUETA.vermelho };
    case 'prazo_correndo':
      return { texto: 'Aguardando 1º contato', cor: COR_ETIQUETA.ambar };
    case 'parado':
      return { texto: `Parado · ${Math.floor(v.horasSemInteracao)}h`, cor: COR_ETIQUETA.vermelho };
    case 'atencao':
      return { texto: `Atenção · ${Math.floor(v.horasSemInteracao)}h`, cor: COR_ETIQUETA.ambar };
    case 'demo_sem_desfecho':
      return { texto: 'Demo sem desfecho', cor: COR_ETIQUETA.laranja };
    case 'passo_vencido':
      return { texto: 'Passo vencido', cor: COR_ETIQUETA.laranja };
    default:
      return null;
  }
}

/** Indicador do canto do cartão: próxima atividade (verde) ou tempo desde a última (vermelho). */
export function IndicadorTempo({ v, agora }: { v: LeadView; agora: number }) {
  const proxima = v.proximoPasso?.previstoPara ?? v.proximaDemo?.agendadaPara ?? null;
  if (v.status === 'aberto' && proxima && proxima > agora) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground" title="Próxima atividade agendada">
        <CircleArrowRight className="size-4 text-green-600 dark:text-green-500" />
        {tempoCurto(proxima - agora)}
        <CalendarDays className="size-4 text-green-600 dark:text-green-500" />
      </span>
    );
  }
  const desde = v.ultimaInteracaoEm ?? v.atribuidoEm;
  const vencido = !!v.passoVencido || (v.status === 'aberto' && !proxima);
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground" title="Tempo desde a última interação">
      <CircleArrowLeft className="size-4 text-red-500" />
      {tempoCurto((v.fechadoEm ?? agora) - desde)}
      {vencido && v.status === 'aberto' && <CalendarDays className="size-4 text-red-500" />}
    </span>
  );
}

export function LeadCard({
  ref,
  v,
  agora,
  responsavel,
  alertas = [],
  onOpen,
  layoutId,
  delay = 0,
}: {
  ref?: Ref<HTMLButtonElement>;
  v: LeadView;
  agora: number;
  responsavel: string;
  alertas?: Alerta[];
  onOpen: () => void;
  layoutId?: string;
  delay?: number;
}) {
  const etapa = etiquetaDaEtapa(v.etapa);
  const tentativas = v.interacoes.filter((i) => i.tipo === 'tentativa_sem_resposta' && i.registradoEm >= v.atribuidoEm).length;
  const etiquetasAlerta = alertas.map((a) => etiquetaDoAlerta(a, v, agora)).filter((x): x is { texto: string; cor: string } => !!x).slice(0, 1);
  const titulo = `${v.lead.contato} - ${v.lead.revenda}`;
  return (
    <motion.button
      ref={ref}
      type="button"
      layout="position"
      layoutId={layoutId}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay, layout: { type: 'spring', stiffness: 420, damping: 38 } }}
      whileHover={{ y: -2 }}
      onClick={onOpen}
      className="group flex w-full flex-col gap-1.5 rounded-md border border-black/[0.06] bg-card p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.08)] transition-shadow outline-none hover:shadow-[0_4px_12px_rgba(16,24,40,0.12)] focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:border-white/[0.06] dark:shadow-none"
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13.5px] leading-snug font-medium text-foreground">{titulo}</span>
          <span className="truncate text-[13px] text-muted-foreground">{v.lead.contato}</span>
        </div>
        <NameAvatar nome={v.lead.contato} size={34} />
      </div>
      <Origem canal={v.lead.canal} />
      <div className="flex flex-wrap gap-1">
        {tentativas >= 1 && v.status === 'aberto' && <Etiqueta cor={COR_ETIQUETA.azul}>{tentativas + 1}ª tentativa</Etiqueta>}
        {etapa && <Etiqueta cor={etapa.cor}>{etapa.texto}</Etiqueta>}
        {etiquetasAlerta.map((e) => (
          <Etiqueta key={e.texto} cor={e.cor}>
            {e.texto}
          </Etiqueta>
        ))}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="truncate text-[13px] text-muted-foreground">Resp: {responsavel}</span>
        <IndicadorTempo v={v} agora={agora} />
      </div>
    </motion.button>
  );
}

