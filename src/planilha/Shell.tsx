import { ArrowUpRight, Menu, Moon, Sun } from 'lucide-react';
import { LayoutGroup, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Etiqueta, etiquetaDaEtapa } from '@/components/crm';
import { NameAvatar } from '@/components/kit';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ETAPA_COR, ETAPA_LABEL } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePlanilha } from './estado';
import { corCanal, fmtDia, type LeadP, REALIZADA_INFO } from './modelo';

const ITENS: { to: string; label: string; match: (p: string) => boolean }[] = [
  { to: '/', label: 'Hoje', match: (p) => p === '/' },
  { to: '/kanban', label: 'Kanban', match: (p) => p.startsWith('/kanban') },
  { to: '/reunioes', label: 'Reuniões', match: (p) => p.startsWith('/reunioes') },
  { to: '/time', label: 'Time', match: (p) => p.startsWith('/time') },
  { to: '/funil', label: 'Funil', match: (p) => p.startsWith('/funil') },
  { to: '/metas', label: 'Metas', match: (p) => p.startsWith('/metas') },
];

/** Pendências do mês selecionado: reuniões sem desfecho e faltas sem nova data (leads ainda em aberto). */
export function usePendencias(): LeadP[] {
  const { leads } = usePlanilha();
  return useMemo(
    () => leads.filter((l) => l.resultado === 'aberto' && l.realizada !== 'sim').sort((a, b) => (a.realizada === b.realizada ? a.t - b.t : a.realizada === 'pendente' ? -1 : 1)),
    [leads],
  );
}

function LogoImg() {
  const { tema } = usePlanilha();
  return <img src={tema === 'dark' ? './brand/revenda-mais-branco.png' : './brand/revenda-mais.png'} alt="Revenda Mais" className="h-[22px] w-auto" />;
}

function BotaoTema() {
  const { tema, setTema } = usePlanilha();
  const escuro = tema === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTema(escuro ? 'light' : 'dark')}
      aria-label={escuro ? 'Usar modo claro' : 'Usar modo escuro'}
      title={escuro ? 'Modo claro' : 'Modo escuro'}
      className="flex size-9 items-center justify-center rounded-full border border-ink/15 bg-card transition-colors hover:border-ink/40"
    >
      {escuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function NavPilulas({ vertical = false, onNavigate }: { vertical?: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <LayoutGroup id={vertical ? 'nav-v' : 'nav-h'}>
      <nav aria-label="Menu do painel" className={cn('flex gap-1.5', vertical && 'flex-col items-stretch')}>
        {ITENS.map((i) => {
          const ativo = i.match(pathname);
          return (
            <NavLink
              key={i.to}
              to={i.to}
              onClick={onNavigate}
              className={cn(
                'relative inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                ativo ? 'border-ink text-ink-foreground' : 'border-ink/15 bg-card text-foreground hover:border-ink/40',
              )}
            >
              {ativo && <motion.span layoutId="nav-ativo" transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="absolute inset-[-1px] rounded-full bg-ink" />}
              <span className="relative">{i.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}

/** Mês de referência de todas as telas. */
export function SeletorMes({ className }: { className?: string }) {
  const { meses, mes, setMes } = usePlanilha();
  return (
    <Select value={mes.chave} onValueChange={setMes}>
      <SelectTrigger className={cn('h-9 w-40 rounded-full bg-card', className)} aria-label="Mês">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {[...meses].reverse().map((m) => (
          <SelectItem key={m.chave} value={m.chave}>
            {m.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Topo() {
  const { dados } = usePlanilha();
  const pend = usePendencias();
  const [menu, setMenu] = useState(false);
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 sm:px-6">
        <button type="button" aria-label="Abrir menu" onClick={() => setMenu(true)} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-card lg:hidden">
          <Menu className="size-4" />
        </button>
        <Link to="/" aria-label="Revenda Mais · início" className="shrink-0 max-sm:hidden">
          <LogoImg />
        </Link>
        <div className="hidden flex-1 justify-center lg:flex">
          <NavPilulas />
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {dados.atualizadoAte && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="hidden text-xs text-muted-foreground 2xl:inline">Planilha até {fmtDia(dados.atualizadoAte)}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">Dados de “{dados.arquivo}”. Para atualizar, importe a planilha de novo.</TooltipContent>
            </Tooltip>
          )}
          <SeletorMes className="max-sm:w-[132px]" />
          <BotaoTema />
          <Link to="/pendencias" className="group/cta inline-flex h-9 shrink-0 items-center gap-2.5 rounded-full bg-ink pr-1 pl-4 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink/85">
            <span className="max-sm:hidden">Pendências</span>
            <span className="num rounded-full bg-primary px-2 py-0.5 text-xs text-white">{pend.length}</span>
            <span className="flex size-7 items-center justify-center rounded-full bg-ink-foreground text-ink">
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover/cta:rotate-45" />
            </span>
          </Link>
        </div>
      </div>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[280px] gap-6 bg-background px-4 py-5">
          <SheetHeader className="p-0">
            <SheetTitle asChild>
              <div>
                <LogoImg />
              </div>
            </SheetTitle>
            <SheetDescription>Supervisão do Inside Sales · dados da planilha</SheetDescription>
          </SheetHeader>
          <NavPilulas vertical onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}

export function ShellPlanilha() {
  const { dados } = usePlanilha();
  const { pathname } = useLocation();
  const largo = pathname.startsWith('/kanban');
  return (
    <div className="min-h-screen bg-background">
      <Topo />
      <main className={cn('mx-auto w-full px-4 pt-6 pb-16 sm:px-6', largo ? 'max-w-none' : 'max-w-[1320px]')}>
        <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <Outlet />
        </motion.div>
      </main>
      <footer className="mx-auto max-w-[1320px] px-4 pb-8 text-xs text-muted-foreground sm:px-6">
        Revenda Mais · Supervisão do Inside Sales · Dados da planilha de follow-up{dados.atualizadoAte ? `, registros até ${fmtDia(dados.atualizadoAte)}` : ''}.
      </footer>
      <FichaLead />
    </div>
  );
}

/** Ficha do lead: o que a planilha sabe sobre ele, em todos os meses em que aparece. */
function FichaLead() {
  const { todos, leadAberto, abrirLead } = usePlanilha();
  const l = useMemo(() => todos.find((x) => x.uid === leadAberto) ?? null, [todos, leadAberto]);
  const outros = useMemo(() => (l ? todos.filter((x) => x.id === l.id && x.uid !== l.uid) : []), [todos, l]);
  const etapa = l ? etiquetaDaEtapa(l.coluna) : null;
  return (
    <Sheet open={!!l} onOpenChange={(o) => !o && abrirLead(null)}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {l && (
          <>
            <SheetHeader className="gap-3 border-b p-5">
              <div className="flex items-start gap-3 pr-8">
                <NameAvatar nome={l.vendedor} size={40} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <SheetTitle className="text-base leading-snug">Lead {l.id}</SheetTitle>
                  <SheetDescription>
                    {l.vendedor} · {ETAPA_LABEL[l.coluna]}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <span className="size-2.5 rounded-full" style={{ background: corCanal(l.canal) }} />
                  {l.canal}
                </span>
                <span className="text-muted-foreground/50">·</span>
                {etapa && <Etiqueta cor={etapa.cor}>{etapa.texto}</Etiqueta>}
              </div>
            </SheetHeader>
            <div className="grid grid-cols-3 divide-x border-b text-sm">
              <div className="flex flex-col gap-1 p-4">
                <span className="text-xs text-muted-foreground">Agendada em</span>
                <span className="num font-medium">{fmtDia(l.data)}</span>
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="text-xs text-muted-foreground">Reunião</span>
                <span className={cn('font-medium', l.realizada !== 'sim' && 'text-primary')}>{REALIZADA_INFO[l.realizada].rotulo}</span>
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className="font-medium">{l.status}</span>
              </div>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-b p-5 text-sm">
              <dt className="text-muted-foreground">Vendedor</dt>
              <dd className="text-right">{l.vendedor}</dd>
              <dt className="text-muted-foreground">Agendado por</dt>
              <dd className="text-right">{l.sdr === 'IA' ? 'IA (SDR)' : l.sdr}</dd>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd className="text-right">{l.tipo === 'negociacao_direta' ? 'Negociação direta' : 'Demonstração'}</dd>
              <dt className="text-muted-foreground">Origem</dt>
              <dd className="text-right">{l.canal}</dd>
              <dt className="text-muted-foreground">Etapa no Kanban</dt>
              <dd className="flex items-center justify-end gap-2 text-right">
                <span className="size-2 rounded-full" style={{ background: ETAPA_COR[l.coluna] }} />
                {ETAPA_LABEL[l.coluna]}
              </dd>
            </dl>
            <div className="flex flex-col gap-2 p-5 text-sm">
              <h3 className="font-medium">Outras vezes na planilha</h3>
              {outros.length === 0 ? (
                <p className="text-muted-foreground">Este ID aparece uma vez só.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {outros.map((o) => (
                    <li key={o.uid}>
                      <button type="button" onClick={() => abrirLead(o.uid)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted">
                        <span>
                          {fmtDia(o.data)} · {o.vendedor}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {REALIZADA_INFO[o.realizada].rotulo} · {o.status}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
                A planilha não registra os contatos com o lead. A linha do tempo completa aparece quando o painel ler o CRM.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
