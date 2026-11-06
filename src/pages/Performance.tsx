import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bloco, Capsule, Contexto, Dot, fmtNum, fmtPct, Hl, Intro, NameAvatar, Pilulas, Pill } from '@/components/kit';
import { EASE, Page, SPRING, Stagger } from '@/components/motion';
import { carteira, fechamento, mapaAtividade, resumoAtendimento, resumoDemos } from '@/data/metrics/indicadores';
import { type LinhaVendedor, linhasVendedores, STATUS_VENDEDOR, type StatusVendedor } from '@/data/metrics/vendedores';
import { DAY, fmtMinutes } from '@/data/time';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

type Indicador = 'sla' | 'conversao' | 'parados' | 'whatsapp';

const IND: Record<Indicador, { rotulo: string; pergunta: string; valor: (l: LinhaVendedor) => number | null; fmt: (v: number | null) => string; maiorMelhor: boolean }> = {
  sla: { rotulo: '1º contato em 1h', pergunta: 'Quem atende o lead em até 1 hora útil', valor: (l) => l.sla, fmt: (v) => fmtPct(v), maiorMelhor: true },
  conversao: { rotulo: 'Conversão', pergunta: 'Quem transforma lead recebido em cadastro', valor: (l) => l.conversao, fmt: (v) => fmtPct(v), maiorMelhor: true },
  parados: { rotulo: 'Parados agora', pergunta: 'Quem tem leads há mais de 48h sem interação', valor: (l) => l.parados, fmt: (v) => fmtNum(v), maiorMelhor: false },
  whatsapp: { rotulo: 'WhatsApp do CRM', pergunta: 'Quem usa o WhatsApp de dentro do CRM (registra sozinho)', valor: (l) => l.whatsapp, fmt: (v) => fmtPct(v), maiorMelhor: true },
};

export function Performance() {
  const { ds, views, agora, config, vendedores, metas, okrs } = usePainel();
  const p = config.params;
  const [params, setParams] = useSearchParams();
  const [ind, setInd] = useState<Indicador>('sla');

  const { linhas, time } = useMemo(() => {
    const ini = agora - 30 * DAY;
    const linhas = linhasVendedores(views, ds, p, agora, vendedores, metas);
    const r = resumoAtendimento(views, ds, p, ini, agora);
    const c = carteira(views, agora, p);
    const f = fechamento(views, ini, agora);
    const dm = resumoDemos(views, agora, ini, agora);
    return {
      linhas,
      time: { sla: r.slaPct, med: r.medianaPrimeiroContatoMin, parados: c.parados, conversao: r.recebidos ? (f.ganhos / r.recebidos) * 100 : null, whatsapp: r.usoWhatsappCrmPct, comp: dm.comparecimentoPct },
    };
  }, [ds, views, agora, p, vendedores, metas]);

  const krs = okrs.flatMap((o) => o.resultados);
  const metaInd: Record<Indicador, number | null> = {
    sla: krs.find((k) => k.indicador === 'sla_1h')?.alvo ?? null,
    conversao: null,
    parados: null,
    whatsapp: krs.find((k) => k.indicador === 'uso_whatsapp_crm')?.alvo ?? null,
  };
  const mediaTime: Record<Indicador, number | null> = { sla: time.sla, conversao: time.conversao, parados: linhas.length ? time.parados / linhas.length : null, whatsapp: time.whatsapp };

  const pior = [...linhas].sort((a, b) => (a.sla ?? 0) - (b.sla ?? 0))[0];
  const selId = params.get('v') ?? pior?.id;
  const det = linhas.find((l) => l.id === selId) ?? linhas[0];
  const selecionar = (id: string) => setParams({ v: id }, { replace: true });

  const criticos = linhas.filter((l) => (l.sla ?? 0) < 50);
  const bons = linhas.filter((l) => (l.sla ?? 0) >= 70);
  const media = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const convCriticos = media(criticos.map((l) => l.conversao));
  const convBons = media(bons.map((l) => l.conversao));

  // ranking
  const cfg = IND[ind];
  const ranking = [...linhas].sort((a, b) => ((cfg.valor(b) ?? 0) - (cfg.valor(a) ?? 0)) * (cfg.maiorMelhor ? 1 : -1));
  const maxV = ind === 'parados' ? Math.max(3, ...linhas.map((l) => l.parados)) : 100;
  const ruim = (l: LinhaVendedor) => {
    const v = cfg.valor(l) ?? 0;
    if (ind === 'parados') return v > 0;
    const ref = metaInd[ind] ?? mediaTime[ind] ?? 0;
    return ind === 'sla' ? v < 50 : ind === 'whatsapp' ? v < ref / 2 : v < ref - 5;
  };

  return (
    <Page className="gap-8">
      <Intro
        tag="Time · últimos 30 dias"
        title={
          criticos.length > 0 ? (
            <>
              <Hl>
                {criticos.length} {criticos.length === 1 ? 'vendedor faz' : 'vendedores fazem'}
              </Hl>{' '}
              menos da metade do 1º contato no <Pill>prazo</Pill> <Capsule />.
            </>
          ) : (
            <>
              Todo o time faz o 1º contato no <Pill>prazo</Pill> <Capsule /> na maioria dos leads.
            </>
          )
        }
        aside={
          convCriticos !== null && convBons !== null ? (
            <>
              Quem atende em até 1 hora em 70% ou mais dos leads converte {fmtPct(convBons)}. Quem fica abaixo de 50% converte {fmtPct(convCriticos)}. Os números por pessoa são
              simulados.
            </>
          ) : (
            'Os números por pessoa são simulados.'
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco titulo="Ranking" className="lg:col-span-2">
          <div className="flex flex-col gap-3">
            <Pilulas id="ind" label="Indicador" value={ind} onChange={setInd} options={(Object.keys(IND) as Indicador[]).map((k) => [k, IND[k].rotulo])} />
            <p className="text-sm text-muted-foreground">{cfg.pergunta}. Clique em um nome para ver o detalhe.</p>
          </div>
          <div className="flex flex-col gap-1">
            {ranking.map((l, i) => {
              const v = cfg.valor(l);
              const w = Math.max(0, Math.min(100, ((v ?? 0) / maxV) * 100));
              const ativo = l.id === det.id;
              return (
                <motion.button
                  key={l.id}
                  layout="position"
                  transition={SPRING}
                  type="button"
                  onClick={() => selecionar(l.id)}
                  className={cn('grid grid-cols-[132px_1fr_56px] items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors', ativo ? 'bg-muted' : 'hover:bg-muted/60')}
                >
                  <span className="flex items-center gap-2 truncate">
                    <NameAvatar nome={l.nome} size={24} />
                    <span className={cn(ativo && 'font-medium')}>{l.nome}</span>
                  </span>
                  <span className="relative h-2.5 rounded-full bg-track">
                    <motion.span
                      className={cn('absolute inset-y-0 left-0 rounded-full', ruim(l) ? 'bg-primary' : 'bg-ink')}
                      initial={{ width: 0 }}
                      animate={{ width: `${w}%` }}
                      transition={{ duration: 0.7, ease: EASE, delay: 0.05 + i * 0.03 }}
                    />
                    {ind !== 'parados' && mediaTime[ind] !== null && (
                      <span aria-hidden="true" className="absolute -inset-y-1.5 w-px border-l border-dashed border-ink/50" style={{ left: `${mediaTime[ind]}%` }} />
                    )}
                    {metaInd[ind] !== null && <span aria-hidden="true" className="absolute -inset-y-1.5 w-0.5 rounded-full bg-primary" style={{ left: `calc(${metaInd[ind]}% - 1px)` }} />}
                  </span>
                  <span className={cn('num text-right font-medium', ruim(l) && 'text-primary')}>{cfg.fmt(v)}</span>
                </motion.button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {ind !== 'parados' && (
              <span className="flex items-center gap-1.5">
                <span className="h-3 border-l border-dashed border-ink/60" /> média do time {cfg.fmt(mediaTime[ind])}
              </span>
            )}
            {metaInd[ind] !== null && (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-0.5 rounded-full bg-primary" /> meta {cfg.fmt(metaInd[ind])}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Dot color="var(--primary)" /> abaixo do esperado
            </span>
          </div>
        </Bloco>

        <Detalhe l={det} time={time} />
      </div>

      <Stagger className="grid gap-4 lg:grid-cols-3">
        <Bloco titulo="Processo × resultado" className="lg:col-span-2">
          <Dispersao linhas={linhas} selId={det.id} onSel={selecionar} mediaX={time.sla} mediaY={time.conversao} />
        </Bloco>
        <Bloco tom="pink" onda titulo="O que isso mostra">
          <p className="display text-[28px] leading-[1.15]">
            {convBons !== null && convCriticos !== null && convCriticos > 0 ? (
              <>Atender no prazo converte {fmtNum(convBons / convCriticos, 1)}× mais.</>
            ) : (
              <>Atender no prazo converte mais.</>
            )}
          </p>
          <p className="text-sm leading-relaxed text-white/85">
            Cada bolinha é um vendedor. Quanto mais à direita, mais leads atendidos em até 1 hora útil; quanto mais alto, mais cadastros. O canto de cima à direita é o processo
            funcionando.
          </p>
        </Bloco>
      </Stagger>
    </Page>
  );
}

function Detalhe({ l, time }: { l: LinhaVendedor; time: { sla: number | null; med: number | null; parados: number; conversao: number | null; whatsapp: number | null } }) {
  const { ds, agora, config } = usePainel();
  const m = useMemo(() => mapaAtividade(ds.interacoes, l.id, agora - 28 * DAY, agora), [ds, l.id, agora]);
  const maxM = Math.max(1, ...m.flat());
  const totalM = m.flat().reduce((a, b) => a + b, 0);
  const tardePct = totalM ? (m.reduce((s, dia) => s + dia[8] + dia[9], 0) / totalM) * 100 : 0;

  let leitura: string;
  if (tardePct >= 35) leitura = `${fmtPct(tardePct)} das interações são registradas depois das 16h, em bloco. Os leads da manhã esperam o dia todo.`;
  else if ((l.retroativos ?? 0) >= 15) leitura = `${fmtPct(l.retroativos)} das interações entram no CRM mais de 15 minutos depois. O contato acontece, o registro fica para depois.`;
  else if ((l.whatsapp ?? 0) < 10) leitura = `Quase não usa o WhatsApp do CRM (${fmtPct(l.whatsapp)}): cada mensagem precisa ser registrada à mão.`;
  else if (l.parados > 0) leitura = `Registra bem ao longo do dia, mas ${l.parados} ${l.parados === 1 ? 'lead está parado' : 'leads estão parados'} há mais de ${config.params.paradoHoras}h.`;
  else leitura = 'Registra ao longo do dia, logo depois de cada contato. É o padrão que o time deveria seguir.';

  const numeros: [string, string, string, boolean][] = [
    ['1º contato em 1h', fmtPct(l.sla), `time ${fmtPct(time.sla)}`, (l.sla ?? 0) < 50],
    ['Mediana até o contato', l.medianaMin === null ? '—' : fmtMinutes(l.medianaMin), `time ${time.med === null ? '—' : fmtMinutes(time.med)}`, (l.medianaMin ?? 0) > 60],
    ['Parados agora', fmtNum(l.parados), `carteira de ${l.carteira}`, l.parados > 0],
    ['Conversão', fmtPct(l.conversao), `time ${fmtPct(time.conversao)}`, (l.conversao ?? 0) < (time.conversao ?? 0) - 5],
  ];

  return (
    <Bloco titulo="Detalhe">
      <div className="flex items-center gap-3">
        <NameAvatar nome={l.nome} size={44} />
        <div className="flex flex-col">
          <span className="display text-2xl">{l.nome}</span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Dot color={STATUS_VENDEDOR[l.status as StatusVendedor].cor} />
            {STATUS_VENDEDOR[l.status as StatusVendedor].rotulo}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border">
        {numeros.map(([rot, v, ctx, mal]) => (
          <div key={rot} className="flex flex-col gap-1 bg-card p-3.5">
            <span className="text-xs text-muted-foreground">{rot}</span>
            <span className={cn('num text-2xl font-medium tracking-tight', mal && 'text-primary')}>{v}</span>
            <span className="text-xs text-muted-foreground">{ctx}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Registros por hora · 4 semanas (8h a 18h)</span>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }} role="img" aria-label="Mapa de registros por dia e hora">
          {m.flatMap((dia, di) =>
            dia.map((n, h) => (
              <motion.span
                key={`${di}-${h}`}
                className="aspect-square rounded-[4px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: (di * 10 + h) * 0.005 }}
                style={{ background: n === 0 ? 'var(--track)' : `color-mix(in oklch, var(--primary) ${Math.round(15 + (n / maxM) * 85)}%, white)` }}
                title={`${['Seg', 'Ter', 'Qua', 'Qui', 'Sex'][di]} ${8 + h}h: ${n}`}
              />
            )),
          )}
        </div>
      </div>
      <Contexto className="text-sm leading-relaxed text-foreground opacity-100" itens={[leitura]} />
    </Bloco>
  );
}

function Dispersao({ linhas, selId, onSel, mediaX, mediaY }: { linhas: LinhaVendedor[]; selId: string; onSel: (id: string) => void; mediaX: number | null; mediaY: number | null }) {
  const y1 = Math.max(10, Math.ceil((Math.max(...linhas.map((l) => l.conversao ?? 0)) + 3) / 5) * 5);
  const px = (v: number) => v;
  const py = (v: number) => (v / y1) * 100;
  const pontos: { l: LinhaVendedor; dx: number }[] = [];
  for (const l of [...linhas].sort((a, b) => (a.sla ?? 0) - (b.sla ?? 0))) {
    const perto = pontos.filter((q) => Math.abs(px(q.l.sla ?? 0) - px(l.sla ?? 0)) < 5 && Math.abs(py(q.l.conversao ?? 0) - py(l.conversao ?? 0)) < 9);
    pontos.push({ l, dx: perto.length ? Math.max(...perto.map((q) => q.dx)) + 30 : 0 });
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="relative mt-2 mr-5 mb-7 ml-10 h-[300px] border-b border-l border-ink/20">
        {[25, 50, 75].map((x) => (
          <span key={x} aria-hidden="true" className="absolute inset-y-0 border-l border-ink/[0.06]" style={{ left: `${x}%` }} />
        ))}
        {mediaX !== null && <span aria-hidden="true" className="absolute inset-y-0 border-l border-dashed border-ink/40" style={{ left: `${px(mediaX)}%` }} />}
        {mediaY !== null && <span aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-ink/40" style={{ bottom: `${py(mediaY)}%` }} />}
        {pontos.map(({ l, dx }) => {
          const ativo = l.id === selId;
          return (
            <motion.button
              key={l.id}
              type="button"
              onClick={() => onSel(l.id)}
              aria-label={`${l.nome}: ${fmtPct(l.sla)} no prazo, ${fmtPct(l.conversao)} de conversão`}
              title={`${l.nome}: ${fmtPct(l.sla)} no prazo · ${fmtPct(l.conversao)} de conversão`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: ativo ? 1.15 : 1 }}
              transition={SPRING}
              className={cn('absolute flex size-8 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-card', ativo ? 'z-10 bg-ink text-ink-foreground' : 'z-0 text-white')}
              style={{
                left: `calc(${px(l.sla ?? 0)}% - 16px + ${dx}px)`,
                bottom: `calc(${py(l.conversao ?? 0)}% - 16px)`,
                background: ativo ? undefined : STATUS_VENDEDOR[l.status].cor,
              }}
            >
              {l.nome.slice(0, 2).toUpperCase()}
            </motion.button>
          );
        })}
        <span className="absolute -top-2 -left-9 text-[11px] text-muted-foreground">{y1}%</span>
        <span className="absolute -bottom-2 -left-6 text-[11px] text-muted-foreground">0%</span>
        <span className="absolute right-0 -bottom-6 text-[11px] text-muted-foreground">100%</span>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground">1º contato em até 1h →</span>
        <span className="absolute top-1/2 -left-9 origin-center -translate-y-1/2 -rotate-90 text-[11px] whitespace-nowrap text-muted-foreground">conversão →</span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {(Object.keys(STATUS_VENDEDOR) as StatusVendedor[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <Dot color={STATUS_VENDEDOR[k].cor} />
            {STATUS_VENDEDOR[k].rotulo}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-3 border-l border-dashed border-ink/60" /> média do time
        </span>
      </div>
    </div>
  );
}
