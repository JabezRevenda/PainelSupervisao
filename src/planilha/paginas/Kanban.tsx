import { CalendarDays, ChevronsLeftRight, Search } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { type ReactNode, useMemo, useState } from 'react';
import { COR_ETIQUETA, Etiqueta, etiquetaDaEtapa } from '@/components/crm';
import { Hl, Intro, NameAvatar, Pilulas } from '@/components/kit';
import { Page, Reveal, SPRING } from '@/components/motion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Etapa, ETAPA_COR, ETAPA_LABEL, ETAPAS_CRM, ETAPAS_PERDA, ETAPAS_PRE_VENDAS } from '@/data/types';
import { cn } from '@/lib/utils';
import { nomeCurto, usePlanilha } from '../estado';
import { fmtDia, type LeadP, type Resultado } from '../modelo';
import { OrigemP } from '../pecas';

const LIMITE = 40;

type FiltroResultado = 'todos' | Resultado;

/** Colunas que cada resultado ocupa no quadro. */
const COLUNAS_DO_RESULTADO: Record<Resultado, Etapa[]> = {
  aberto: ['demo_agendada', 'reagendar_demo', 'negociacao'],
  ganho: ['cadastrado'],
  perdido: ['resgate_sdr', 'limbo_sdr'],
};

function CartaoP({ l, onOpen, delay }: { l: LeadP; onOpen: () => void; delay: number }) {
  const etapa = l.resultado === 'aberto' ? etiquetaDaEtapa(l.coluna) : l.resultado === 'ganho' ? { texto: l.status, cor: COR_ETIQUETA.verde } : null;
  const extra = l.resultado === 'perdido' || !['acompanhando', 'ganho', 'cadastrado'].includes(l.status.toLowerCase()) ? l.status : null;
  return (
    <motion.button
      type="button"
      layout="position"
      layoutId={l.uid}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay, layout: { type: 'spring', stiffness: 420, damping: 38 } }}
      whileHover={{ y: -2 }}
      onClick={onOpen}
      className="group flex w-full flex-col gap-1.5 rounded-md border border-black/[0.06] bg-card p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.08)] transition-shadow outline-none hover:shadow-[0_4px_12px_rgba(16,24,40,0.12)] focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:border-white/[0.06] dark:shadow-none"
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13.5px] leading-snug font-medium text-foreground">Lead {l.id}</span>
          <span className="truncate text-[13px] text-muted-foreground">
            {l.tipo === 'negociacao_direta' ? 'Negociação direta' : 'Demonstração'} · agendada por {l.sdr === 'IA' ? 'IA' : l.sdr}
          </span>
        </div>
        <NameAvatar nome={l.vendedor} size={34} />
      </div>
      <OrigemP canal={l.canal} />
      <div className="flex flex-wrap gap-1">
        {etapa && <Etiqueta cor={etapa.cor}>{etapa.texto}</Etiqueta>}
        {l.realizada === 'pendente' && l.resultado === 'aberto' && <Etiqueta cor={COR_ETIQUETA.laranja}>Sem desfecho</Etiqueta>}
        {extra && <Etiqueta cor={l.resultado === 'perdido' ? COR_ETIQUETA.cinza : COR_ETIQUETA.azul}>{extra}</Etiqueta>}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="truncate text-[13px] text-muted-foreground">Resp: {l.vendedor}</span>
        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground" title="Data do agendamento na planilha">
          <CalendarDays className="size-4 text-muted-foreground" />
          {fmtDia(l.data)}
        </span>
      </div>
    </motion.button>
  );
}

export function KanbanP() {
  const { mes, leads, abrirLead } = usePlanilha();
  const [busca, setBusca] = useState('');
  const [vendedor, setVendedor] = useState('todos');
  const [origem, setOrigem] = useState('todas');
  const [saidas, setSaidas] = useState(false);
  const [resultado, setResultado] = useState<FiltroResultado>('todos');
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  const vendedores = useMemo(() => [...new Set(leads.map((l) => l.vendedor))].sort((a, b) => a.localeCompare(b)), [leads]);
  const origens = useMemo(() => [...new Set(leads.map((l) => l.canal))].sort((a, b) => a.localeCompare(b)), [leads]);

  const filtrados = useMemo(() => {
    const termo = busca.trim();
    return leads.filter((l) => (vendedor === 'todos' || l.vendedor === vendedor) && (origem === 'todas' || l.canal === origem) && (!termo || l.id.includes(termo)));
  }, [leads, busca, vendedor, origem]);
  const contaResultado = (r: Resultado) => filtrados.filter((l) => l.resultado === r).length;

  const porEtapa = useMemo(() => {
    const m = new Map<Etapa, LeadP[]>();
    for (const l of filtrados) {
      if (resultado !== 'todos' && l.resultado !== resultado) continue;
      (m.get(l.coluna) ?? m.set(l.coluna, []).get(l.coluna)!).push(l);
    }
    for (const lista of m.values()) lista.sort((a, b) => (a.realizada === 'pendente' ? -1 : 0) - (b.realizada === 'pendente' ? -1 : 0) || b.t - a.t);
    return m;
  }, [filtrados, resultado]);
  const colunas = resultado === 'todos' ? ETAPAS_CRM : COLUNAS_DO_RESULTADO[resultado];

  const abertos = leads.filter((l) => l.resultado === 'aberto');
  const semDesfecho = abertos.filter((l) => l.realizada === 'pendente').length;

  return (
    <Page className="gap-5">
      <Intro
        tag={`Kanban · leads agendados em ${nomeCurto(mes)}`}
        title={
          <>
            <Hl>{abertos.length} leads</Hl> seguem com os vendedores. {semDesfecho} {semDesfecho === 1 ? 'está' : 'estão'} com a reunião sem desfecho.
          </>
        }
        aside="Mesmas etapas do CRM, montadas a partir da planilha: reunião pendente fica em Demonstração agendada, falta em Reagendar e reunião realizada em Negociação. Clique no cartão para ver a ficha."
      />

      <Reveal className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar ID do lead" inputMode="numeric" className="h-9 rounded-full bg-card pl-9" aria-label="Buscar ID do lead" />
        </div>
        <Select value={vendedor} onValueChange={setVendedor}>
          <SelectTrigger className="h-9 w-48 rounded-full bg-card" aria-label="Vendedor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os vendedores</SelectItem>
            {vendedores.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
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
            {origens.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {resultado === 'todos' && (
          <Alternar ativo={saidas} onClick={() => setSaidas((x) => !x)}>
            Mostrar perdidos
          </Alternar>
        )}
      </Reveal>

      <Reveal>
        <Pilulas
          id="resultado"
          label="Resultado do lead"
          value={resultado}
          onChange={setResultado}
          options={[
            ['todos', <>Todos <span className="num opacity-60">{filtrados.length}</span></>],
            ['aberto', <>Em aberto <span className="num opacity-60">{contaResultado('aberto')}</span></>],
            ['ganho', <>Ganhos <span className="num opacity-60">{contaResultado('ganho')}</span></>],
            ['perdido', <>Perdidos <span className="num opacity-60">{contaResultado('perdido')}</span></>],
          ]}
        />
      </Reveal>

      <Reveal>
        <LayoutGroup id="kanban-p">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
            {colunas.map((etapa) => {
              const ehPre = ETAPAS_PRE_VENDAS.includes(etapa);
              const ehSaida = ETAPAS_PERDA.includes(etapa);
              const lista = porEtapa.get(etapa) ?? [];
              const recolhida = ehPre || (ehSaida && !saidas && resultado === 'todos');
              const subtitulo = ehSaida ? 'perdido' : etapa === 'cadastrado' ? 'ganho (Ganho ou Cadastrado)' : null;
              const mostrar = expandidas[etapa] ? Infinity : LIMITE;
              return (
                <motion.section
                  key={etapa}
                  layout
                  transition={SPRING}
                  aria-label={`${ETAPA_LABEL[etapa]}: ${ehPre ? 'fora da planilha' : `${lista.length} leads`}`}
                  className={cn('flex shrink-0 flex-col rounded-[18px] bg-ink/[0.045]', recolhida ? 'w-11' : 'w-[284px]')}
                >
                  {recolhida ? (
                    <button
                      type="button"
                      disabled={ehPre}
                      onClick={() => setSaidas(true)}
                      className="flex h-full min-h-[360px] flex-col items-center gap-3 py-3 text-muted-foreground transition-colors enabled:hover:text-foreground disabled:cursor-default disabled:opacity-60"
                      title={ehPre ? `${ETAPA_LABEL[etapa]} · a planilha só lista os leads que já viraram reunião` : `${ETAPA_LABEL[etapa]} · ${lista.length}`}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: ETAPA_COR[etapa] }} />
                      <span className="num text-xs">{ehPre ? '—' : lista.length}</span>
                      <span className="text-[13px] [writing-mode:vertical-rl]">{ETAPA_LABEL[etapa]}</span>
                      {!ehPre && <ChevronsLeftRight className="mt-auto size-3.5" />}
                    </button>
                  ) : (
                    <>
                      <header className="flex flex-col items-center gap-0.5 px-3 pt-3 pb-2">
                        <div className="flex items-center gap-2 text-[14px]">
                          <span className="size-3 rounded-full" style={{ background: ETAPA_COR[etapa] }} />
                          <span className="font-medium">{ETAPA_LABEL[etapa]}</span>
                          <span className="num text-muted-foreground">{lista.length}</span>
                        </div>
                        {subtitulo && <span className="text-xs text-muted-foreground">{subtitulo}</span>}
                      </header>
                      <div className="flex max-h-[calc(100vh-150px)] min-h-[360px] flex-col gap-2.5 overflow-y-auto px-2.5 pb-3">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {lista.slice(0, mostrar).map((l, i) => (
                            <CartaoP key={l.uid} l={l} onOpen={() => abrirLead(l.uid)} delay={Math.min(i, 8) * 0.03} />
                          ))}
                        </AnimatePresence>
                        {lista.length === 0 && <p className="px-2 py-8 text-center text-sm text-muted-foreground">Nenhum lead</p>}
                        {lista.length > mostrar && (
                          <button
                            type="button"
                            onClick={() => setExpandidas((x) => ({ ...x, [etapa]: true }))}
                            className="rounded-full py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                          >
                            Mostrar mais {lista.length - LIMITE}
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

function Alternar({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
        ativo ? 'border-ink bg-ink text-ink-foreground' : 'border-ink/15 bg-card hover:border-ink/40',
      )}
    >
      <span className={cn('size-2 rounded-full', ativo ? 'bg-primary' : 'bg-ink/20')} />
      {children}
    </button>
  );
}
