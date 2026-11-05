import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Etiqueta, etiquetaDaEtapa, etiquetaDoAlerta, Origem, tempoCurto } from '@/components/crm';
import { NameAvatar } from '@/components/kit';
import { EASE } from '@/components/motion';
import { alertas } from '@/data/metrics/estado';
import { fmtDateTime, fmtMinutes, fmtRelativeDay, fmtTime } from '@/data/time';
import { CANAL_LABEL, ETAPA_COR, ETAPA_LABEL, TIPO_INTERACAO_LABEL } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

interface Evento {
  em: number;
  texto: string;
  nivel: 0 | 1 | 2;
  cor?: string;
}

const VIA: Record<string, string> = {
  whatsapp_crm: 'pelo WhatsApp do CRM',
  registro_rapido: 'registro rápido',
  manual: 'registro manual',
};

const QUEM: Record<string, string> = { integracao: 'Marketing', 'ia-triagem': 'IA de triagem' };

export function LeadSheet() {
  const { leadAberto, abrirLead, views, agora, config, nome, ds } = usePainel();
  const v = useMemo(() => views.find((x) => x.lead.id === leadAberto) ?? null, [views, leadAberto]);
  const p = config.params;

  const conteudo = useMemo(() => {
    if (!v) return null;
    const al = alertas(v, agora, p);
    const quem = (id: string) => QUEM[id] ?? nome(id);
    const ev: Evento[] = [];
    for (const h of v.historico) {
      const motivo = h.motivoPerdaId ? ` · ${ds.motivos.find((m) => m.id === h.motivoPerdaId)?.nome}` : '';
      ev.push({ em: h.em, texto: `${ETAPA_LABEL[h.para]}${motivo} · ${quem(h.usuarioId)}`, nivel: h.para === 'resgate_sdr' || h.para === 'limbo_sdr' ? 1 : 0, cor: ETAPA_COR[h.para] });
    }
    for (const a of v.atribuicoes) {
      ev.push({
        em: a.em + 1,
        texto: a.vendedorAnteriorId
          ? `Trocado de ${nome(a.vendedorAnteriorId)} para ${nome(a.vendedorNovoId)}: o prazo de 1 hora recomeça`
          : `Atribuído a ${nome(a.vendedorNovoId)} por ${quem(a.atribuidoPorId)}`,
        nivel: 0,
      });
    }
    for (const i of v.interacoes) {
      const atraso = i.registradoEm - i.ocorridoEm > 15 * 60_000 ? ` · registrado às ${fmtTime(i.registradoEm)}` : '';
      ev.push({ em: i.ocorridoEm, texto: `${TIPO_INTERACAO_LABEL[i.tipo]} (${VIA[i.via]})${atraso}`, nivel: 0 });
    }
    for (const d of v.demos) {
      if (d.status === 'realizada' && d.desfechoEm) ev.push({ em: d.desfechoEm - 1, texto: `Demo de ${fmtDateTime(d.agendadaPara)} realizada`, nivel: 0 });
      if (d.status === 'nao_compareceu' && d.desfechoEm) ev.push({ em: d.desfechoEm - 1, texto: `Não compareceu à demo de ${fmtDateTime(d.agendadaPara)}`, nivel: 1 });
    }
    if (v.primeiroContatoEm === null && v.status === 'aberto' && agora >= v.prazoSla) ev.push({ em: v.prazoSla, texto: 'Prazo de 1 hora útil estourado sem nenhuma interação', nivel: 2 });
    if (v.passoVencido) ev.push({ em: v.passoVencido.previstoPara, texto: 'Próximo passo venceu sem contato', nivel: 1 });
    ev.sort((a, b) => a.em - b.em);
    const proximo = v.proximoPasso
      ? `${fmtRelativeDay(v.proximoPasso.previstoPara, agora)} às ${fmtTime(v.proximoPasso.previstoPara)}`
      : v.proximaDemo
        ? `Demo ${fmtRelativeDay(v.proximaDemo.agendadaPara, agora)} às ${fmtTime(v.proximaDemo.agendadaPara)}`
        : v.passoVencido
          ? `Vencido (${fmtRelativeDay(v.passoVencido.previstoPara, agora)})`
          : 'Nenhum';
    return { al, ev, proximo };
  }, [v, agora, p, nome, ds.motivos]);

  const etapa = v ? etiquetaDaEtapa(v.etapa) : null;

  return (
    <Sheet open={!!v} onOpenChange={(o) => !o && abrirLead(null)}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {v && conteudo && (
          <>
            <SheetHeader className="gap-3 border-b p-5">
              <div className="flex items-start gap-3 pr-8">
                <NameAvatar nome={v.lead.contato} size={40} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <SheetTitle className="text-base leading-snug">
                    {v.lead.contato} - {v.lead.revenda}
                  </SheetTitle>
                  <SheetDescription>
                    {v.lead.cidade}/{v.lead.uf} · {ETAPA_LABEL[v.etapa]}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Origem canal={v.lead.canal} />
                <span className="text-muted-foreground/50">·</span>
                {etapa && <Etiqueta cor={etapa.cor}>{etapa.texto}</Etiqueta>}
                {conteudo.al.map((a) => {
                  const e = etiquetaDoAlerta(a, v, agora);
                  return e ? (
                    <Etiqueta key={a.tipo} cor={e.cor}>
                      {e.texto}
                    </Etiqueta>
                  ) : null;
                })}
              </div>
            </SheetHeader>

            <div className="grid grid-cols-3 divide-x border-b text-sm">
              <div className="flex flex-col gap-1 p-4">
                <span className="text-xs text-muted-foreground">Sem interação</span>
                <span className="num font-medium">{tempoCurto((v.fechadoEm ?? agora) - (v.ultimaInteracaoEm ?? v.atribuidoEm))}</span>
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="text-xs text-muted-foreground">1º contato</span>
                <span className="num font-medium">{v.primeiroContatoMin !== null ? fmtMinutes(v.primeiroContatoMin) : '—'}</span>
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="text-xs text-muted-foreground">Próximo passo</span>
                <span className={cn('font-medium', conteudo.proximo.startsWith('Vencido') || conteudo.proximo === 'Nenhum' ? 'text-primary' : '')}>{conteudo.proximo}</span>
              </div>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-b p-5 text-sm">
              <dt className="text-muted-foreground">Responsável</dt>
              <dd className="text-right">{nome(v.vendedorId)}</dd>
              <dt className="text-muted-foreground">Recebido</dt>
              <dd className="num text-right">{fmtDateTime(v.atribuidoEm)}</dd>
              <dt className="text-muted-foreground">Origem</dt>
              <dd className="text-right">{CANAL_LABEL[v.lead.canal]}</dd>
              <dt className="text-muted-foreground">Campanha</dt>
              <dd className="truncate text-right font-mono text-xs leading-5">{v.lead.utmCampaign ?? '—'}</dd>
            </dl>

            <div className="flex flex-col p-5">
              <h3 className="mb-3 text-sm font-medium">Linha do tempo</h3>
              <ol className="flex flex-col">
                {conteudo.ev.map((e, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: EASE, delay: Math.min(i * 0.03, 0.5) }}
                    className="grid grid-cols-[14px_1fr] gap-3"
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={cn('mt-1.5 size-2 rounded-full', e.nivel === 2 ? 'bg-primary' : e.nivel === 1 ? 'bg-warning' : 'bg-muted-foreground/40')}
                        style={e.cor && e.nivel === 0 ? { background: e.cor } : undefined}
                      />
                      {i < conteudo.ev.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="flex flex-col gap-0.5 pb-4">
                      <span className="num text-xs text-muted-foreground">{fmtDateTime(e.em)}</span>
                      <span className={cn('text-sm leading-snug', e.nivel === 2 ? 'text-primary' : e.nivel === 1 ? 'text-warning-foreground' : '')}>{e.texto}</span>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>

            <Separator />
            <SheetFooter className="flex-row gap-2 p-5">
              <Button className="flex-1">Enviar WhatsApp pelo CRM</Button>
              <Button variant="outline" className="flex-1">
                Abrir no CRM
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
