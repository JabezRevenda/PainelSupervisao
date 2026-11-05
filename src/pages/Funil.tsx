import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Delta, fmtNum, fmtPct, NameAvatar, PageHeader, StatCard, Strong } from '@/components/kit';
import { EASE, Page, Reveal, Segmented, Stagger, itemVariants } from '@/components/motion';
import { fechamento, funil } from '@/data/metrics/indicadores';
import { DAY, fmtDate } from '@/data/time';
import { ETAPA_COR, FUNIL_LABEL } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

type Janela = '30' | '60' | '90';

export function Funil() {
  const { views, agora, vendedores } = usePainel();
  const [janela, setJanela] = useState<Janela>('60');
  const dias = Number(janela);

  const d = useMemo(() => {
    const ini = agora - dias * DAY;
    const etapas = funil(views, ini, agora);
    const anteriores = funil(views, ini - dias * DAY, ini);
    const fech = fechamento(views, ini, agora);
    const coorte = views.filter((v) => v.recebidoEm >= ini && v.recebidoEm < agora);
    const reagendou = coorte.filter((v) => v.atingiu.reagendar_demo !== undefined).length;
    const porVend = vendedores.map((u) => ({ u, et: funil(views, ini, agora, (v) => v.vendedorId === u.id) }));
    return { ini, etapas, anteriores, fech, coorte: coorte.length, reagendou, porVend };
  }, [views, agora, dias, vendedores]);

  const { ini, etapas, anteriores, fech, coorte, reagendou, porVend } = d;
  const base = etapas[0].n || 1;
  const transicoes = etapas.slice(1);
  const pior = [...transicoes].sort((a, b) => (a.conversao ?? 100) - (b.conversao ?? 100))[0];
  const idxPior = etapas.indexOf(pior);
  const lenta = [...transicoes].sort((a, b) => (b.diasMedios ?? 0) - (a.diasMedios ?? 0))[0];
  const cor = (i: number) => [ETAPA_COR.demo_agendada, ETAPA_COR.negociacao, ETAPA_COR.cadastrado][i];
  const total = (et: typeof etapas) => (et[0].n ? (et[et.length - 1].n / et[0].n) * 100 : null);

  return (
    <Page>
      <PageHeader
        title="Funil e conversão"
        description={
          <>
            Leads recebidos de {fmtDate(ini)} a {fmtDate(agora)}. A maior perda está entre <Strong>{FUNIL_LABEL[etapas[idxPior - 1].etapa]}</Strong> e{' '}
            <Strong>{FUNIL_LABEL[pior.etapa]}</Strong>: <Strong tone="primary">{fmtPct(100 - (pior.conversao ?? 0))}</Strong> não avançam. De {etapas[0].n} leads, {etapas[2].n} já
            foram cadastrados e {fech.emAberto} seguem em aberto.
          </>
        }
        actions={<Segmented id="janela-funil" label="Janela" value={janela} onChange={setJanela} options={[['30', '30 dias'], ['60', '60 dias'], ['90', '90 dias']]} />}
      />

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Etapas do vendedor no CRM</CardTitle>
            <CardDescription>Quantos leads do período chegaram a cada etapa. Quem não comparece passa por Reagendar Demonstração.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {etapas.map((e, i) => {
              const w = (e.n / base) * 100;
              const ant = anteriores[i];
              return (
                <div key={e.etapa} className="flex flex-col">
                  {i > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 pl-[208px] text-xs text-muted-foreground max-sm:pl-0">
                      <span className="font-medium text-foreground">{fmtPct(e.conversao)} avançam</span>
                      <span>−{etapas[i - 1].n - e.n} saem</span>
                      <span>em média {fmtNum(e.diasMedios, 1)} dias</span>
                      <Delta v={e.conversao !== null && ant.conversao !== null ? e.conversao - ant.conversao : null} sufixo={`vs. ${dias} dias anteriores`} />
                    </div>
                  )}
                  <div className="grid grid-cols-[200px_1fr] items-center gap-2 max-sm:grid-cols-1">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="size-2.5 rounded-full" style={{ background: cor(i) }} />
                      {FUNIL_LABEL[e.etapa]}
                    </span>
                    <div className="relative h-10 overflow-hidden rounded-md bg-muted/60">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-md"
                        style={{ background: `color-mix(in oklch, var(--primary) ${100 - i * 22}%, var(--card))` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(w, 3)}%` }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.12 }}
                      />
                      <span className="num absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-white">{e.n}</span>
                      <span className={cn('num absolute inset-y-0 right-3 flex items-center text-xs', w > 92 ? 'text-white/80' : 'text-muted-foreground')}>{Math.round(w)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </Reveal>

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Taxa de ganho', value: fech.taxaGanhoPct, format: (v: number) => `${Math.round(v)}%`, delta: <span className="text-muted-foreground">{fech.ganhos} cadastrados em {fech.ganhos + fech.perdidos} encerrados</span> },
          { label: 'Ciclo de venda', value: fech.cicloMedioDias, format: (v: number) => fmtNum(v, 1), sufixo: 'dias', delta: <span className="text-muted-foreground">mediana de {fmtNum(fech.cicloMedianoDias, 1)} dias até o cadastro</span> },
          { label: 'Etapa mais lenta', value: lenta.diasMedios, format: (v: number) => fmtNum(v, 1), sufixo: 'dias', delta: <span className="text-muted-foreground">até {FUNIL_LABEL[lenta.etapa]}</span> },
          { label: 'Passaram por Reagendar', value: coorte ? (reagendou / coorte) * 100 : null, format: (v: number) => `${Math.round(v)}%`, delta: <span className="text-muted-foreground">{reagendou} de {coorte} leads não compareceram à 1ª demo</span> },
        ].map((k) => (
          <motion.div key={k.label} variants={itemVariants}>
            <StatCard {...k} className="h-full" />
          </motion.div>
        ))}
      </Stagger>

      <Reveal>
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle>Conversão por vendedor</CardTitle>
            <CardDescription>Quanto mais forte o rosa, maior a conversão. Em amarelo, 10 pontos ou mais abaixo do time.</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Vendedor</TableHead>
                <TableHead className="text-center">Demonstração → Negociação</TableHead>
                <TableHead className="text-center">Negociação → Cadastrado</TableHead>
                <TableHead className="pr-4 text-center">Do início ao cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porVend.map(({ u, et }, ri) => (
                <TableRow key={u.id}>
                  <TableCell className="pl-4">
                    <span className="flex items-center gap-2.5">
                      <NameAvatar nome={u.nome} size={26} />
                      {u.nome}
                    </span>
                  </TableCell>
                  {[...et.slice(1).map((t, i) => ({ v: t.conversao, ref: transicoes[i].conversao })), { v: total(et), ref: total(etapas) }].map((c, i, arr) => {
                    const baixo = c.v !== null && c.ref !== null && c.v <= c.ref - 10;
                    const a = c.v === null ? 0 : Math.max(10, Math.min(85, c.v));
                    return (
                      <TableCell key={i} className={i === arr.length - 1 ? 'pr-4' : ''}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: EASE, delay: 0.05 + ri * 0.03 + i * 0.02 }}
                          className="num mx-auto flex h-8 max-w-[120px] items-center justify-center rounded-md text-sm font-medium"
                          style={
                            baixo
                              ? { background: 'color-mix(in oklch, var(--warning) 18%, transparent)', color: 'var(--warning-foreground)' }
                              : { background: `color-mix(in oklch, var(--primary) ${a}%, var(--card))`, color: a > 45 ? 'white' : 'var(--foreground)' }
                          }
                        >
                          {fmtPct(c.v)}
                        </motion.div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-4 font-medium">Time</TableCell>
                {transicoes.map((t) => (
                  <TableCell key={t.etapa} className="num text-center font-medium">
                    {fmtPct(t.conversao)}
                  </TableCell>
                ))}
                <TableCell className="num pr-4 text-center font-medium">{fmtPct(total(etapas))}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      </Reveal>
    </Page>
  );
}
