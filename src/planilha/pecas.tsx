import { motion } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { NameAvatar } from '@/components/kit';
import { EASE } from '@/components/motion';
import { cn } from '@/lib/utils';
import { usePlanilha } from './estado';
import { corCanal, fmtDia, type LeadP, REALIZADA_INFO } from './modelo';

export function OrigemP({ canal, className }: { canal: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-muted-foreground', className)}>
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: corCanal(canal) }} />
      {canal}
    </span>
  );
}

export function ChipReuniao({ l }: { l: LeadP }) {
  const i = REALIZADA_INFO[l.realizada];
  return <span className={cn('inline-flex h-7 items-center rounded-full border px-2.5 text-xs whitespace-nowrap', i.cls)}>{i.rotulo}</span>;
}

export function StatusLead({ l }: { l: LeadP }) {
  return <span className={cn('whitespace-nowrap', l.resultado === 'ganho' ? 'font-medium' : l.resultado === 'perdido' ? 'text-muted-foreground' : '')}>{l.status}</span>;
}

/** Lista de leads da planilha (reuniões, pendências, carteira do vendedor). */
export function TabelaLeads({ itens, limite = 20, semVendedor = false, vazio = 'Nenhum lead.' }: { itens: LeadP[]; limite?: number; semVendedor?: boolean; vazio?: string }) {
  const { abrirLead } = usePlanilha();
  const [tudo, setTudo] = useState(false);
  const vis = tudo ? itens : itens.slice(0, limite);
  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-2 pb-2 font-normal">Agendada em</th>
              <th className="px-2 pb-2 font-normal">Lead</th>
              {!semVendedor && <th className="px-2 pb-2 font-normal">Vendedor</th>}
              <th className="px-2 pb-2 font-normal">Origem</th>
              <th className="px-2 pb-2 font-normal">Reunião</th>
              <th className="px-2 pb-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {vis.map((l, i) => (
              <motion.tr
                key={l.uid}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE, delay: Math.min(i, 12) * 0.02 }}
                onClick={() => abrirLead(l.uid)}
                className="cursor-pointer border-t transition-colors hover:bg-muted/60"
              >
                <td className="num px-2 py-2.5 text-muted-foreground">{fmtDia(l.data)}</td>
                <td className="num px-2 font-medium">{l.id}</td>
                {!semVendedor && (
                  <td className="px-2">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <NameAvatar nome={l.vendedor} size={22} />
                      {l.vendedor}
                    </span>
                  </td>
                )}
                <td className="px-2">
                  <OrigemP canal={l.canal} />
                </td>
                <td className="px-2">
                  <ChipReuniao l={l} />
                </td>
                <td className="px-2">
                  <StatusLead l={l} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {itens.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{vazio}</p>}
      {itens.length > limite && (
        <button type="button" onClick={() => setTudo((t) => !t)} className="h-9 self-start rounded-full border border-ink/15 bg-card px-4 text-sm transition-colors hover:border-ink/40">
          {tudo ? 'Mostrar menos' : `Mostrar todos os ${itens.length}`}
        </button>
      )}
    </div>
  );
}

/** Barra fina empilhada (realizadas, não compareceram, sem desfecho). */
export function BarraReunioes({ realizadas, nao, pendentes, className }: { realizadas: number; nao: number; pendentes: number; className?: string }) {
  const total = realizadas + nao + pendentes;
  return (
    <div className={cn('flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-track', className)}>
      {(
        [
          [realizadas, 'var(--ink)'],
          [nao, 'var(--primary)'],
          [pendentes, 'var(--warning)'],
        ] as [number, string][]
      ).map(([n, cor], i) => (
        <motion.div key={i} className="h-full" style={{ background: cor }} initial={{ width: 0 }} animate={{ width: `${total ? (n / total) * 100 : 0}%` }} transition={{ duration: 0.8, ease: EASE, delay: 0.2 + i * 0.1 }} />
      ))}
    </div>
  );
}

/** Aviso discreto sobre o que a planilha não traz. */
export function AvisoPlanilha({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-ink/15 px-4 py-3 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}
