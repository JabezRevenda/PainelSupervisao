import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ring } from '@/components/charts';
import { Origem } from '@/components/crm';
import { fmtPct, NameAvatar, PageHeader, Strong } from '@/components/kit';
import { AnimatedNumber, EASE, GrowBar, Page, Reveal, Stagger, itemVariants } from '@/components/motion';
import type { LeadView } from '@/data/metrics/estado';
import { resumoDemos } from '@/data/metrics/indicadores';
import { DAY, fmtDate, fmtRelativeDay, fmtTime, HOUR, isBusinessDay, startOfDay, startOfWeek, weekdayShort } from '@/data/time';
import type { Demo } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

type Situacao = 'realizada' | 'faltou' | 'sem_desfecho' | 'agora' | 'agendada';

const SIT: Record<Situacao, { rotulo: string; cls: string; dot: string }> = {
  realizada: { rotulo: 'Realizada', cls: 'border-transparent bg-primary/10 text-primary', dot: 'bg-primary' },
  agora: { rotulo: 'Em andamento', cls: 'border-transparent bg-primary text-primary-foreground', dot: 'bg-primary' },
  faltou: { rotulo: 'Não compareceu', cls: 'border-transparent bg-muted text-muted-foreground', dot: 'bg-muted-foreground/50' },
  sem_desfecho: { rotulo: 'Sem desfecho', cls: 'border-transparent bg-warning/15 text-warning-foreground', dot: 'bg-warning' },
  agendada: { rotulo: 'Agendada', cls: '', dot: 'bg-muted-foreground/30' },
};

function situacao(d: Demo, agora: number): Situacao {
  if (d.status === 'realizada') return 'realizada';
  if (d.status === 'nao_compareceu') return 'faltou';
  if (d.agendadaPara > agora) return 'agendada';
  return agora - d.agendadaPara <= HOUR ? 'agora' : 'sem_desfecho';
}

export function Agenda() {
  const { views, agora, config, vendedores, nome, abrirLead } = usePainel();
  const p = config.params;

  const d = useMemo(() => {
    const hoje = startOfDay(agora);
    const todas: { d: Demo; v: LeadView }[] = [];
    for (const v of views) for (const dm of v.demos) todas.push({ d: dm, v });
    const doDia = (dia: number) => todas.filter((x) => x.d.agendadaPara >= dia && x.d.agendadaPara < dia + DAY).sort((a, b) => a.d.agendadaPara - b.d.agendadaPara);
    const semana: number[] = [];
    for (let dia = startOfWeek(agora); semana.length < 5; dia += DAY) if (isBusinessDay(dia, p)) semana.push(dia);
    let proximo = hoje + DAY;
    while (!isBusinessDay(proximo, p)) proximo += DAY;
    if (!semana.includes(proximo)) semana.push(proximo);
    const iniSemana = startOfWeek(agora);
    const resumo = resumoDemos(views, agora, iniSemana, agora);
    const semDesfecho = todas.filter((x) => situacao(x.d, agora) === 'sem_desfecho' && x.d.agendadaPara > agora - 7 * DAY).sort((a, b) => b.d.agendadaPara - a.d.agendadaPara);
    const porVend = vendedores.map((u) => ({
      u,
      r: resumoDemos(views, agora, iniSemana, agora, u.id),
      seguir: resumoDemos(views, agora, agora, iniSemana + 7 * DAY, u.id).futuras,
    }));
    return { hojeLista: doDia(hoje), semana, doDia, resumo, semDesfecho, porVend, hoje };
  }, [views, agora, p, vendedores]);

  const { hojeLista, semana, doDia, resumo, semDesfecho, porVend, hoje } = d;
  const semDesfechoHoje = hojeLista.filter((x) => situacao(x.d, agora) === 'sem_desfecho').length;
  const semContatoAntes = hojeLista.filter((x) => situacao(x.d, agora) === 'agendada' && x.v.primeiroContatoEm === null).length;
  const idxAgora = hojeLista.findIndex((x) => x.d.agendadaPara > agora);

  return (
    <Page>
      <PageHeader
        title="Agenda de demos"
        description={
          <>
            Hoje são <Strong>{hojeLista.length} demonstrações</Strong>. <Strong tone="warning">{semDesfechoHoje}</Strong> {semDesfechoHoje === 1 ? 'está' : 'estão'} sem desfecho
            {semContatoAntes > 0 ? (
              <>
                {' '}
                e <Strong tone="primary">{semContatoAntes}</Strong> {semContatoAntes === 1 ? 'lead ainda não teve' : 'leads ainda não tiveram'} contato antes da demo
              </>
            ) : null}
            . Toda demo com horário passado precisa de desfecho: realizada ou não compareceu (que leva o lead para Reagendar Demonstração).
          </>
        }
      />

      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
        {semana.map((dia) => {
          const lista = doDia(dia);
          const passadas = lista.filter((x) => x.d.status !== 'agendada');
          const real = passadas.filter((x) => x.d.status === 'realizada').length;
          const ehHoje = dia === hoje;
          const futuro = dia > hoje;
          const comp = passadas.length ? (real / passadas.length) * 100 : null;
          return (
            <motion.div key={dia} variants={itemVariants}>
              <Card size="sm" className={cn('h-full gap-2', ehHoje && 'ring-2 ring-primary/50', futuro && 'bg-muted/40')}>
                <CardHeader>
                  <CardDescription className={cn(ehHoje && 'font-medium text-primary')}>
                    {weekdayShort(dia)} {fmtDate(dia)}
                    {ehHoje ? ' · hoje' : ''}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold">
                    <AnimatedNumber value={lista.length} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1.5">
                  <GrowBar pct={futuro ? 0 : comp} />
                  <span className="text-xs text-muted-foreground">
                    {futuro ? `${lista.filter((x) => x.v.primeiroContatoEm === null).length} sem contato ainda` : comp === null ? 'nenhuma concluída' : `${fmtPct(comp)} compareceram`}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </Stagger>

      <Reveal className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-0 pb-2 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Demonstrações de hoje</CardTitle>
            <CardDescription>Horário de Brasília · atualizado às {fmtTime(agora)}</CardDescription>
          </CardHeader>
          {hojeLista.length === 0 && <p className="px-4 py-8 text-sm text-muted-foreground">Nenhuma demo marcada para hoje.</p>}
          {hojeLista.map(({ d: dm, v }, i) => {
            const s = situacao(dm, agora);
            return (
              <div key={dm.id}>
                {i === idxAgora && <LinhaAgora agora={agora} />}
                <motion.button
                  type="button"
                  onClick={() => abrirLead(v.lead.id)}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: EASE, delay: 0.1 + i * 0.025 }}
                  className="grid w-full grid-cols-[52px_10px_1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                >
                  <span className={cn('num font-mono text-sm', s === 'agendada' ? 'text-foreground' : 'text-muted-foreground')}>{fmtTime(dm.agendadaPara)}</span>
                  <span className={cn('size-2 rounded-full', SIT[s].dot)} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {v.lead.contato} - {v.lead.revenda}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <Origem canal={v.lead.canal} className="text-xs" /> · Resp: {nome(dm.vendedorId)}
                      {s === 'agendada' && v.primeiroContatoEm === null && <span className="text-primary">· sem contato antes da demo</span>}
                    </span>
                  </span>
                  <Badge variant="outline" className={SIT[s].cls}>
                    {SIT[s].rotulo}
                  </Badge>
                </motion.button>
              </div>
            );
          })}
          {idxAgora === -1 && hojeLista.length > 0 && <LinhaAgora agora={agora} />}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparecimento da semana</CardTitle>
              <CardDescription>Desde segunda-feira</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative">
                <Ring pct={resumo.comparecimentoPct ?? 0} label={`${fmtPct(resumo.comparecimentoPct)} de comparecimento`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-semibold">
                    <AnimatedNumber value={resumo.comparecimentoPct ?? 0} format={(x) => `${Math.round(x)}%`} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {resumo.realizadas} de {resumo.realizadas + resumo.faltaram}
                  </span>
                </div>
              </div>
              <div className="grid w-full grid-cols-2 divide-x rounded-lg border text-center text-sm">
                <div className="p-2.5">
                  <div className="text-xs text-muted-foreground">Faltaram</div>
                  <div className="num text-lg font-semibold">{resumo.faltaram}</div>
                </div>
                <div className="p-2.5">
                  <div className="text-xs text-muted-foreground">Sem desfecho</div>
                  <div className="num text-lg font-semibold text-warning-foreground">{resumo.semDesfecho}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precisam de desfecho</CardTitle>
              <CardDescription>Demos com horário passado sem registro</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {semDesfecho.length === 0 && <p className="text-sm text-muted-foreground">Todas as demos passadas têm desfecho.</p>}
              {semDesfecho.slice(0, 5).map(({ d: dm, v }) => (
                <button
                  key={dm.id}
                  type="button"
                  onClick={() => abrirLead(v.lead.id)}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <NameAvatar nome={v.lead.contato} size={28} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {v.lead.contato} - {v.lead.revenda}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmtRelativeDay(dm.agendadaPara, agora)} {fmtTime(dm.agendadaPara)} · {nome(dm.vendedorId)}
                    </span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </Reveal>

      <Reveal>
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle>Por vendedor nesta semana</CardTitle>
            <CardDescription>Demonstrações com horário já passado, desde segunda-feira</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Vendedor</TableHead>
                <TableHead className="text-right">Realizadas</TableHead>
                <TableHead className="text-right">Faltaram</TableHead>
                <TableHead className="text-right">Sem desfecho</TableHead>
                <TableHead className="text-right">A seguir</TableHead>
                <TableHead className="w-[32%] pr-4">Comparecimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porVend.map(({ u, r, seguir }, i) => {
                const baixo = r.comparecimentoPct !== null && r.comparecimentoPct < 70;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="pl-4">
                      <span className="flex items-center gap-2.5">
                        <NameAvatar nome={u.nome} size={26} />
                        {u.nome}
                      </span>
                    </TableCell>
                    <TableCell className="num text-right">{r.realizadas}</TableCell>
                    <TableCell className="num text-right">{r.faltaram}</TableCell>
                    <TableCell className={cn('num text-right', r.semDesfecho ? 'text-warning-foreground' : 'text-muted-foreground')}>{r.semDesfecho}</TableCell>
                    <TableCell className="num text-right text-muted-foreground">{seguir}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center gap-3">
                        <GrowBar pct={r.comparecimentoPct} color={baixo ? 'var(--warning)' : undefined} delay={0.1 + i * 0.04} />
                        <span className={cn('num w-10 text-right text-sm', baixo && 'text-warning-foreground')}>{fmtPct(r.comparecimentoPct)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </Reveal>
    </Page>
  );
}

function LinhaAgora({ agora }: { agora: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5" aria-label={`Agora, ${fmtTime(agora)}`}>
      <span className="num w-[52px] font-mono text-xs font-medium text-primary">{fmtTime(agora)}</span>
      <span className="size-2 rounded-full bg-primary" />
      <motion.span className="h-px flex-1 origin-left bg-primary" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease: EASE }} />
      <span className="text-xs font-medium text-primary">agora</span>
    </div>
  );
}
