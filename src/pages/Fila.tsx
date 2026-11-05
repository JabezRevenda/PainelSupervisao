import { Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Etiqueta, etiquetaDoAlerta, Origem } from '@/components/crm';
import { Dot, PageHeader, Strong } from '@/components/kit';
import { EASE, Page, Reveal, Stagger, itemVariants } from '@/components/motion';
import { ALERTA_INFO, type TipoAlerta } from '@/data/metrics/estado';
import { contarAlertas, fila } from '@/data/metrics/indicadores';
import { businessMinutesBetween, fmtClock, fmtDateTime, fmtHours, fmtMinutes, fmtRelativeDay, fmtTime, isBusinessTime } from '@/data/time';
import { ETAPA_COR, ETAPA_LABEL, TIPO_INTERACAO_LABEL } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePainel, useRelogio } from '@/state/painel';

type Aba = 'todos' | TipoAlerta;

const ABAS: [Aba, string][] = [
  ['todos', 'Todos'],
  ['sla_estourado', 'SLA estourado'],
  ['prazo_correndo', 'Prazo correndo'],
  ['parado', 'Parados'],
  ['atencao', 'Em atenção'],
  ['demo_sem_desfecho', 'Demo sem desfecho'],
  ['passo_vencido', 'Passo vencido'],
  ['sem_proximo_passo', 'Sem próximo passo'],
];

export function Fila() {
  const { views, agora, config, vendedores, nome, abrirLead } = usePainel();
  const p = config.params;
  const relogio = useRelogio(1000);
  const [aba, setAba] = useState<Aba>('todos');
  const [vendedor, setVendedor] = useState('todos');

  const itens = useMemo(() => fila(views, agora, p), [views, agora, p]);
  const doVendedor = vendedor === 'todos' ? itens : itens.filter((x) => x.view.vendedorId === vendedor);
  const contagem = contarAlertas(doVendedor);
  const linhas = aba === 'todos' ? doVendedor : doVendedor.filter((x) => x.alertas.some((a) => a.tipo === aba));
  const acao = itens.filter((x) => x.alertas[0].gravidade <= 5).length;
  const jornada = p.fimMin - p.inicioMin;
  const relogios = itens
    .filter((x) => x.view.primeiroContatoEm === null && businessMinutesBetween(x.view.atribuidoEm, agora, p) <= jornada)
    .sort((a, b) => a.view.prazoSla - b.view.prazoSla)
    .slice(0, 4);
  const expediente = isBusinessTime(relogio, p);

  return (
    <Page>
      <PageHeader
        title="Fila de risco"
        description={
          <>
            <Strong tone="primary">{acao} leads</Strong> pedem ação agora. Primeiro quem ainda não teve contato, depois os parados há mais de {p.paradoHoras}h e os em atenção. Clique em
            um lead para ver a linha do tempo.
          </>
        }
      />

      {relogios.length > 0 && (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {relogios.map(({ view: v }) => {
            const decorrido = businessMinutesBetween(v.atribuidoEm, relogio, p);
            const limite = p.slaPrimeiroContatoMin;
            const estourou = decorrido >= limite;
            const pct = Math.min(100, (decorrido / limite) * 100);
            return (
              <motion.div key={v.lead.id} variants={itemVariants}>
                <Card className={cn('h-full gap-3', estourou && 'ring-primary/40')}>
                  <CardHeader>
                    <CardDescription className="flex items-center justify-between">
                      <span className={cn('flex items-center gap-1.5', estourou ? 'text-primary' : 'text-warning-foreground')}>
                        <Clock className="size-3.5" />
                        {estourou ? 'Prazo estourado' : 'Prazo correndo'}
                      </span>
                      <span>{nome(v.vendedorId)}</span>
                    </CardDescription>
                    <CardTitle className="leading-snug">
                      {v.lead.contato} - {v.lead.revenda}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn('num font-mono text-3xl font-semibold tracking-tight', estourou && 'text-primary')}>{fmtClock(decorrido * 60_000)}</span>
                      <span className={cn('text-xs font-medium', estourou ? 'text-primary' : 'text-warning-foreground')}>
                        {estourou ? `+${fmtMinutes(decorrido - limite)}` : `faltam ${fmtMinutes(limite - decorrido)}`}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', estourou ? 'bg-primary' : 'bg-warning')} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Recebido {fmtRelativeDay(v.atribuidoEm, agora)} às {fmtTime(v.atribuidoEm)}
                      </span>
                      <Button variant="link" size="xs" className="h-auto p-0" onClick={() => abrirLead(v.lead.id)}>
                        Ver ficha
                      </Button>
                    </div>
                    {!expediente && <span className="text-xs text-muted-foreground">Pausado fora do expediente</span>}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </Stagger>
      )}

      <Reveal>
        <Card className="gap-0 py-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por alerta">
              {ABAS.map(([id, rot]) => {
                const n = id === 'todos' ? doVendedor.length : contagem[id];
                if (id !== 'todos' && n === 0) return null;
                const ativo = aba === id;
                return (
                  <Button key={id} variant={ativo ? 'default' : 'outline'} size="sm" aria-pressed={ativo} onClick={() => setAba(id)}>
                    {rot}
                    <Badge variant={ativo ? 'secondary' : 'outline'} className={cn('num ml-0.5 px-1.5', ativo && 'bg-white/20 text-white')}>
                      {n}
                    </Badge>
                  </Button>
                );
              })}
            </div>
            <Select value={vendedor} onValueChange={setVendedor}>
              <SelectTrigger className="w-48" aria-label="Vendedor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os vendedores</SelectItem>
                {vendedores.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Lead</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Sem interação</TableHead>
                <TableHead>Última interação</TableHead>
                <TableHead>Próximo passo</TableHead>
                <TableHead className="pr-4">Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {linhas.map(({ view: v, alertas: al }, i) => {
                  const ult = v.interacoes[v.interacoes.length - 1];
                  const prox = v.proximoPasso
                    ? { t: `${fmtRelativeDay(v.proximoPasso.previstoPara, agora)} · ${fmtTime(v.proximoPasso.previstoPara)}`, c: '' }
                    : v.proximaDemo
                      ? { t: `Demo ${fmtRelativeDay(v.proximaDemo.agendadaPara, agora)} · ${fmtTime(v.proximaDemo.agendadaPara)}`, c: '' }
                      : v.passoVencido
                        ? { t: `Vencido · ${fmtRelativeDay(v.passoVencido.previstoPara, agora)}`, c: 'text-primary' }
                        : { t: 'Nenhum', c: 'text-primary' };
                  return (
                    <motion.tr
                      key={v.lead.id}
                      layout="position"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE, delay: Math.min(i, 12) * 0.015 }}
                      onClick={() => abrirLead(v.lead.id)}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="min-w-[300px] p-2 pl-4 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            {v.lead.contato} - {v.lead.revenda}
                          </span>
                          <span className="flex items-center gap-2 text-xs whitespace-nowrap text-muted-foreground">
                            {v.lead.cidade}/{v.lead.uf} · <Origem canal={v.lead.canal} className="text-xs" />
                          </span>
                        </div>
                      </td>
                      <td className="p-2 align-middle whitespace-nowrap">{nome(v.vendedorId)}</td>
                      <td className="p-2 align-middle whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <Dot color={ETAPA_COR[v.etapa]} />
                          {ETAPA_LABEL[v.etapa]}
                        </span>
                      </td>
                      <td className={cn('num p-2 text-right align-middle', al[0].cor === 'vermelho' ? 'text-primary' : 'text-warning-foreground')}>{fmtHours(v.horasSemInteracao)}</td>
                      <td className="p-2 align-middle text-xs whitespace-nowrap text-muted-foreground">
                        {ult ? (
                          <>
                            {TIPO_INTERACAO_LABEL[ult.tipo]}
                            <br />
                            {fmtDateTime(ult.registradoEm)}
                          </>
                        ) : (
                          'Nenhuma'
                        )}
                      </td>
                      <td className={cn('p-2 align-middle text-sm whitespace-nowrap', prox.c)}>{prox.t}</td>
                      <td className="p-2 pr-4 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {al.map((a) => {
                            const e = etiquetaDoAlerta(a, v, agora);
                            return e ? (
                              <Etiqueta key={a.tipo} cor={e.cor}>
                                {e.texto}
                              </Etiqueta>
                            ) : (
                              <Etiqueta key={a.tipo} cor="#9AA0A6">
                                {ALERTA_INFO[a.tipo].rotulo}
                              </Etiqueta>
                            );
                          })}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
          {linhas.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum lead nesta categoria agora.</p>}
          <p className="border-t p-4 text-xs text-muted-foreground">
            {linhas.length} {linhas.length === 1 ? 'lead' : 'leads'}. SLA em horas úteis ({p.inicioMin / 60}h às {p.fimMin / 60}h). Sem interação em horas corridas
            {p.descontarFimDeSemana ? ', sem contar o fim de semana' : ''}.
          </p>
        </Card>
      </Reveal>
    </Page>
  );
}
