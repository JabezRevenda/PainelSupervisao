import { ArrowUpRight, Menu, Moon, Settings, Sun } from 'lucide-react';
import { LayoutGroup, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fila, urgente } from '@/data/metrics/indicadores';
import { fmtTime } from '@/data/time';
import { cn } from '@/lib/utils';
import { usePainel, useRelogio } from '@/state/painel';
import { LeadSheet } from './LeadSheet';

/** Seis destinos no menu (Lei de Miller). A Fila fica no botão de ação, à direita. */
const ITENS: { to: string; label: string; match: (p: string) => boolean }[] = [
  { to: '/', label: 'Hoje', match: (p) => p === '/' },
  { to: '/kanban', label: 'Kanban', match: (p) => p.startsWith('/kanban') },
  { to: '/agenda', label: 'Agenda', match: (p) => p.startsWith('/agenda') },
  { to: '/time', label: 'Time', match: (p) => p.startsWith('/time') },
  { to: '/analises', label: 'Análises', match: (p) => p.startsWith('/analises') },
  { to: '/metas', label: 'Metas', match: (p) => p.startsWith('/metas') },
];

function useFilaAgora() {
  const { views, agora, config } = usePainel();
  return useMemo(() => fila(views, agora, config.params).filter(urgente).length, [views, agora, config.params]);
}

function LogoImg() {
  const { config } = usePainel();
  return <img src={config.tema === 'dark' ? './brand/revenda-mais-branco.png' : './brand/revenda-mais.png'} alt="Revenda Mais" className="h-[22px] w-auto" />;
}

function Logo() {
  return (
    <Link to="/" aria-label="Revenda Mais · início" className="shrink-0">
      <LogoImg />
    </Link>
  );
}

/** Modo escuro opcional: fica salvo no navegador de quem escolheu. */
function BotaoTema() {
  const { config, setConfig } = usePainel();
  const escuro = config.tema === 'dark';
  return (
    <button
      type="button"
      onClick={() => setConfig((c) => ({ ...c, tema: escuro ? 'light' : 'dark' }))}
      aria-label={escuro ? 'Usar modo claro' : 'Usar modo escuro'}
      title={escuro ? 'Modo claro' : 'Modo escuro'}
      className="flex size-9 items-center justify-center rounded-full border border-ink/15 bg-card transition-colors hover:border-ink/40"
    >
      <motion.span key={escuro ? 'sol' : 'lua'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.35 }} className="flex">
        {escuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </motion.span>
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

function Topo() {
  const { atualizar, atualizadoEm, fonte } = usePainel();
  useRelogio(15_000);
  const n = useFilaAgora();
  const [menu, setMenu] = useState(false);
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 sm:px-6">
        <button type="button" aria-label="Abrir menu" onClick={() => setMenu(true)} className="flex size-9 items-center justify-center rounded-full border border-ink/15 bg-card lg:hidden">
          <Menu className="size-4" />
        </button>
        <Logo />
        <div className="hidden flex-1 justify-center lg:flex">
          <NavPilulas />
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {atualizadoEm && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onClick={atualizar} className="hidden text-xs text-muted-foreground transition-colors hover:text-foreground xl:inline">
                  Atualizado às {fmtTime(atualizadoEm)}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                Atualiza sozinho a cada minuto. Clique para atualizar agora.{fonte.simulada ? ' Dados simulados: os números por vendedor não são reais.' : ''}
              </TooltipContent>
            </Tooltip>
          )}
          <BotaoTema />
          <Link to="/configuracoes" aria-label="Configurações" title="Configurações" className="flex size-9 items-center justify-center rounded-full border border-ink/15 bg-card transition-colors hover:border-ink/40">
            <Settings className="size-4" />
          </Link>
          <Link to="/fila" className="group/cta inline-flex h-9 items-center gap-2.5 rounded-full bg-ink pr-1 pl-4 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink/85">
            <span className="hidden sm:inline">Fila de risco</span>
            <span className="sm:hidden">Fila</span>
            <span className="num rounded-full bg-primary px-2 py-0.5 text-xs text-white">{n}</span>
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
            <SheetDescription>Supervisão do Inside Sales</SheetDescription>
          </SheetHeader>
          <NavPilulas vertical onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}

function Carregando() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-6 w-40 rounded-full" />
      <Skeleton className="h-28 w-3/4 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-52 rounded-[22px]" />
        ))}
      </div>
    </div>
  );
}

export function AppShell() {
  const { ds, erro, fonte } = usePainel();
  const { pathname } = useLocation();
  const largo = pathname.startsWith('/kanban');
  return (
    <div className="min-h-screen bg-background">
      <Topo />
      <main className={cn('mx-auto w-full px-4 pt-6 pb-16 sm:px-6', largo ? 'max-w-none' : 'max-w-[1320px]')}>
        {erro && (
          <div role="alert" className="mb-6 rounded-2xl border border-primary/30 bg-brand-soft px-4 py-3 text-sm text-primary">
            Não foi possível ler os dados: {erro}
          </div>
        )}
        <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          {ds ? <Outlet /> : <Carregando />}
        </motion.div>
      </main>
      <footer className="mx-auto max-w-[1320px] px-4 pb-8 text-xs text-muted-foreground sm:px-6">
        Revenda Mais · Supervisão do Inside Sales{fonte.simulada ? ' · Dados simulados: os números por vendedor não são reais.' : ''}
      </footer>
      {ds && <LeadSheet />}
    </div>
  );
}
