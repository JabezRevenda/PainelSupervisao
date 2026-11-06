import { ChevronsLeftRight, Search } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { type ReactNode, type Ref, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Etiqueta, etiquetaDaEtapa, LeadCard, Origem, tempoCurto } from '@/components/crm';
import { Capsule, Hl, Intro, NameAvatar, Pill } from '@/components/kit';
import { EASE, Page, Reveal, SPRING } from '@/components/motion';
import { alertas, type Alerta, type LeadView } from '@/data/metrics/estado';
import { carteira } from '@/data/metrics/indicadores';
import { DAY, startOfMonth } from '@/data/time';
import { CANAIS, CANAL_LABEL, type Etapa, ETAPA_COR, ETAPA_LABEL, ETAPAS_CRM, ETAPAS_PERDA, ETAPAS_PRE_VENDAS, type Lead } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

const LIMITE = 40;

interface ItemPre {
  lead: Lead;
  etapa: Etapa;
  desde: number;
  sdr: string;
}

function CartaoPreVendas({ ref, item, agora, responsavel }: { ref?: Ref<HTMLDivElement>; item: ItemPre; agora: number; responsavel: string }) {
  const e = etiquetaDaEtapa(item.etapa);
  return (
    <motion.div
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex flex-col gap-1.5 rounded-md border border-black/[0.06] bg-card p-3 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.08)] dark:border-white/[0.06] dark:shadow-none"
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13.5px] leading-snug font-medium">
            {item.lead.contato} - {item.lead.revenda}
          </span>
          <span className="truncate text-[13px] text-muted-foreground">{item.lead.contato}</span>
        </div>
        <NameAvatar nome={item.lead.contato} size={34} />
      </div>
      <Origem canal={item.lead.canal} />
      {e && (
        <div>
          <Etiqueta cor={e.cor}>{e.texto}</Etiqueta>
        </div>
      )}
      <div className="flex items-center justify-between text-[13px] text-muted-foreground">
        <span>Resp: {responsavel}</span>
        <span className="text-foreground">{tempoCurto(agora - item.desde)}</span>
      </div>
    </motion.div>
  );
}

export function Kanban() {
  const { ds, views, agora, config, vendedores, nome, abrirLead } = usePainel();
  const p = config.params;
  const [busca, setBusca] = useState('');
  const [vendedor, setVendedor] = useState('todos');
  const [origem, setOrigem] = useState('todas');
  const [soAlerta, setSoAlerta] = useState(false);
  const [preVendas, setPreVendas] = useState(false);
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  const dados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const passa = (lead: Lead) =>
      (origem === 'todas' || lead.canal === origem) &&
      (!termo || lead.contato.toLowerCase().includes(termo) || lead.revenda.toLowerCase().includes(termo));

    // leads com o vendedor (e os que saíram dele)
    const iniMes = startOfMonth(agora);
    const semana = agora - 7 * DAY;
    const porEtapa = new Map<Etapa, { v: LeadView; al: Alerta[] }[]>();
    for (const v of views) {
      if (vendedor !== 'todos' && v.vendedorId !== vendedor) continue;
      if (!passa(v.lead)) continue;
      if (v.etapa === 'cadastrado' && (v.fechadoEm ?? 0) < iniMes) continue;
      if (ETAPAS_PERDA.includes(v.etapa) && (v.fechadoEm ?? 0) < semana) continue;
      const al = v.status === 'aberto' ? alertas(v, agora, p).filter((a) => a.tipo !== 'sem_proximo_passo') : [];
      if (soAlerta && al.length === 0) continue;
      const lista = porEtapa.get(v.etapa) ?? [];
      lista.push({ v, al });
      porEtapa.set(v.etapa, lista);
    }
    for (const lista of porEtapa.values()) {
      lista.sort((a, b) => {
        const ga = a.al[0]?.gravidade ?? 9;
        const gb = b.al[0]?.gravidade ?? 9;
        if (ga !== gb) return ga - gb;
        return (b.v.fechadoEm ?? b.v.atribuidoEm) - (a.v.fechadoEm ?? a.v.atribuidoEm);
      });
    }

    // leads ainda na pré-vendas (sem vendedor)
    const atribuidos = new Set(ds.atribuicoes.map((a) => a.leadId));
    const ultimas = new Map<string, { para: Etapa; em: number; usuarioId: string }>();
    for (const e of ds.etapas) if (!atribuidos.has(e.leadId)) ultimas.set(e.leadId, e);
    const pre = new Map<Etapa, ItemPre[]>();
    if (vendedor === 'todos' && !soAlerta) {
      for (const lead of ds.leads) {
        const u = ultimas.get(lead.id);
        if (!u || !ETAPAS_PRE_VENDAS.includes(u.para) || !passa(lead)) continue;
        const lista = pre.get(u.para) ?? [];
        lista.push({ lead, etapa: u.para, desde: u.em, sdr: u.usuarioId });
        pre.set(u.para, lista);
      }
    }
    return { porEtapa, pre };
  }, [ds, views, agora, p, busca, vendedor, origem, soAlerta]);

  const cart = useMemo(() => carteira(views, agora, p, vendedor === 'todos' ? undefined : vendedor), [views, agora, p, vendedor]);
  const responsavelPre = (id: string) => (id.startsWith('sdr') ? nome(id) : 'Pré-vendas');

  return (
    <Page className="gap-5">
      <Intro
        tag="Kanban · as etapas do CRM"
        title={
          <>
            <Hl>{cart.abertos} leads</Hl> com os vendedores. <Pill>{cart.parados}</Pill> <Capsule /> {cart.parados === 1 ? 'está parado' : 'estão parados'}.
          </>
        }
        aside={
          <>
            Mesmo quadro do CRM. As etiquetas coloridas são do painel: {cart.semContato} sem contato e {cart.atencao} em atenção. Clique no cartão para ver a linha do tempo.
          </>
        }
      />

      <Reveal className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar contato ou revenda" className="h-9 rounded-full bg-card pl-9" aria-label="Buscar contato ou revenda" />
        </div>
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
        <Select value={origem} onValueChange={setOrigem}>
          <SelectTrigger className="h-9 w-44 rounded-full bg-card" aria-label="Origem">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as origens</SelectItem>
            {CANAIS.map((c) => (
              <SelectItem key={c} value={c}>
                {CANAL_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Alternar ativo={soAlerta} onClick={() => setSoAlerta((x) => !x)}>
          Só com alerta
        </Alternar>
        <Alternar ativo={preVendas} onClick={() => setPreVendas((x) => !x)}>
          Pré-vendas e saídas
        </Alternar>
      </Reveal>

      <Reveal>
        <LayoutGroup id="kanban">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
            {ETAPAS_CRM.map((etapa, ci) => {
              const ehPre = ETAPAS_PRE_VENDAS.includes(etapa);
              const ehSaida = ETAPAS_PERDA.includes(etapa);
              const lista = dados.porEtapa.get(etapa) ?? [];
              const listaPre = dados.pre.get(etapa) ?? [];
              const total = ehPre ? listaPre.length : lista.length;
              const recolhida = (ehPre || ehSaida) && !preVendas;
              const subtitulo = etapa === 'cadastrado' ? 'neste mês' : ehSaida ? 'últimos 7 dias' : ehPre ? 'pré-vendas' : null;
              const mostrar = expandidas[etapa] ? Infinity : LIMITE;
              return (
                <motion.section
                  key={etapa}
                  layout
                  transition={SPRING}
                  aria-label={`${ETAPA_LABEL[etapa]}: ${total} leads`}
                  className={cn('flex shrink-0 flex-col rounded-[18px] bg-ink/[0.045]', recolhida ? 'w-11' : 'w-[284px]')}
                >
                  {recolhida ? (
                    <button
                      type="button"
                      onClick={() => setPreVendas(true)}
                      className="flex h-full min-h-[360px] flex-col items-center gap-3 py-3 text-muted-foreground transition-colors hover:text-foreground"
                      title={`${ETAPA_LABEL[etapa]} · ${total} (${subtitulo})`}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: ETAPA_COR[etapa] }} />
                      <span className="num text-xs">{total}</span>
                      <span className="text-[13px] [writing-mode:vertical-rl]">{ETAPA_LABEL[etapa]}</span>
                      <ChevronsLeftRight className="mt-auto size-3.5" />
                    </button>
                  ) : (
                    <>
                      <header className="flex flex-col items-center gap-0.5 px-3 pt-3 pb-2">
                        <div className="flex items-center gap-2 text-[14px]">
                          <span className="size-3 rounded-full" style={{ background: ETAPA_COR[etapa] }} />
                          <span className="font-medium">{ETAPA_LABEL[etapa]}</span>
                          <motion.span key={total} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="num text-muted-foreground">
                            {total}
                          </motion.span>
                        </div>
                        {subtitulo && <span className="text-xs text-muted-foreground">{subtitulo}</span>}
                      </header>
                      <div className="flex max-h-[calc(100vh-150px)] min-h-[360px] flex-col gap-2.5 overflow-y-auto px-2.5 pb-3">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {ehPre
                            ? listaPre.slice(0, mostrar).map((it) => <CartaoPreVendas key={it.lead.id} item={it} agora={agora} responsavel={responsavelPre(it.sdr)} />)
                            : lista.slice(0, mostrar).map(({ v, al }, i) => (
                                <LeadCard
                                  key={v.lead.id}
                                  layoutId={v.lead.id}
                                  v={v}
                                  agora={agora}
                                  alertas={al}
                                  responsavel={nome(v.vendedorId)}
                                  onOpen={() => abrirLead(v.lead.id)}
                                  delay={Math.min(i, 8) * 0.03 + ci * 0.02}
                                />
                              ))}
                        </AnimatePresence>
                        {total === 0 && <p className="px-2 py-8 text-center text-sm text-muted-foreground">Nenhum lead</p>}
                        {total > mostrar && (
                          <button
                            type="button"
                            onClick={() => setExpandidas((x) => ({ ...x, [etapa]: true }))}
                            className="rounded-full py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                          >
                            Mostrar mais {total - LIMITE}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </motion.section>
              );
            })}
          </div>
        </LayoutGroup>
      </Reveal>
    </Page>
  );
}

/** Filtro liga/desliga em pílula. */
function Alternar({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
        ativo ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-card hover:border-ink/40',
      )}
    >
      <span className={cn('size-2 rounded-full', ativo ? 'bg-primary' : 'bg-ink/20')} />
      {children}
    </button>
  );
}
