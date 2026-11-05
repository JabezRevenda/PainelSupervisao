import {
  CalendarDays,
  Funnel,
  Gauge,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  SquareKanban,
  Sun,
  Target,
  TrendingDown,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { LayoutGroup, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SPRING } from '@/components/motion';
import { fila } from '@/data/metrics/indicadores';
import { DAY, fmtTime, startOfDay } from '@/data/time';
import { cn } from '@/lib/utils';
import { usePainel, useRelogio } from '@/state/painel';
import { LeadSheet } from './LeadSheet';

interface Item {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'fila' | 'demos';
}

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Acompanhar',
    itens: [
      { to: '/', label: 'Visão geral', icon: LayoutDashboard },
      { to: '/kanban', label: 'Kanban de hoje', icon: SquareKanban },
      { to: '/fila', label: 'Fila de risco', icon: TriangleAlert, badge: 'fila' },
      { to: '/agenda', label: 'Agenda de demos', icon: CalendarDays, badge: 'demos' },
      { to: '/performance', label: 'Performance', icon: Users },
    ],
  },
  {
    titulo: 'Analisar',
    itens: [
      { to: '/funil', label: 'Funil e conversão', icon: Funnel },
      { to: '/marketing', label: 'Marketing e origem', icon: Target },
      { to: '/perdas', label: 'Perdas', icon: TrendingDown },
    ],
  },
  {
    titulo: 'Planejar',
    itens: [
      { to: '/metas', label: 'Metas e OKRs', icon: Gauge },
      { to: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal },
    ],
  },
];

export const TITULOS: Record<string, string> = Object.fromEntries(GRUPOS.flatMap((g) => g.itens.map((i) => [i.to, i.label])));

function Logo() {
  const { config } = usePainel();
  return (
    <img
      src={config.tema === 'dark' ? './brand/revenda-mais-branco.png' : './brand/revenda-mais.png'}
      alt="Revenda Mais"
      className="h-[26px] w-auto"
    />
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const { views, agora, config } = usePainel();
  const { pathname } = useLocation();
  const contagem = useMemo(() => {
    const itens = fila(views, agora, config.params).filter((x) => x.alertas[0].gravidade <= 5);
    const hoje = startOfDay(agora);
    let demos = 0;
    for (const v of views) for (const d of v.demos) if (d.agendadaPara >= hoje && d.agendadaPara < hoje + DAY) demos++;
    return { fila: itens.length, demos };
  }, [views, agora, config.params]);

  return (
    <LayoutGroup id="nav">
      <nav className="flex flex-col gap-5" aria-label="Menu do painel">
        {GRUPOS.map((g) => (
          <div key={g.titulo} className="flex flex-col gap-0.5">
            <span className="px-2 pb-1 text-xs font-medium text-muted-foreground">{g.titulo}</span>
            {g.itens.map((i) => {
              const ativo = i.to === '/' ? pathname === '/' : pathname.startsWith(i.to);
              const Icone = i.icon;
              const n = i.badge === 'fila' ? contagem.fila : i.badge === 'demos' ? contagem.demos : null;
              return (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.to === '/'}
                  onClick={onNavigate}
                  className={cn(
                    'relative flex h-9 items-center gap-2.5 rounded-md px-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    ativo ? 'font-medium text-sidebar-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {ativo && <motion.span layoutId="nav-ativo" transition={SPRING} className="absolute inset-0 rounded-md bg-sidebar-accent" />}
                  {ativo && <motion.span layoutId="nav-barra" transition={SPRING} className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary" />}
                  <Icone className={cn('relative size-4', ativo && 'text-primary')} />
                  <span className="relative">{i.label}</span>
                  {n !== null && n > 0 && (
                    <span className={cn('num relative ml-auto text-xs', i.badge === 'fila' ? 'font-medium text-primary' : 'text-muted-foreground')}>{n}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </LayoutGroup>
  );
}

function Sidebar() {
  const { vendedores } = usePainel();
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-6 border-r bg-sidebar px-3 py-5 lg:flex">
      <div className="flex flex-col gap-1.5 px-2">
        <Logo />
        <span className="text-xs text-muted-foreground">Supervisão comercial</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Nav />
      </div>
      <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">SC</span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">Supervisão</span>
          <span className="truncate text-xs text-muted-foreground">Inside Sales · {vendedores.length} vendedores</span>
        </div>
      </div>
    </aside>
  );
}

function Header() {
  const { config, setConfig, atualizar, fonte, atualizadoEm } = usePainel();
  useRelogio(15_000);
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const titulo = TITULOS[pathname] ?? 'Painel';
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu" onClick={() => setMenu(true)}>
        <Menu />
      </Button>
      <nav aria-label="Você está em" className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="hidden text-muted-foreground sm:inline">Revenda Mais</span>
        <span className="hidden text-muted-foreground/60 sm:inline">/</span>
        <span className="truncate font-medium">{titulo}</span>
      </nav>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {fonte.simulada && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden cursor-default text-xs text-muted-foreground underline decoration-dotted underline-offset-4 md:inline">Dados simulados</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">Gerados pelo simulador na hora atual. Os números de cada vendedor não são reais.</TooltipContent>
          </Tooltip>
        )}
        {atualizadoEm && <span className="hidden text-xs text-muted-foreground sm:inline">· Atualizado às {fmtTime(atualizadoEm)}</span>}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Atualizar agora" onClick={atualizar}>
              <RefreshCw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Atualizar agora</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={config.tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              onClick={() => setConfig((c) => ({ ...c, tema: c.tema === 'dark' ? 'light' : 'dark' }))}
            >
              {config.tema === 'dark' ? <Sun /> : <Moon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{config.tema === 'dark' ? 'Tema claro' : 'Tema escuro'}</TooltipContent>
        </Tooltip>
      </div>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[280px] gap-6 px-3 py-5">
          <SheetHeader className="p-0 px-2">
            <SheetTitle asChild>
              <div>
                <Logo />
              </div>
            </SheetTitle>
            <SheetDescription>Supervisão comercial</SheetDescription>
          </SheetHeader>
          <Nav onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}

function Carregando() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function AppShell() {
  const { ds, erro } = usePainel();
  const { pathname } = useLocation();
  const largura = pathname.startsWith('/kanban') ? 'max-w-none' : 'max-w-[1280px]';
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className={cn('mx-auto w-full px-4 pt-6 pb-16 sm:px-6', largura)}>
          {erro && (
            <div role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Não foi possível ler os dados: {erro}
            </div>
          )}
          <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {ds ? <Outlet /> : <Carregando />}
          </motion.div>
        </main>
      </div>
      {ds && <LeadSheet />}
    </div>
  );
}
