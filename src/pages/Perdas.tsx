import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dot, fmtPct, NameAvatar, PageHeader, StatCard, Strong } from '@/components/kit';
import { EASE, GrowBar, Page, Reveal, Segmented, Stagger, itemVariants } from '@/components/motion';
import { perdas, resumoAtendimento } from '@/data/metrics/indicadores';
import { DAY, fmtDate } from '@/data/time';
import { ETAPA_COR, ETAPA_LABEL, type Etapa } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

type Janela = '30' | '60' | '90';

/** Etapas do vendedor de onde o lead sai quando é perdido. */
const ORIGEM_PERDA: Etapa[] = ['demo_agendada', 'reagendar_demo', 'negociacao'];

const DESTINOS: { etapa: Etapa; ajuda: string }[] = [
  { etapa: 'resgate_sdr', ajuda: 'Sem retorno, adiou ou não compareceu. O SDR tenta de novo.' },
  { etapa: 'limbo_sdr', ajuda: 'Preço, outro sistema ou concorrente. Fica parado na pré-vendas.' },
];

export function Perdas() {
  const { ds, views, agora, config, nome, abrirLead } = usePainel();
  const [janela, setJanela] = useState<Janela>('30');
  const dias = Number(janela);

  const d = useMemo(() => {
    const ini = agora - dias * DAY;
    const r = perdas(views, ini, agora);
    const anterior = perdas(views, ini - dias * DAY, ini).total;
    const lentos = new Set([...r.porVendedor.keys()].filter((id) => (resumoAtendimento(views, ds, config.params, ini, agora, id).slaPct ?? 100) < 50));
    return { ini, r, anterior, lentos };
  }, [views, ds, agora, dias, config.params]);

  const { ini, r, anterior, lentos } = d;
  const motivoNome = (id: string) => ds.motivos.find((m) => m.id === id)?.nome ?? 'Sem motivo';
  const motivos = [...r.porMotivo.entries()].sort((a, b) => b[1] - a[1]);
  const maxMotivo = Math.max(1, ...motivos.map((m) => m[1]));
  const semRetorno = r.porMotivo.get('sem_retorno') ?? 0;
  let semRetornoLentos = 0;
  for (const [id, pv] of r.porVendedor) if (lentos.has(id)) semRetornoLentos += pv.motivos.get('sem_retorno') ?? 0;

  const porEtapa = ORIGEM_PERDA.map((e) => ({ e, n: r.porEtapa.get(e) ?? 0 }));
  const maxEtapa = Math.max(1, ...porEtapa.map((x) => x.n));
  const naNegociacao = r.porEtapa.get('negociacao') ?? 0;
  const resgate = r.porDestino.get('resgate_sdr') ?? 0;
  const limbo = r.porDestino.get('limbo_sdr') ?? 0;

  const porVend = [...r.porVendedor.entries()]
    .map(([id, pv]) => ({ id, n: pv.n, resgate: pv.resgate, motivo: [...pv.motivos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] }))
    .sort((a, b) => b.n - a.n);
  const maxVend = Math.max(1, ...porVend.map((x) => x.n));
  const semInterPorVend = new Map<string, number>();
  for (const v of r.semInteracao) semInterPorVend.set(v.vendedorId, (semInterPorVend.get(v.vendedorId) ?? 0) + 1);
  const semInterLista = [...semInterPorVend.entries()].sort((a, b) => b[1] - a[1]);
  const pct = (n: number) => (r.total ? (n / r.total) * 100 : null);

  return (
    <Page>
      <PageHeader
        title="Perdas"
        description={
          <>
            Leads que o vendedor tirou da carteira de {fmtDate(ini)} a {fmtDate(agora)}. Foram <Strong>{r.total}</Strong>, e{' '}
            <Strong tone="primary">{r.semInteracao.length}</Strong> {r.semInteracao.length === 1 ? 'saiu' : 'saíram'} sem nenhuma interação registrada. O motivo vem da lista
            obrigatória do CRM.
          </>
        }
        actions={<Segmented id="janela-perdas" label="Janela" value={janela} onChange={setJanela} options={[['30', '30 dias'], ['60', '60 dias'], ['90', '90 dias']]} />}
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            label: 'Perdas no período',
            value: r.total,
            delta: (
              <span className="text-muted-foreground">
                {anterior} nos {dias} dias anteriores
              </span>
            ),
          },
          { label: 'Foram para Resgate - SDR', value: resgate, delta: <span className="text-muted-foreground">{fmtPct(pct(resgate))} das perdas · ainda dá para recuperar</span> },
          { label: 'Foram para Limbo - SDR', value: limbo, delta: <span className="text-muted-foreground">{fmtPct(pct(limbo))} das perdas</span> },
          {
            label: 'Sem nenhuma interação',
            value: r.semInteracao.length,
            delta: <span className={r.semInteracao.length ? 'text-primary' : 'text-muted-foreground'}>{fmtPct(pct(r.semInteracao.length))} das perdas</span>,
          },
        ].map((k) => (
          <motion.div key={k.label} variants={itemVariants}>
            <StatCard {...k} className="h-full" />
          </motion.div>
        ))}
      </Stagger>

      <Reveal className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Motivos de perda</CardTitle>
            <CardDescription>
              {r.total} {r.total === 1 ? 'lead perdido' : 'leads perdidos'} no período
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {motivos.map(([id, n], i) => (
              <div key={id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{motivoNome(id)}</span>
                  <span className="text-muted-foreground">
                    <span className="num font-medium text-foreground">{n}</span> · {fmtPct(pct(n))}
                  </span>
                </div>
                <GrowBar pct={(n / maxMotivo) * 100} className="h-2" color={i === 0 ? 'var(--primary)' : 'color-mix(in oklch, var(--primary) 45%, var(--muted))'} delay={0.1 + i * 0.05} />
                {id === 'sem_retorno' && semRetornoLentos > 0 && (
                  <span className="text-xs text-warning-foreground">
                    {semRetornoLentos} de {semRetorno} são de vendedores com menos de 50% de primeiro contato em até 1 hora.
                  </span>
                )}
              </div>
            ))}
            {motivos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma perda no período.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perdidos sem interação</CardTitle>
            <CardDescription>Marcados como perda sem nenhum contato registrado depois que o vendedor recebeu</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col divide-y rounded-lg border">
              {semInterLista.map(([id, n]) => (
                <div key={id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <NameAvatar nome={nome(id)} size={22} />
                    {nome(id)}
                  </span>
                  <span className="num font-medium">{n}</span>
                </div>
              ))}
              {semInterLista.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">Nenhuma no período.</p>}
            </div>
            {r.semInteracao.length > 0 && (
              <div className="flex flex-col gap-1">
                {r.semInteracao.slice(0, 4).map((v) => (
                  <Button key={v.lead.id} variant="link" size="sm" className="h-auto justify-start p-0 text-left font-normal" onClick={() => abrirLead(v.lead.id)}>
                    {v.lead.contato} - {v.lead.revenda}
                  </Button>
                ))}
              </div>
            )}
            <p className="mt-auto text-xs leading-relaxed text-muted-foreground">Com a trava da Fase 1, o CRM não deixa mover para Resgate ou Limbo sem pelo menos uma interação.</p>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Para onde o lead vai</CardTitle>
            <CardDescription>Quando o vendedor perde, o lead volta para a pré-vendas</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
              {DESTINOS.map(({ etapa }, i) => {
                const n = r.porDestino.get(etapa) ?? 0;
                return (
                  <motion.div
                    key={etapa}
                    className="h-full"
                    style={{ background: ETAPA_COR[etapa] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct(n) ?? 0}%` }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.1 }}
                  />
                );
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {DESTINOS.map(({ etapa, ajuda }) => {
                const n = r.porDestino.get(etapa) ?? 0;
                return (
                  <div key={etapa} className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Dot color={ETAPA_COR[etapa]} />
                      {ETAPA_LABEL[etapa]}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className="num text-2xl font-semibold tracking-tight">{n}</span>
                      <span className="text-sm text-muted-foreground">{fmtPct(pct(n))}</span>
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">{ajuda}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Em que etapa perdemos</CardTitle>
            <CardDescription>Etapa em que o lead estava quando saiu da carteira</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {porEtapa.map((x, i) => (
              <div key={x.e} className="grid grid-cols-[200px_1fr_72px] items-center gap-3 text-sm max-sm:grid-cols-[1fr_72px]">
                <span className="flex items-center gap-2 max-sm:col-span-2">
                  <Dot color={ETAPA_COR[x.e]} />
                  {ETAPA_LABEL[x.e]}
                </span>
                <GrowBar pct={(x.n / maxEtapa) * 100} className="h-2" color={ETAPA_COR[x.e]} delay={0.1 + i * 0.06} />
                <span className="num text-right">
                  <span className="font-medium">{x.n}</span> <span className="text-xs text-muted-foreground">{fmtPct(pct(x.n))}</span>
                </span>
              </div>
            ))}
            <p className="text-sm leading-relaxed text-muted-foreground">
              {fmtPct(pct(naNegociacao))} das perdas acontecem depois da demonstração, já em Negociação. Antes dela, {(r.porEtapa.get('demo_agendada') ?? 0) + (r.porEtapa.get('reagendar_demo') ?? 0)} leads
              saíram sem chegar a ver o sistema.
            </p>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle>Perdas por vendedor</CardTitle>
            <CardDescription>Quantidade, destino e motivo mais comum</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Vendedor</TableHead>
                <TableHead className="w-[30%]">Perdas</TableHead>
                <TableHead className="text-right">Para Resgate</TableHead>
                <TableHead className="text-right">Sem interação</TableHead>
                <TableHead className="pr-4">Motivo mais comum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porVend.map((x, i) => {
                const sem = semInterPorVend.get(x.id) ?? 0;
                return (
                  <TableRow key={x.id}>
                    <TableCell className="pl-4">
                      <span className="flex items-center gap-2.5">
                        <NameAvatar nome={nome(x.id)} size={26} />
                        {nome(x.id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <GrowBar pct={(x.n / maxVend) * 100} color={x.n === maxVend ? 'var(--primary)' : 'color-mix(in oklch, var(--foreground) 30%, transparent)'} delay={0.1 + i * 0.04} />
                        <span className="num w-6 text-right font-medium">{x.n}</span>
                      </div>
                    </TableCell>
                    <TableCell className="num text-right text-muted-foreground">{fmtPct(x.n ? (x.resgate / x.n) * 100 : null)}</TableCell>
                    <TableCell className={cn('num text-right', sem > 0 ? 'text-primary' : 'text-muted-foreground')}>{sem}</TableCell>
                    <TableCell className="pr-4 text-muted-foreground">{x.motivo ? motivoNome(x.motivo) : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {porVend.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma perda no período.</p>}
        </Card>
      </Reveal>
    </Page>
  );
}
