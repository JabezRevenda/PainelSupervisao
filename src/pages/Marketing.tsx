import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Origem } from '@/components/crm';
import { Dot, fmtNum, fmtPct, PageHeader, StatCard, Strong } from '@/components/kit';
import { EASE, GrowBar, Page, Reveal, Segmented, Stagger, itemVariants } from '@/components/motion';
import { efeitoSla, porCampanha, porCanal } from '@/data/metrics/indicadores';
import { DAY, fmtDate } from '@/data/time';
import { CANAL_LABEL } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

type Janela = '30' | '60' | '90';

export function Marketing() {
  const { ds, views, agora, config } = usePainel();
  const p = config.params;
  const [janela, setJanela] = useState<Janela>('60');
  const dias = Number(janela);

  const d = useMemo(() => {
    const ini = agora - dias * DAY;
    return { ini, canais: porCanal(views, ds, p, ini, agora), efeito: efeitoSla(views, ds, p, ini, agora), campanhas: porCampanha(views, ds, p, ini, agora).slice(0, 8) };
  }, [views, ds, p, agora, dias]);

  const { ini, canais, efeito, campanhas } = d;
  const total = efeito.dentro + efeito.fora;
  const comLeads = canais.filter((c) => c.leads >= 10);
  const piorConv = [...comLeads].sort((a, b) => (a.conversaoPct ?? 0) - (b.conversaoPct ?? 0))[0];
  const melhorConv = [...comLeads].sort((a, b) => (b.conversaoPct ?? 0) - (a.conversaoPct ?? 0))[0];
  const maxConv = Math.max(5, ...canais.flatMap((c) => [c.convNoPrazoPct ?? 0, c.convForaPct ?? 0]));
  const avaliaveis = canais.filter((c) => c.noPrazo >= 5 && c.fora >= 5);
  const melhores = avaliaveis.filter((c) => (c.convNoPrazoPct ?? 0) > (c.convForaPct ?? 0)).length;

  return (
    <Page>
      <PageHeader
        title="Marketing e origem"
        description={
          <>
            O lead é ruim ou foi mal atendido? Leads recebidos de {fmtDate(ini)} a {fmtDate(agora)}, pela origem que chega no CRM. Quem tem o primeiro contato em até 1 hora útil
            converte <Strong tone="primary">{efeito.multiplicador ? `${fmtNum(efeito.multiplicador, 1)} vezes mais` : '—'}</Strong>.
          </>
        }
        actions={<Segmented id="janela-mkt" label="Janela" value={janela} onChange={setJanela} options={[['30', '30 dias'], ['60', '60 dias'], ['90', '90 dias']]} />}
      />

      <Stagger className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Efeito do atendimento rápido', value: efeito.multiplicador, format: (v: number) => `${fmtNum(v, 1)}×`, delta: <span className="text-muted-foreground">mais conversão com contato em até 1 hora útil</span> },
          {
            label: 'Atendidos em até 1h',
            value: efeito.convDentro,
            format: (v: number) => `${fmtNum(v, 1)}%`,
            sufixo: 'de conversão',
            delta: <span className="text-muted-foreground">{efeito.dentro} leads ({fmtPct(total ? (efeito.dentro / total) * 100 : null)}) · {efeito.dentroGanhos} cadastrados</span>,
          },
          {
            label: 'Atendidos fora do prazo',
            value: efeito.convFora,
            format: (v: number) => `${fmtNum(v, 1)}%`,
            sufixo: 'de conversão',
            delta: <span className="text-muted-foreground">{efeito.fora} leads ({fmtPct(total ? (efeito.fora / total) * 100 : null)}) · {efeito.foraGanhos} cadastrados</span>,
          },
        ].map((k) => (
          <motion.div key={k.label} variants={itemVariants}>
            <StatCard {...k} className="h-full" />
          </motion.div>
        ))}
      </Stagger>

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Conversão por origem, dentro e fora do prazo</CardTitle>
            <CardDescription>
              Em {melhores} de {avaliaveis.length} origens com volume suficiente, o lead atendido em até 1 hora converte mais.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Dot color="var(--primary)" />
                Em até 1h
              </span>
              <span className="flex items-center gap-1.5">
                <Dot color="var(--chart-2)" />
                Fora do prazo
              </span>
            </div>
            {canais.map((c, i) => (
              <div key={c.canal} className="grid grid-cols-[150px_1fr] items-center gap-4 max-sm:grid-cols-1">
                <div className="flex flex-col">
                  <Origem canal={c.canal} className="text-sm text-foreground" />
                  <span className="pl-4 text-xs text-muted-foreground">{c.leads} leads</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      [c.convNoPrazoPct, c.noPrazo, 'var(--primary)'],
                      [c.convForaPct, c.fora, 'var(--chart-2)'],
                    ] as [number | null, number, string][]
                  ).map(([v, n, cor], j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="h-3.5 flex-1">
                        <motion.div
                          className="h-full rounded-[3px]"
                          style={{ background: cor }}
                          initial={{ width: 0 }}
                          animate={{ width: `${n >= 5 ? ((v ?? 0) / maxConv) * 100 : 0}%` }}
                          transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.06 + j * 0.03 }}
                        />
                      </div>
                      <span className={cn('num w-24 text-right text-xs', j === 0 ? 'font-medium' : 'text-muted-foreground')}>{n >= 5 ? fmtPct(v) : 'poucos leads'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle>Resultado por origem</CardTitle>
            <CardDescription>Do lead recebido pelo vendedor até o cadastro</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Origem</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="w-[22%]">1º contato em 1h</TableHead>
                <TableHead className="text-right">Comparecimento</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
                <TableHead className="text-right">Cadastrados</TableHead>
                <TableHead className="pr-4">Perda mais comum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {canais.map((c, i) => {
                const baixo = (c.slaPct ?? 0) < 60;
                return (
                  <TableRow key={c.canal}>
                    <TableCell className="pl-4">
                      <Origem canal={c.canal} className="text-sm text-foreground" />
                    </TableCell>
                    <TableCell className="num text-right">{c.leads}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GrowBar pct={c.slaPct} color={baixo ? 'var(--warning)' : undefined} delay={0.1 + i * 0.04} />
                        <span className={cn('num w-9 text-right', baixo && 'text-warning-foreground')}>{fmtPct(c.slaPct)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="num text-right">{fmtPct(c.comparecimentoPct)}</TableCell>
                    <TableCell className={cn('num text-right font-medium', c === piorConv && 'text-primary')}>{fmtPct(c.conversaoPct)}</TableCell>
                    <TableCell className="num text-right">{c.ganhos}</TableCell>
                    <TableCell className="pr-4 text-muted-foreground">{c.perdaMaisComum ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </Reveal>

      <Reveal className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-0 pb-0 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Campanhas com mais leads</CardTitle>
            <CardDescription>Pelo utm_campaign que chega ao CRM</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Campanha</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Em até 1h</TableHead>
                <TableHead className="pr-4 text-right">Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campanhas.map((k) => (
                <TableRow key={k.canal + k.campanha}>
                  <TableCell className="pl-4 font-mono text-xs">{k.campanha}</TableCell>
                  <TableCell className="text-muted-foreground">{CANAL_LABEL[k.canal]}</TableCell>
                  <TableCell className="num text-right">{k.leads}</TableCell>
                  <TableCell className={cn('num text-right', (k.slaPct ?? 0) < 60 && 'text-warning-foreground')}>{fmtPct(k.slaPct)}</TableCell>
                  <TableCell className="num pr-4 text-right font-medium">{fmtPct(k.conversaoPct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        {piorConv && melhorConv && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Leitura para o marketing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
              <p>
                <Strong>{CANAL_LABEL[piorConv.canal]}</Strong> tem a menor conversão ({fmtPct(piorConv.conversaoPct)}), e {fmtPct(100 - (piorConv.slaPct ?? 0))} dos leads dessa
                origem esperaram mais de 1 hora pelo primeiro contato.
              </p>
              <p className="text-muted-foreground">
                Quando atendido no prazo, o lead de {CANAL_LABEL[piorConv.canal]} converte {fmtPct(piorConv.convNoPrazoPct)}. A melhor conversão é de {CANAL_LABEL[melhorConv.canal]} (
                {fmtPct(melhorConv.conversaoPct)}).
              </p>
            </CardContent>
          </Card>
        )}
      </Reveal>
    </Page>
  );
}
