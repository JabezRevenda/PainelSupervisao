import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Bloco, Capsule, Contexto, Cta, fmtNum, fmtPct, Hl, Intro, Medidor, NameAvatar, Numero, Pill } from '@/components/kit';
import { EASE, Page, Stagger } from '@/components/motion';
import { metasDoMes } from '@/data/metrics/indicadores';
import { progresso, valorIndicador } from '@/data/metrics/okr';
import { DAY, fmtDate, monthName, startOfQuarter, wall } from '@/data/time';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

function fmtValor(v: number | null, unidade: '%' | '') {
  if (v === null) return '—';
  return unidade === '%' ? fmtPct(v) : fmtNum(v);
}

type Status = 'ok' | 'atras' | 'risco' | 'sem';

const STATUS: Record<Status, { rotulo: string; texto: string; barra: string }> = {
  ok: { rotulo: 'No caminho', texto: 'text-success', barra: 'bg-ink' },
  atras: { rotulo: 'Um pouco atrás', texto: 'text-warning-foreground', barra: 'bg-warning' },
  risco: { rotulo: 'Em risco', texto: 'text-primary', barra: 'bg-primary' },
  sem: { rotulo: 'Sem linha de base', texto: 'text-muted-foreground', barra: 'bg-ink/30' },
};

export function Metas() {
  const { ds, views, dsBase, viewsBase, agora, config, vendedores, metas, okrs, nome } = usePainel();
  const p = config.params;
  const ids = vendedores.map((v) => v.id);
  const chaveIds = ids.join();

  const mes = useMemo(() => metasDoMes(views, agora, p, metas, ids), [views, agora, p, metas, chaveIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const iniTri = startOfQuarter(agora);
  const fimTri = startOfQuarter(iniTri + 100 * DAY);
  const triPct = ((agora - iniTri) / (fimTri - iniTri)) * 100;
  const trimestre = `${Math.floor(wall(agora).getUTCMonth() / 3) + 1}º trimestre`;

  const krs = useMemo(() => {
    const ctx = { views, ds, p, metas, vendedores: ids };
    const ctxBase = dsBase ? { views: viewsBase, ds: dsBase, p, metas, vendedores: ids } : null;
    return okrs.map((o) => ({
      o,
      resultados: o.resultados.map((kr) => {
        const atual = valorIndicador(kr.indicador, ctx);
        const base = ctxBase ? valorIndicador(kr.indicador, ctxBase, true) : null;
        const prog = progresso(kr, base, atual);
        const status: Status = prog === null ? 'sem' : prog >= triPct - 5 ? 'ok' : prog >= triPct - 25 ? 'atras' : 'risco';
        return { kr, atual, base, prog, status };
      }),
    }));
  }, [okrs, views, ds, dsBase, viewsBase, p, metas, chaveIds, triPct]); // eslint-disable-line react-hooks/exhaustive-deps

  const esperadoAteHoje = (meta: number) => (meta * mes.diasPassados) / Math.max(mes.diasTotal, 1);
  const mesNome = monthName(agora);
  const esperadoTime = mes.diasTotal ? (mes.diasPassados / mes.diasTotal) * 100 : 0;

  return (
    <Page className="gap-8">
      <Intro
        tag={`Metas · ${mesNome} e ${trimestre}`}
        title={
          mes.faltam > 0 ? (
            <>
              Faltam <Hl>{mes.faltam} cadastros</Hl> para a meta. No ritmo atual, chegamos a <Pill>{mes.projecao}</Pill> <Capsule />.
            </>
          ) : (
            <>
              A meta de {mesNome} já foi <Pill>batida</Pill> <Capsule />: <Hl>{mes.ganhos} cadastros</Hl>.
            </>
          )
        }
        aside={<>A venda conta no mês em que o vendedor move o lead para Cadastrado, com contrato assinado e pago. Restam {mes.diasRestantes} dias úteis.</>}
        action={
          <Cta to="/configuracoes" tom="outline">
            Editar metas
          </Cta>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco tom="ink" onda titulo={`Meta de ${mesNome}`}>
          <Numero value={mes.ganhos} unidade={`de ${mes.meta} cadastros`} />
          <Medidor tom="ink" pct={mes.meta ? (mes.ganhos / mes.meta) * 100 : 0} marca={esperadoTime} />
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs opacity-70">Ritmo atual</span>
              <span className="display num text-3xl">{fmtNum(mes.ritmoAtual, 1)}</span>
              <span className="text-xs opacity-60">por dia útil</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs opacity-70">Ritmo necessário</span>
              <span className={cn('display num text-3xl', mes.ritmoNecessario !== null && mes.ritmoNecessario > mes.ritmoAtual && 'text-primary')}>{fmtNum(mes.ritmoNecessario, 1)}</span>
              <span className="text-xs opacity-60">por dia útil</span>
            </div>
          </div>
          <Contexto itens={[`projeção ${mes.projecao} (${fmtPct(mes.projecaoPct)})`, `${monthName(mes.ini - DAY)}: ${mes.ganhosMesAnterior}`]} />
        </Bloco>

        <Bloco titulo="Por vendedor" className="lg:col-span-2">
          <p className="-mt-2 text-sm text-muted-foreground">Cada quadrado é um cadastro da meta. A linha rosa mostra onde o vendedor deveria estar hoje.</p>
          <div className="flex flex-col">
            {mes.porVendedor.map((x, ri) => {
              const esperado = esperadoAteHoje(x.meta);
              const [rotulo, cor] =
                x.meta > 0 && x.ganhos >= x.meta
                  ? ['Meta batida', 'text-success']
                  : x.ganhos >= esperado + 0.5
                    ? ['Acima do ritmo', 'text-success']
                    : x.ganhos >= esperado - 0.5
                      ? ['No ritmo', 'text-muted-foreground']
                      : ['Abaixo do ritmo', 'text-primary'];
              const slots = Math.max(x.meta, x.ganhos, 1);
              return (
                <div key={x.id} className="grid grid-cols-[120px_1fr_56px_120px] items-center gap-4 border-t py-2.5 text-sm max-sm:grid-cols-[100px_1fr_48px]">
                  <span className="flex items-center gap-2">
                    <NameAvatar nome={nome(x.id)} size={24} />
                    {nome(x.id)}
                  </span>
                  <div className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}>
                    {Array.from({ length: slots }, (_, i) => (
                      <span key={i} className="relative h-3 overflow-hidden rounded-full bg-track">
                        {i < x.ganhos && (
                          <motion.span
                            className="absolute inset-0 origin-left rounded-full bg-ink"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.35, ease: EASE, delay: 0.15 + ri * 0.04 + i * 0.05 }}
                          />
                        )}
                      </span>
                    ))}
                    <span
                      aria-hidden="true"
                      title="Onde deveria estar hoje"
                      className="absolute -inset-y-1 w-0.5 rounded-full bg-primary"
                      style={{ left: `calc(${Math.min((esperado / slots) * 100, 100)}% - 1px)` }}
                    />
                  </div>
                  <span className="num text-right">
                    <span className="font-medium">{x.ganhos}</span>
                    <span className="text-muted-foreground">/{x.meta}</span>
                  </span>
                  <span className={cn('text-xs font-medium max-sm:hidden', cor)}>{rotulo}</span>
                </div>
              );
            })}
          </div>
        </Bloco>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="display text-[28px]">OKRs do {trimestre}</h2>
        <p className="text-sm text-muted-foreground">
          {fmtPct(triPct)} do trimestre já passou (a linha fina em cada barra). Linha de base: o CRM em {fmtDate(iniTri)}. Os alvos são exemplos até fechar 30 dias de medição.
        </p>
      </div>

      <Stagger className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {krs.map(({ o, resultados }, oi) => (
          <Bloco key={o.id}>
            <div className="flex items-start gap-4">
              <span className="display num text-[44px] leading-none text-primary">{String(oi + 1).padStart(2, '0')}</span>
              <h3 className="eyebrow pt-1 leading-snug">{o.titulo}</h3>
            </div>
            <div className="flex flex-col">
              {resultados.map(({ kr, atual, base, prog, status }, i) => (
                <div key={kr.id} className="flex flex-col gap-2 border-t py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm leading-snug">{kr.nome}</span>
                    <span className={cn('shrink-0 text-xs font-medium', STATUS[status].texto)}>{STATUS[status].rotulo}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="display num w-20 text-2xl">{fmtValor(atual, kr.unidade)}</span>
                    <div className="relative h-2 flex-1 rounded-full bg-track">
                      <motion.div
                        className={cn('absolute inset-y-0 left-0 rounded-full', STATUS[status].barra)}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, Math.min(100, prog ?? 0))}%` }}
                        transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.06 }}
                      />
                      <span aria-hidden="true" title="Onde deveria estar hoje" className="absolute -inset-y-1 w-px bg-ink/40" style={{ left: `${triPct}%` }} />
                    </div>
                    <span className="num w-16 text-right text-xs text-muted-foreground">alvo {fmtValor(kr.alvo, kr.unidade)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Linha de base {fmtValor(base, kr.unidade)} · {prog === null ? 'sem progresso calculado' : `${fmtPct(prog)} do caminho`}
                  </span>
                </div>
              ))}
            </div>
          </Bloco>
        ))}
      </Stagger>
    </Page>
  );
}
