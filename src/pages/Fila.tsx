import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Etiqueta, etiquetaDoAlerta, Origem } from '@/components/crm';
import { ArrowLink, Bloco, Capsule, Contexto, Cta, Dot, Hl, Intro, Pilulas, Pill } from '@/components/kit';
import { EASE, Page, Stagger } from '@/components/motion';
import { ALERTA_INFO, type TipoAlerta } from '@/data/metrics/estado';
import { fila, urgente } from '@/data/metrics/indicadores';
import { businessMinutesBetween, fmtClock, fmtHours, fmtMinutes, fmtRelativeDay, fmtTime, isBusinessTime } from '@/data/time';
import { ETAPA_COR, ETAPA_LABEL } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePainel, useRelogio } from '@/state/painel';

type Grupo = 'todos' | 'contato' | 'parados' | 'atencao' | 'followup';

const GRUPOS: Record<Exclude<Grupo, 'todos'>, { rotulo: string; tipos: TipoAlerta[] }> = {
  contato: { rotulo: 'Sem contato', tipos: ['sla_estourado', 'prazo_correndo'] },
  parados: { rotulo: 'Parados', tipos: ['parado'] },
  atencao: { rotulo: 'Em atenção', tipos: ['atencao'] },
  followup: { rotulo: 'Próximo passo', tipos: ['passo_vencido', 'sem_proximo_passo', 'demo_sem_desfecho'] },
};

const LIMITE = 15;

export function Fila() {
  const { views, agora, config, vendedores, nome, abrirLead } = usePainel();
  const p = config.params;
  const relogio = useRelogio(1000);
  const [grupo, setGrupo] = useState<Grupo>('todos');
  const [vendedor, setVendedor] = useState('todos');
  const [tudo, setTudo] = useState(false);

  const itens = useMemo(() => fila(views, agora, p), [views, agora, p]);
  const urgentes = itens.filter(urgente).length;
  const doVendedor = vendedor === 'todos' ? itens : itens.filter((x) => x.view.vendedorId === vendedor);
  const conta = (g: Exclude<Grupo, 'todos'>) => doVendedor.filter((x) => x.alertas.some((a) => GRUPOS[g].tipos.includes(a.tipo))).length;
  const linhas = grupo === 'todos' ? doVendedor : doVendedor.filter((x) => x.alertas.some((a) => GRUPOS[grupo].tipos.includes(a.tipo)));
  const visiveis = tudo ? linhas : linhas.slice(0, LIMITE);
  const jornada = p.fimMin - p.inicioMin;
  const relogios = itens
    .filter((x) => x.view.primeiroContatoEm === null && businessMinutesBetween(x.view.atribuidoEm, agora, p) <= jornada)
    .sort((a, b) => a.view.prazoSla - b.view.prazoSla)
    .slice(0, 4);
  const expediente = isBusinessTime(relogio, p);
  const filtroTexto = [grupo === 'todos' ? 'Todos os alertas' : GRUPOS[grupo].rotulo, vendedor === 'todos' ? 'todos os vendedores' : nome(vendedor)].join(' · ');

  return (
    <Page className="gap-8">
      <Intro
        tag="Fila de risco · atualiza a cada minuto"
        title={
          <>
            <Hl>{urgentes} leads</Hl> pedem ação agora. Outros <Pill>{itens.length - urgentes}</Pill> <Capsule /> pedem atenção hoje.
          </>
        }
        aside="Primeiro quem está sem contato depois do prazo de 1 hora útil, depois os parados há mais de 48h. Clique no lead para ver a linha do tempo."
        action={
          <Cta to="/kanban" tom="outline">
            Ver no Kanban
          </Cta>
        }
      />

      {relogios.length > 0 && (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {relogios.map(({ view: v }) => {
            const decorrido = businessMinutesBetween(v.atribuidoEm, relogio, p);
            const limite = p.slaPrimeiroContatoMin;
            const estourou = decorrido >= limite;
            return (
              <Bloco
                key={v.lead.id}
                tom={estourou ? 'pink' : 'white'}
                titulo={estourou ? 'Prazo estourado' : 'Prazo correndo'}
                acao={<ArrowLink onClick={() => abrirLead(v.lead.id)} label="Abrir ficha" tom={estourou ? 'pink' : 'white'} />}
                className="gap-4"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {v.lead.contato} - {v.lead.revenda}
                  </span>
                  <span className="text-xs opacity-70">
                    {nome(v.vendedorId)} · recebido {fmtRelativeDay(v.atribuidoEm, agora)} às {fmtTime(v.atribuidoEm)}
                  </span>
                </div>
                <span className="display num text-5xl">{fmtClock(decorrido * 60_000)}</span>
                <Contexto
                  className={estourou ? '' : 'text-muted-foreground opacity-100'}
                  itens={[estourou ? `${fmtMinutes(decorrido - limite)} além do prazo` : `faltam ${fmtMinutes(limite - decorrido)}`, !expediente && 'pausado fora do expediente']}
                />
              </Bloco>
            );
          })}
        </Stagger>
      )}

      <Bloco className="gap-4 p-0 sm:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <Pilulas
            id="fila"
            label="Filtrar por alerta"
            value={grupo}
            onChange={(g) => {
              setGrupo(g);
              setTudo(false);
            }}
            options={[
              ['todos', <>Todos <span className="num opacity-60">{doVendedor.length}</span></>],
              ...(Object.keys(GRUPOS) as Exclude<Grupo, 'todos'>[]).map(
                (g) =>
                  [
                    g,
                    <>
                      {GRUPOS[g].rotulo} <span className="num opacity-60">{conta(g)}</span>
                    </>,
                  ] as [Grupo, ReactNode],
              ),
            ]}
          />
          <Select value={vendedor} onValueChange={setVendedor}>
            <SelectTrigger className="h-9 w-48 rounded-full bg-card" aria-label="Vendedor">
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
        <p className="px-5 text-sm text-muted-foreground sm:px-6">
          {filtroTexto}: <span className="num font-medium text-foreground">{linhas.length}</span> {linhas.length === 1 ? 'lead' : 'leads'}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-t text-left text-xs text-muted-foreground">
                <th className="py-2.5 pr-2 pl-5 font-normal sm:pl-6">Lead</th>
                <th className="px-2 font-normal">Responsável</th>
                <th className="px-2 font-normal">Etapa</th>
                <th className="px-2 text-right font-normal">Sem interação</th>
                <th className="px-2 font-normal">Próximo passo</th>
                <th className="pr-5 pl-2 font-normal sm:pr-6">Motivo</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {visiveis.map(({ view: v, alertas: al }, i) => {
                  const e = etiquetaDoAlerta(al[0], v, agora);
                  const prox = v.proximoPasso
                    ? { t: `${fmtRelativeDay(v.proximoPasso.previstoPara, agora)} · ${fmtTime(v.proximoPasso.previstoPara)}`, ruim: false }
                    : v.proximaDemo
                      ? { t: `Demo ${fmtRelativeDay(v.proximaDemo.agendadaPara, agora)} · ${fmtTime(v.proximaDemo.agendadaPara)}`, ruim: false }
                      : v.passoVencido
                        ? { t: `Vencido · ${fmtRelativeDay(v.passoVencido.previstoPara, agora)}`, ruim: true }
                        : { t: 'Nenhum', ruim: true };
                  return (
                    <motion.tr
                      key={v.lead.id}
                      layout="position"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE, delay: Math.min(i, 12) * 0.015 }}
                      onClick={() => abrirLead(v.lead.id)}
                      className="cursor-pointer border-t transition-colors hover:bg-muted/60"
                    >
                      <td className="py-3 pr-2 pl-5 sm:pl-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            {v.lead.contato} - {v.lead.revenda}
                          </span>
                          <span className="flex items-center gap-2 text-xs whitespace-nowrap text-muted-foreground">
                            {v.lead.cidade}/{v.lead.uf} · <Origem canal={v.lead.canal} className="text-xs" />
                          </span>
                        </div>
                      </td>
                      <td className="px-2 whitespace-nowrap">{nome(v.vendedorId)}</td>
                      <td className="px-2 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <Dot color={ETAPA_COR[v.etapa]} />
                          {ETAPA_LABEL[v.etapa]}
                        </span>
                      </td>
                      <td className={cn('num px-2 text-right', al[0].cor === 'vermelho' ? 'font-medium text-primary' : '')}>{fmtHours(v.horasSemInteracao)}</td>
                      <td className={cn('px-2 whitespace-nowrap', prox.ruim && 'text-primary')}>{prox.t}</td>
                      <td className="pr-5 pl-2 sm:pr-6">{e ? <Etiqueta cor={e.cor}>{e.texto}</Etiqueta> : <Etiqueta cor="#9AA0A6">{ALERTA_INFO[al[0].tipo].rotulo}</Etiqueta>}</td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {linhas.length === 0 && <p className="px-6 pb-8 text-center text-sm text-muted-foreground">Nenhum lead nesta categoria agora.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 sm:px-6">
          <span className="text-xs text-muted-foreground">
            SLA em horas úteis ({p.inicioMin / 60}h às {p.fimMin / 60}h). Sem interação em horas corridas{p.descontarFimDeSemana ? ', sem contar o fim de semana' : ''}.
          </span>
          {linhas.length > LIMITE && (
            <button type="button" onClick={() => setTudo((t) => !t)} className="h-9 rounded-full border border-ink/15 bg-card px-4 text-sm transition-colors hover:border-ink/40">
              {tudo ? 'Mostrar menos' : `Mostrar todos os ${linhas.length}`}
            </button>
          )}
        </div>
      </Bloco>
    </Page>
  );
}
