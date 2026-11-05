import { useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { fila } from '../data/metrics/indicadores';
import { DAY, fmtLongDate, fmtTime, startOfDay } from '../data/time';
import { usePainel, useRelogio } from '../state/painel';
import { Icon, type IconName } from '../ui/icons';
import { LeadDrawer } from './LeadDrawer';

interface Item {
  to: string;
  label: string;
  icon: IconName;
  badge?: 'fila' | 'demos';
}

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Acompanhar',
    itens: [
      { to: '/', label: 'Visão geral', icon: 'visao' },
      { to: '/fila', label: 'Fila de risco', icon: 'fila', badge: 'fila' },
      { to: '/agenda', label: 'Agenda de demos', icon: 'agenda', badge: 'demos' },
      { to: '/performance', label: 'Performance', icon: 'equipe' },
    ],
  },
  {
    titulo: 'Analisar',
    itens: [
      { to: '/funil', label: 'Funil e conversão', icon: 'funil' },
      { to: '/marketing', label: 'Marketing e origem', icon: 'alvo' },
      { to: '/perdas', label: 'Perdas', icon: 'queda' },
    ],
  },
  {
    titulo: 'Planejar',
    itens: [
      { to: '/metas', label: 'Metas e OKRs', icon: 'meta' },
      { to: '/configuracoes', label: 'Configurações', icon: 'config' },
    ],
  },
];

export const TITULOS: Record<string, string> = Object.fromEntries(GRUPOS.flatMap((g) => g.itens.map((i) => [i.to, i.label])));

function Sidebar() {
  const { views, agora, config, atualizadoEm, vendedores, fonte } = usePainel();
  const tick = useRelogio(5000);
  const contagem = useMemo(() => {
    const itens = fila(views, agora, config.params).filter((x) => x.alertas[0].gravidade <= 5);
    const hoje = startOfDay(agora);
    let demos = 0;
    for (const v of views) for (const d of v.demos) if (d.agendadaPara >= hoje && d.agendadaPara < hoje + DAY) demos++;
    return { fila: itens.length, demos };
  }, [views, agora, config.params]);
  const seg = atualizadoEm ? Math.max(0, Math.round((tick - atualizadoEm) / 1000)) : null;
  const logo = config.tema === 'dark' ? './brand/revenda-mais-branco.png' : './brand/revenda-mais.png';

  return (
    <aside className="sidebar" aria-label="Menu do painel">
      <div className="brand">
        <img src={logo} alt="Revenda Mais" />
        <small>Supervisão comercial · Inside Sales</small>
      </div>
      <div className="sync">
        <span className="live-dot" />
        <span>
          {fonte.simulada ? 'Simulação ao vivo' : 'Réplica sincronizada'}
          {seg !== null ? ` · há ${seg < 60 ? `${seg} s` : `${Math.floor(seg / 60)} min`}` : ''}
        </span>
      </div>
      <nav className="nav-groups">
        {GRUPOS.map((g) => (
          <div className="nav-group" key={g.titulo}>
            <span className="nav-title">{g.titulo}</span>
            {g.itens.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Icon name={i.icon} />
                <span>{i.label}</span>
                {i.badge === 'fila' && contagem.fila > 0 && <span className="nav-badge hot">{contagem.fila}</span>}
                {i.badge === 'demos' && <span className="nav-badge">{contagem.demos}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="user-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="avatar" style={{ width: 38, height: 38, flexBasis: 38, borderColor: 'var(--rm-500)', boxShadow: '0 0 16px rgba(230,35,78,.35)' }}>
            SC
          </span>
          <div className="stack gap-4">
            <strong style={{ fontSize: 14 }}>Supervisão comercial</strong>
            <span className="faint" style={{ fontSize: 12 }}>Acesso restrito</span>
          </div>
        </div>
        <span className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Inside Sales · {vendedores.length} vendedores
        </span>
      </div>
    </aside>
  );
}

function Topbar() {
  const { config, setConfig, atualizar, fonte } = usePainel();
  const agora = useRelogio(15_000);
  const { pathname } = useLocation();
  const titulo = TITULOS[pathname] ?? 'Painel';
  return (
    <header className="topbar">
      <div className="crumbs">
        <span>Revenda Mais</span>
        <span aria-hidden="true" className="faint">
          /
        </span>
        <strong>{titulo}</strong>
      </div>
      <div className="topbar-actions">
        <span className="chip chip--live">
          <span className="live-dot" />
          Ao vivo · {fmtLongDate(agora)} · {fmtTime(agora)}
        </span>
        {fonte.simulada && (
          <span className="chip chip--sim" title="Dados gerados pelo simulador. Não representam o desempenho real dos vendedores.">
            Dados simulados
          </span>
        )}
        <button type="button" className="icon-btn" aria-label="Atualizar agora" title="Atualizar agora" onClick={atualizar}>
          <Icon name="atualizar" size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={config.tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
          title={config.tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
          onClick={() => setConfig((c) => ({ ...c, tema: c.tema === 'dark' ? 'light' : 'dark' }))}
        >
          <Icon name={config.tema === 'dark' ? 'sol' : 'lua'} size={16} />
        </button>
      </div>
    </header>
  );
}

export function Layout() {
  const { ds, erro } = usePainel();
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <div className="container">
          <Topbar />
          {erro && <div className="card" role="alert">Não foi possível ler os dados: {erro}</div>}
          {ds ? <Outlet /> : <div className="loading">Carregando dados do CRM…</div>}
        </div>
      </main>
      {ds && <LeadDrawer />}
    </div>
  );
}
